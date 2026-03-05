"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveEventToast } from "@/app/components/ui/live-event-toast";
import type { FixtureListItem } from "@/app/types/fixture";

type FixtureUpdate = {
  type: "fixture.updated";
  providerFixtureId: number;
  status: string;
  minute: number;
  scoreHome: number;
  scoreAway: number;
  updatedAt: string;
};

type FixtureEvent = {
  type: "fixture.event";
  providerFixtureId: number;
  eventId: string;
  minute: number;
  kind: "GOAL" | "OTHER";
  eventType?: string;
  playerName?: string | null;
};

function resolveWsUrl(): string {
  const configured = process.env.NEXT_PUBLIC_REALTIME_WS_URL;
  if (configured) return configured;

  if (typeof window === "undefined") {
    return "ws://localhost:4000";
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:4000`;
}

function resolveToastType(
  event: FixtureEvent,
): "goal" | "red" | "yellow" | "sub" | "other" {
  if (event.kind === "GOAL") return "goal";
  if (!event.eventType) return "other";
  if (event.eventType.includes("RED")) return "red";
  if (event.eventType.includes("YELLOW")) return "yellow";
  if (event.eventType.includes("SUB")) return "sub";
  return "other";
}

export function useFixturesLive(initialFixtures: FixtureListItem[]) {
  const [fixtures, setFixtures] = useState(initialFixtures);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const fixturesRef = useRef<FixtureListItem[]>(initialFixtures);
  const { addToast } = useLiveEventToast();

  useEffect(() => {
    fixturesRef.current = fixtures;
  }, [fixtures]);

  useEffect(() => {
    setFixtures(initialFixtures);
    fixturesRef.current = initialFixtures;
  }, [initialFixtures]);

  useEffect(() => {
    let cancelled = false;

    async function refetchFixtures() {
      try {
        const response = await fetch("/api/fixtures", { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as FixtureListItem[];
        if (cancelled) return;
        fixturesRef.current = next;
        setFixtures(next);
      } catch {
        // Ignore transient network errors and continue with socket reconnect.
      }
    }

    function subscribeAll(socket: WebSocket) {
      for (const fixture of fixturesRef.current) {
        socket.send(
          JSON.stringify({
            type: "subscribe",
            fixtureId: fixture.providerFixtureId,
          }),
        );
      }
    }

    function scheduleReconnect() {
      reconnectAttempts.current += 1;
      const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 10000);
      reconnectTimeout.current = setTimeout(connect, delay);
    }

    function connect() {
      if (cancelled || fixturesRef.current.length === 0) return;

      const socket = new WebSocket(resolveWsUrl());
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempts.current = 0;
        subscribeAll(socket);
        void refetchFixtures();
      };

      socket.onmessage = (event) => {
        let parsed: FixtureUpdate | FixtureEvent;
        try {
          parsed = JSON.parse(event.data) as FixtureUpdate | FixtureEvent;
        } catch {
          return;
        }

        if (parsed.type === "fixture.updated") {
          setFixtures((prev) =>
            prev.map((fixture) =>
              fixture.providerFixtureId === parsed.providerFixtureId
                ? {
                    ...fixture,
                    status: parsed.status,
                    minute: parsed.minute,
                    scoreHome: parsed.scoreHome,
                    scoreAway: parsed.scoreAway,
                    isLive:
                      parsed.status === "LIVE" || parsed.status === "HALF_TIME",
                  }
                : fixture,
            ),
          );
        }

        if (parsed.type === "fixture.event") {
          addToast({
            type: resolveToastType(parsed),
            text:
              parsed.kind === "GOAL"
                ? `Goal - ${parsed.playerName ?? "Unknown"}`
                : `${(parsed.eventType ?? "Event").replaceAll("_", " ")} - ${parsed.playerName ?? "Unknown"}`,
            minute: parsed.minute,
          });
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        scheduleReconnect();
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();
    const refreshInterval = setInterval(() => {
      void refetchFixtures();
    }, 60_000);
    void refetchFixtures();

    return () => {
      cancelled = true;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      clearInterval(refreshInterval);
      socketRef.current?.close();
    };
  }, [addToast]);

  useEffect(() => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;
    for (const fixture of initialFixtures) {
      socketRef.current.send(
        JSON.stringify({
          type: "subscribe",
          fixtureId: fixture.providerFixtureId,
        }),
      );
    }
  }, [initialFixtures]);

  return fixtures;
}

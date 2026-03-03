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

function resolveToastType(event: FixtureEvent): "goal" | "red" | "yellow" | "sub" | "other" {
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
  const { addToast } = useLiveEventToast();

  useEffect(() => {
    setFixtures(initialFixtures);
  }, [initialFixtures]);

  useEffect(() => {
    if (initialFixtures.length === 0) return;

    const socket = new WebSocket(resolveWsUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      for (const fixture of initialFixtures) {
        socket.send(
          JSON.stringify({
            type: "subscribe",
            fixtureId: fixture.providerFixtureId,
          }),
        );
      }
    };

    socket.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as FixtureUpdate | FixtureEvent;

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
                  isLive: parsed.status === "LIVE",
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
              ? `Goal · ${parsed.playerName ?? "Unknown"}`
              : `${(parsed.eventType ?? "Event").replaceAll("_", " ")} · ${parsed.playerName ?? "Unknown"}`,
          minute: parsed.minute,
        });
      }
    };

    return () => {
      socket.close();
    };
  }, [addToast, initialFixtures]);

  return fixtures;
}

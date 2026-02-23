"use client";

import { useEffect, useRef, useState } from "react";

export type FixtureUpdate = {
  type: "fixture.updated";
  providerFixtureId: number;
  status: string;
  minute: number | null;
  scoreHome: number | null;
  scoreAway: number | null;
  updatedAt: string;
};

export type FixtureEvent = {
  type: "fixture.event";
  providerFixtureId: number;
  eventId: string;
  minute: number;
  kind: "GOAL" | "OTHER";
  team: "HOME" | "AWAY" | null;
  eventType?: string;
  playerName?: string | null;
  assistName?: string | null;
  createdAt: string;
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

export function useFixtureSubscription(
  providerFixtureId: number,
  initialEvents: FixtureEvent[] = [],
) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const [data, setData] = useState<FixtureUpdate | null>(null);
  const [events, setEvents] = useState<FixtureEvent[]>(initialEvents);

  const [connected, setConnected] = useState(false);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;

      const socket = new WebSocket(resolveWsUrl());
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempts.current = 0;
        setConnected(true);
        setHasConnectedOnce(true);

        socket.send(
          JSON.stringify({
            type: "subscribe",
            fixtureId: providerFixtureId,
          }),
        );
      };

      socket.onmessage = (event) => {
        const parsed = JSON.parse(event.data);

        if (
          parsed.type === "fixture.updated" &&
          parsed.providerFixtureId === providerFixtureId
        ) {
          setData(parsed);
        }

        if (
          parsed.type === "fixture.event" &&
          parsed.providerFixtureId === providerFixtureId
        ) {
          setEvents((prev) => [parsed, ...prev]);
        }
      };

      socket.onclose = () => {
        setConnected(false);
        scheduleReconnect();
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    function scheduleReconnect() {
      reconnectAttempts.current += 1;
      const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 10000);

      reconnectTimeout.current = setTimeout(connect, delay);
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      socketRef.current?.close();
    };
  }, [providerFixtureId]);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  return { data, events, connected, hasConnectedOnce };
}

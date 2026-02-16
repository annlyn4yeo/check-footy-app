"use client";

import { useEffect, useRef, useState } from "react";

type FixtureUpdate = {
  type: "fixture.updated";
  providerFixtureId: number;
  status: string;
  minute: number;
  scoreHome: number;
  scoreAway: number;
  updatedAt: string;
};

const WS_URL = "ws://localhost:4000";

export function useFixturesLive(initialFixtures: any[]) {
  const [fixtures, setFixtures] = useState(initialFixtures);
  const socketRef = useRef<WebSocket | null>(null);

  // 🔹 Sync when initial changes
  useEffect(() => {
    setFixtures(initialFixtures);
  }, [initialFixtures]);

  useEffect(() => {
    if (initialFixtures.length === 0) return;

    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      for (const f of initialFixtures) {
        socket.send(
          JSON.stringify({
            type: "subscribe",
            fixtureId: f.providerFixtureId,
          }),
        );
      }
    };

    socket.onmessage = (event) => {
      const parsed = JSON.parse(event.data);

      if (parsed.type !== "fixture.updated") return;

      setFixtures((prev) =>
        prev.map((f) =>
          f.providerFixtureId === parsed.providerFixtureId
            ? { ...f, ...parsed }
            : f,
        ),
      );
    };

    return () => {
      socket.close();
    };
  }, [initialFixtures]);

  return fixtures;
}

"use client";

import { useEffect, useRef, useState } from "react";
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

const WS_URL = "ws://localhost:4000";

export function useFixturesLive(initialFixtures: FixtureListItem[]) {
  const [fixtures, setFixtures] = useState(initialFixtures);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setFixtures(initialFixtures);
  }, [initialFixtures]);

  useEffect(() => {
    if (initialFixtures.length === 0) return;

    const socket = new WebSocket(WS_URL);
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
      const parsed = JSON.parse(event.data) as FixtureUpdate;

      if (parsed.type !== "fixture.updated") return;

      setFixtures((prev) =>
        prev.map((fixture) =>
          fixture.providerFixtureId === parsed.providerFixtureId
            ? {
                ...fixture,
                status: parsed.status,
                minute: parsed.minute,
                scoreHome: parsed.scoreHome,
                scoreAway: parsed.scoreAway,
              }
            : fixture,
        ),
      );
    };

    return () => {
      socket.close();
    };
  }, [initialFixtures]);

  return fixtures;
}

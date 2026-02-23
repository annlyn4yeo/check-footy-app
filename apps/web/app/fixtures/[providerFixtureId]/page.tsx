"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  useFixtureSubscription,
  type FixtureUpdate,
  type FixtureEvent,
} from "@/app/hooks/useFixtureSubscription";
import type { FixtureSnapshot } from "@/app/types/fixture";
import "./fixture.css";

export default function FixturePage() {
  const params = useParams();
  const fixtureId = Number(params.providerFixtureId);
  const [displayMinute, setDisplayMinute] = useState<number | null>(null);
  const [initialEvents, setInitialEvents] = useState<FixtureEvent[]>([]);
  const [snapshot, setSnapshot] = useState<FixtureSnapshot | null>(null);

  const {
    data: liveData,
    events,
    connected,
  } = useFixtureSubscription(fixtureId, initialEvents);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/fixtures/${fixtureId}`, {
        cache: "no-store",
      });

      if (!res.ok) return;

      const json = (await res.json()) as FixtureSnapshot;
      setSnapshot(json);

      setInitialEvents(
        json.matchEvents.map((event) => ({
          type: "fixture.event",
          providerFixtureId: json.providerFixtureId,
          eventId: event.providerEventId,
          minute: event.minute,
          kind:
            event.type === "GOAL" ||
            event.type === "PENALTY_GOAL" ||
            event.type === "OWN_GOAL"
              ? "GOAL"
              : "OTHER",
          team: event.team ?? "HOME",
          createdAt: event.createdAt,
        })),
      );
    }

    load();
  }, [fixtureId]);

  const data = liveData ?? snapshot;
  const scoreKey = `${data?.scoreHome}-${data?.scoreAway}`;

  useEffect(() => {
    if (typeof data?.minute !== "number") return;
    setDisplayMinute(data.minute);
  }, [data?.minute]);

  useEffect(() => {
    if (!data || data.status !== "LIVE") return;
    if (displayMinute == null) return;

    const interval = setInterval(() => {
      setDisplayMinute((prev) => {
        if (prev == null) return prev;
        return prev + 1;
      });
    }, 60_000);

    return () => clearInterval(interval);
  }, [data?.status, displayMinute]);

  return (
    <div className="fixture-root">
      <div className="teams-card">
        <div className="league-name">
          {snapshot?.league.name}
          {snapshot?.league.country ? ` (${snapshot.league.country})` : ""}
        </div>
        <div className="teams-row">
          <span>{snapshot?.homeTeam.name ?? "Home"}</span>
          <span>vs</span>
          <span>{snapshot?.awayTeam.name ?? "Away"}</span>
        </div>
      </div>

      <div className="scoreboard">
        <div className="status-row">
          <span
            className={`status-badge ${data?.status === "LIVE" ? "live" : ""}`}
          >
            {data?.status ?? "-"}
          </span>

          {data?.status === "LIVE" && <span className="live-indicator" />}
        </div>

        <div className="score-row">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={scoreKey}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="score"
            >
              {data?.scoreHome ?? 0} : {data?.scoreAway ?? 0}
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.div
          key={data?.minute}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="minute"
        >
          {displayMinute != null ? `${displayMinute}'` : ""}
        </motion.div>

        {!connected && <div className="connection-state">Syncing...</div>}
      </div>

      <div className="timeline">
        {events.map((event) => (
          <motion.div
            key={event.eventId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className={`event ${event.team.toLowerCase()}`}
          >
            <span className="event-minute">{event.minute}'</span>
            <span className="event-label">{event.kind}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

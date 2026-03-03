"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LiveIndicator } from "@/app/components/ui/live-indicator";
import { MatchTimeline } from "@/app/components/ui/match-timeline";
import { NavBar } from "@/app/components/ui/nav-bar";
import {
  useFixtureSubscription,
  type FixtureEvent,
} from "@/app/hooks/useFixtureSubscription";
import type { FixtureSnapshot } from "@/app/types/fixture";
import styles from "./fixture-page.module.css";

function mapSnapshotEvent(
  fixtureId: number,
  event: FixtureSnapshot["matchEvents"][number],
): FixtureEvent {
  return {
    type: "fixture.event",
    providerFixtureId: fixtureId,
    eventId: event.providerEventId,
    minute: event.minute,
    kind:
      event.type === "GOAL" ||
      event.type === "PENALTY_GOAL" ||
      event.type === "OWN_GOAL"
        ? "GOAL"
        : "OTHER",
    team: event.team,
    eventType: event.type,
    playerName: event.playerName,
    assistName: event.assistName,
    createdAt: event.createdAt,
  };
}

function formatEventType(type: string | undefined, kind: "GOAL" | "OTHER") {
  if (kind === "GOAL") return "GOAL";
  if (!type) return "EVENT";
  return type.replaceAll("_", " ");
}

function computeStats(events: FixtureEvent[]) {
  const homeShots = events.filter(
    (event) => event.team === "HOME" && event.eventType?.includes("SHOT"),
  ).length;
  const awayShots = events.filter(
    (event) => event.team === "AWAY" && event.eventType?.includes("SHOT"),
  ).length;
  const homeCorners = events.filter(
    (event) => event.team === "HOME" && event.eventType?.includes("CORNER"),
  ).length;
  const awayCorners = events.filter(
    (event) => event.team === "AWAY" && event.eventType?.includes("CORNER"),
  ).length;

  const totalEvents = Math.max(events.length, 1);
  const homePossession = Math.round(
    (events.filter((event) => event.team === "HOME").length / totalEvents) * 100,
  );

  return {
    homeShots,
    awayShots,
    homeCorners,
    awayCorners,
    homePossession,
    awayPossession: 100 - homePossession,
  };
}

export default function FixturePage() {
  const params = useParams();
  const fixtureId = Number(params.providerFixtureId);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [initialEvents, setInitialEvents] = useState<FixtureEvent[]>([]);
  const [snapshot, setSnapshot] = useState<FixtureSnapshot | null>(null);
  const {
    data: liveData,
    events,
    connected,
    hasConnectedOnce,
    scoreChangeTick,
  } = useFixtureSubscription(fixtureId, initialEvents);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/fixtures/${fixtureId}`, {
        cache: "no-store",
      });

      if (!res.ok) return;

      const json = (await res.json()) as FixtureSnapshot;
      setSnapshot(json);

      setInitialEvents(json.matchEvents.map((event) => mapSnapshotEvent(json.providerFixtureId, event)));
    }

    load();
  }, [fixtureId]);

  const data = liveData ?? snapshot;
  const isLive = data?.status === "LIVE";

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);

    return () => clearInterval(interval);
  }, [isLive]);

  const displayMinute = (() => {
    if (typeof data?.minute !== "number") return null;
    if (data.status !== "LIVE") return data.minute;

    const updatedAtMs = new Date(data.updatedAt).getTime();
    const elapsedMinutes = Math.max(
      0,
      Math.floor((nowMs - updatedAtMs) / 60_000),
    );

    return data.minute + elapsedMinutes;
  })();

  const stats = computeStats(events);

  if (!snapshot) {
    return (
      <main>
        <NavBar liveCount={0} active="LIVE" />
      </main>
    );
  }

  return (
    <main>
      <NavBar liveCount={snapshot.isLive ? 1 : 0} active="LIVE" />

      <section className={`${styles.hero} section-block`}>
        <h1 className={styles.teams}>
          {snapshot.homeTeam.shortName ?? snapshot.homeTeam.name}
          <span> VS </span>
          {snapshot.awayTeam.shortName ?? snapshot.awayTeam.name}
        </h1>

        <div className={`${styles.heroScore} ${scoreChangeTick ? styles.heroScorePulse : ""}`}>
          <span>{data?.scoreHome ?? 0}</span>
          <span>:</span>
          <span>{data?.scoreAway ?? 0}</span>
        </div>

        <div className={styles.heroMeta}>
          {isLive ? <LiveIndicator /> : <span className={styles.status}>{data?.status ?? "-"}</span>}
          {displayMinute != null && <span className={styles.minute}>{displayMinute}&apos;</span>}
          {hasConnectedOnce && !connected && <span className={styles.sync}>SYNCING</span>}
        </div>
      </section>

      <section className={`${styles.twoCol} section-block`}>
        <div className={styles.panel}>
          <h2 className={styles.heading}>Match Timeline</h2>
          <MatchTimeline events={events} liveMinute={displayMinute} />
        </div>

        <div className={styles.panel}>
          <h2 className={styles.heading}>Match Stats</h2>
          <div className={styles.stats}>
            <div className={styles.statRow}>
              <span>{stats.homePossession}%</span>
              <span>Possession</span>
              <span>{stats.awayPossession}%</span>
            </div>
            <div className={styles.statRow}>
              <span>{stats.homeShots}</span>
              <span>Shots</span>
              <span>{stats.awayShots}</span>
            </div>
            <div className={styles.statRow}>
              <span>{stats.homeCorners}</span>
              <span>Corners</span>
              <span>{stats.awayCorners}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-block">
        <h2 className="section-title">Full Event Log</h2>
        <div className={styles.logList}>
          {events.map((event) => (
            <article key={event.eventId} className={styles.logItem}>
              <span className={styles.logMinute}>{event.minute}&apos;</span>
              <span className={styles.logType}>{formatEventType(event.eventType, event.kind)}</span>
              <span className={styles.logPlayer}>{event.playerName ?? "Unknown"}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

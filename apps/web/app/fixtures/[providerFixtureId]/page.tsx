"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { LiveIndicator } from "@/app/components/ui/live-indicator";
import { MatchTimeline } from "@/app/components/ui/match-timeline";
import { NavBar } from "@/app/components/ui/nav-bar";
import {
  useFixtureSubscription,
  type FixtureEvent,
} from "@/app/hooks/useFixtureSubscription";
import type { FixtureSnapshot } from "@/app/types/fixture";

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

function isCompletedStatus(status: string | undefined) {
  return (
    status === "FULL_TIME" ||
    status === "FT" ||
    status === "FINISHED" ||
    status === "CANCELLED"
  );
}

function formatEventType(type: string | undefined, kind: "GOAL" | "OTHER") {
  if (kind === "GOAL") return "GOAL";
  if (!type) return "EVENT";
  return type.replaceAll("_", " ");
}

function formatKickoff(date: string | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
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
  const homeCards = events.filter(
    (event) =>
      event.team === "HOME" &&
      (event.eventType?.includes("YELLOW") || event.eventType?.includes("RED")),
  ).length;
  const awayCards = events.filter(
    (event) =>
      event.team === "AWAY" &&
      (event.eventType?.includes("YELLOW") || event.eventType?.includes("RED")),
  ).length;
  const homeSubs = events.filter(
    (event) => event.team === "HOME" && event.eventType?.includes("SUB"),
  ).length;
  const awaySubs = events.filter(
    (event) => event.team === "AWAY" && event.eventType?.includes("SUB"),
  ).length;
  const homeGoals = events.filter(
    (event) => event.team === "HOME" && event.kind === "GOAL",
  ).length;
  const awayGoals = events.filter(
    (event) => event.team === "AWAY" && event.kind === "GOAL",
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
    homeCards,
    awayCards,
    homeSubs,
    awaySubs,
    homeGoals,
    awayGoals,
    homePossession,
    awayPossession: 100 - homePossession,
  };
}

function buildGoalMoments(events: FixtureEvent[]) {
  return events
    .filter((event) => event.kind === "GOAL")
    .sort((a, b) => a.minute - b.minute)
    .slice(0, 8)
    .map((event) => ({
      minute: event.minute,
      team: event.team,
      player: event.playerName?.trim() || "Unknown",
    }));
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
      const res = await fetch(`/api/fixtures/${fixtureId}`, { cache: "no-store" });
      if (!res.ok) return;

      const json = (await res.json()) as FixtureSnapshot;
      setSnapshot(json);
      setInitialEvents(
        json.matchEvents.map((event) =>
          mapSnapshotEvent(json.providerFixtureId, event),
        ),
      );
    }

    void load();
  }, [fixtureId]);

  const data = liveData ?? snapshot;
  const isLive = data?.status === "LIVE";
  const isCompleted = isCompletedStatus(data?.status);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => clearInterval(interval);
  }, [isLive]);

  const displayMinute = useMemo(() => {
    if (typeof data?.minute !== "number") return null;
    if (data.status !== "LIVE") return data.minute;

    const updatedAtMs = new Date(data.updatedAt).getTime();
    const elapsedMinutes = Math.max(0, Math.floor((nowMs - updatedAtMs) / 60_000));
    return data.minute + elapsedMinutes;
  }, [data, nowMs]);

  const stats = useMemo(() => computeStats(events), [events]);
  const goalMoments = useMemo(() => buildGoalMoments(events), [events]);

  const resultHeadline = useMemo(() => {
    if (!data) return "-";
    if (!isCompleted) return isLive ? "Match In Progress" : "Pre-Match";
    if ((data.scoreHome ?? 0) > (data.scoreAway ?? 0)) return "Home Win";
    if ((data.scoreAway ?? 0) > (data.scoreHome ?? 0)) return "Away Win";
    return "Draw";
  }, [data, isCompleted, isLive]);

  if (!snapshot) {
    return (
      <main>
        <NavBar liveCount={0} />
      </main>
    );
  }

  return (
    <main>
      <NavBar liveCount={snapshot.isLive ? 1 : 0} />

      <section className="section-block">
        <div className="rounded-3xl border border-[var(--surface-2)] bg-[radial-gradient(circle_at_top_left,rgba(200,255,0,0.15),transparent_38%),var(--surface)] p-5 md:p-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full border border-[var(--surface-2)] px-3 py-1 text-xs uppercase tracking-[0.1em] text-[var(--muted)] [font-family:var(--font-body)]">
              {snapshot.league.name}
              {snapshot.league.country ? ` - ${snapshot.league.country}` : ""}
            </span>
            <span className="text-xs text-[var(--muted)] [font-family:var(--font-mono)]">
              {formatKickoff(snapshot.kickoffUtc)}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
            <div className="min-w-0">
              <p className="mb-1 text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] [font-family:var(--font-body)]">
                Home
              </p>
              <h1 className="min-w-0 break-words [font-family:var(--font-display)] text-[clamp(40px,6vw,92px)] uppercase leading-[0.84]">
                {snapshot.homeTeam.shortName ?? snapshot.homeTeam.name}
              </h1>
            </div>

            <div
              className={`justify-self-start rounded-2xl border border-[var(--surface-2)] bg-[linear-gradient(180deg,rgba(0,0,0,0.14),transparent),var(--surface)] px-4 py-2 lg:justify-self-center ${
                scoreChangeTick
                  ? "scale-[1.03] text-[var(--lime)] transition duration-200"
                  : "text-[var(--white)]"
              }`}
            >
              <p className="mb-1 text-center text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] [font-family:var(--font-body)]">
                Score
              </p>
              <div className="inline-flex items-baseline gap-4 [font-family:var(--font-display)] text-[clamp(84px,14vw,152px)] leading-[0.76]">
                <span>{data?.scoreHome ?? 0}</span>
                <span className="text-[var(--muted)]">:</span>
                <span>{data?.scoreAway ?? 0}</span>
              </div>
            </div>

            <div className="min-w-0 lg:text-right">
              <p className="mb-1 text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] [font-family:var(--font-body)]">
                Away
              </p>
              <h1 className="min-w-0 break-words [font-family:var(--font-display)] text-[clamp(40px,6vw,92px)] uppercase leading-[0.84]">
                {snapshot.awayTeam.shortName ?? snapshot.awayTeam.name}
              </h1>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {isLive ? (
              <LiveIndicator />
            ) : (
              <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)] [font-family:var(--font-body)]">
                {data?.status ?? "-"}
              </span>
            )}
            {displayMinute != null && (
              <span className="text-sm text-[var(--lime)] [font-family:var(--font-mono)]">
                {displayMinute}&apos;
              </span>
            )}
            {hasConnectedOnce && !connected && (
              <span className="rounded-full border border-[var(--surface-2)] px-3 py-1 text-xs uppercase tracking-[0.08em] text-[var(--muted)] [font-family:var(--font-body)]">
                SYNCING
              </span>
            )}
          </div>
        </div>
      </section>

      {isCompleted && (
        <section className="section-block">
          <h2 className="section-title">Match Summary</h2>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <article className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface)] p-4">
              <h3 className="mb-3 [font-family:var(--font-display)] text-3xl uppercase leading-none">
                Outcome
              </h3>
              <p className="text-3xl uppercase text-[var(--lime)] [font-family:var(--font-display)]">
                {resultHeadline}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.08em] text-[var(--muted)] [font-family:var(--font-body)]">
                Final Scoreline
              </p>
              <p className="text-2xl [font-family:var(--font-display)]">
                {data?.scoreHome ?? 0} - {data?.scoreAway ?? 0}
              </p>
            </article>

            <article className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface)] p-4 xl:col-span-2">
              <h3 className="mb-3 [font-family:var(--font-display)] text-3xl uppercase leading-none">
                Team Breakdown
              </h3>
              <div className="grid gap-2">
                {[
                  ["Goals", stats.homeGoals, stats.awayGoals],
                  ["Cards", stats.homeCards, stats.awayCards],
                  ["Subs", stats.homeSubs, stats.awaySubs],
                  ["Shots", stats.homeShots, stats.awayShots],
                  ["Corners", stats.homeCorners, stats.awayCorners],
                ].map(([label, home, away]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[1fr_auto_1fr] items-center rounded-full bg-[var(--surface-2)] px-3 py-2 [font-family:var(--font-body)] text-sm uppercase"
                  >
                    <span className="text-right">{home}</span>
                    <span className="px-3 text-[var(--muted)]">{label}</span>
                    <span>{away}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface)] p-4 xl:col-span-3">
              <h3 className="mb-3 [font-family:var(--font-display)] text-3xl uppercase leading-none">
                Goal Moments
              </h3>
              {goalMoments.length === 0 ? (
                <p className="text-sm text-[var(--muted)] [font-family:var(--font-body)]">
                  No goals recorded for this fixture.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {goalMoments.map((moment, index) => (
                    <div
                      key={`${moment.minute}-${moment.player}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-[var(--surface-2)] px-3 py-2 [font-family:var(--font-body)]"
                    >
                      <span className="text-sm uppercase text-[var(--muted)]">
                        {moment.minute}&apos;
                      </span>
                      <span className="font-semibold uppercase">{moment.player}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${
                          moment.team === "HOME"
                            ? "bg-[var(--lime)] text-black"
                            : "bg-[var(--surface-2)] text-[var(--white)]"
                        }`}
                      >
                        {moment.team ?? "UNK"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
        </section>
      )}

      <section className="section-block">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface)] p-4 md:p-5">
            <h2 className="mb-4 [font-family:var(--font-display)] text-3xl uppercase leading-none">
              Match Timeline
            </h2>
            <MatchTimeline events={events} liveMinute={displayMinute} />
          </article>

          <article className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface)] p-4 md:p-5">
            <h2 className="mb-4 [font-family:var(--font-display)] text-3xl uppercase leading-none">
              Match Stats
            </h2>
            <div className="grid gap-2">
              {[
                ["Possession", `${stats.homePossession}%`, `${stats.awayPossession}%`],
                ["Shots", stats.homeShots, stats.awayShots],
                ["Corners", stats.homeCorners, stats.awayCorners],
                ["Cards", stats.homeCards, stats.awayCards],
              ].map(([label, home, away]) => (
                <div
                  key={label}
                  className="grid grid-cols-[1fr_auto_1fr] items-center rounded-full bg-[var(--surface-2)] px-3 py-2 [font-family:var(--font-body)] text-sm uppercase"
                >
                  <span className="text-right">{home}</span>
                  <span className="px-3 text-[var(--muted)]">{label}</span>
                  <span>{away}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="section-block">
        <h2 className="section-title">Full Event Log</h2>
        <div className="grid gap-2.5">
          {events.map((event) => (
            <article
              key={event.eventId}
              className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-xl border border-[var(--surface-2)] bg-[var(--surface)] px-3 py-2"
            >
              <span className="text-xs text-[var(--lime)] [font-family:var(--font-mono)]">
                {event.minute}&apos;
              </span>
              <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--muted)] [font-family:var(--font-body)]">
                {formatEventType(event.eventType, event.kind)}
              </span>
              <span className="text-sm font-medium uppercase [font-family:var(--font-body)]">
                {event.playerName ?? "Unknown"}
                {event.assistName ? ` (AST ${event.assistName})` : ""}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${
                  event.team === "HOME"
                    ? "bg-[var(--lime)] text-black"
                    : event.team === "AWAY"
                      ? "bg-[var(--surface-2)] text-[var(--white)]"
                      : "bg-[var(--surface-2)] text-[var(--muted)]"
                }`}
              >
                {event.team ?? "UNK"}
              </span>
            </article>
          ))}
          {events.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--surface-2)] p-4 text-sm text-[var(--muted)] [font-family:var(--font-body)]">
              No event data available yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

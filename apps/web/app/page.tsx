"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/app/components/ui/nav-bar";
import { FixtureCard } from "@/app/components/ui/fixture-card";
import { useFixturesLive } from "@/app/hooks/useFixturesLive";
import type { FixtureListItem } from "@/app/types/fixture";

const LIVE_INFERENCE_WINDOW_MS = 3 * 60 * 60 * 1000;

function compareLeague(a: FixtureListItem, b: FixtureListItem) {
  const leagueKeyA = `${a.league.country ?? ""}-${a.league.name}`;
  const leagueKeyB = `${b.league.country ?? ""}-${b.league.name}`;
  return leagueKeyA.localeCompare(leagueKeyB);
}

function sortByKickoff(a: FixtureListItem, b: FixtureListItem) {
  return new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime();
}

function isLikelyLiveByKickoff(fixture: FixtureListItem) {
  const kickoffMs = new Date(fixture.kickoffUtc).getTime();
  if (!Number.isFinite(kickoffMs)) return false;
  const nowMs = Date.now();
  return kickoffMs <= nowMs && nowMs - kickoffMs <= LIVE_INFERENCE_WINDOW_MS;
}

function isLiveFixture(fixture: FixtureListItem) {
  if (isCompletedFixture(fixture)) return false;
  return (
    fixture.status === "LIVE" ||
    fixture.status === "HALF_TIME" ||
    fixture.isLive ||
    isLikelyLiveByKickoff(fixture)
  );
}

function isCompletedFixture(fixture: FixtureListItem) {
  return (
    fixture.status === "FULL_TIME" ||
    fixture.status === "FT" ||
    fixture.status === "FINISHED" ||
    fixture.status === "CANCELLED"
  );
}

function isUpcomingFixture(fixture: FixtureListItem) {
  if (isLiveFixture(fixture) || isCompletedFixture(fixture)) return false;
  return true;
}

function isResultFixture(fixture: FixtureListItem) {
  return isCompletedFixture(fixture);
}

type LeagueMatchdayGroup = {
  leagueId: number;
  leagueName: string;
  country: string | null;
  matchdayKey: string;
  fixtures: FixtureListItem[];
};

function toMatchdayKey(kickoffUtc: string) {
  return kickoffUtc.slice(0, 10);
}

function formatMatchdayLabel(matchdayKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${matchdayKey}T00:00:00Z`));
}

function buildLeagueMatchdayGroups(
  fixtures: FixtureListItem[],
  direction: "next" | "past",
): LeagueMatchdayGroup[] {
  const todayKey = new Date().toISOString().slice(0, 10);
  const byLeague = new Map<
    number,
    {
      leagueName: string;
      country: string | null;
      days: Map<string, FixtureListItem[]>;
    }
  >();

  for (const fixture of fixtures) {
    const leagueId = fixture.league.providerId;
    const dayKey = toMatchdayKey(fixture.kickoffUtc);
    const leagueEntry = byLeague.get(leagueId) ?? {
      leagueName: fixture.league.name,
      country: fixture.league.country,
      days: new Map<string, FixtureListItem[]>(),
    };

    const dayFixtures = leagueEntry.days.get(dayKey) ?? [];
    dayFixtures.push(fixture);
    leagueEntry.days.set(dayKey, dayFixtures);
    byLeague.set(leagueId, leagueEntry);
  }

  const groups: LeagueMatchdayGroup[] = [];
  for (const [leagueId, league] of byLeague.entries()) {
    const dayKeys = [...league.days.keys()].sort();
    const targetDayKey =
      direction === "next"
        ? dayKeys.find((dayKey) => dayKey >= todayKey) ??
          dayKeys[dayKeys.length - 1]
        : dayKeys[dayKeys.length - 1];
    if (!targetDayKey) continue;

    groups.push({
      leagueId,
      leagueName: league.leagueName,
      country: league.country,
      matchdayKey: targetDayKey,
      fixtures: (league.days.get(targetDayKey) ?? []).sort(sortByKickoff),
    });
  }

  return groups.sort((a, b) => {
    const keyA = `${a.country ?? ""}-${a.leagueName}`;
    const keyB = `${b.country ?? ""}-${b.leagueName}`;
    return keyA.localeCompare(keyB);
  });
}

export default function HomePage() {
  const [initial, setInitial] = useState<FixtureListItem[]>([]);

  useEffect(() => {
    fetch("/api/fixtures", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: FixtureListItem[]) => setInitial(json));
  }, []);

  const fixtures = useFixturesLive(initial);
  const liveFixtures = fixtures.filter(isLiveFixture).sort((a, b) => {
    const leagueCompare = compareLeague(a, b);
    if (leagueCompare !== 0) return leagueCompare;
    return b.minute - a.minute;
  });
  const upcomingFixtures = fixtures.filter(isUpcomingFixture);
  const resultFixtures = fixtures.filter(isResultFixture);

  const upcomingGroups = buildLeagueMatchdayGroups(upcomingFixtures, "next");
  const resultGroups = buildLeagueMatchdayGroups(resultFixtures, "past");

  return (
    <main>
      <NavBar liveCount={liveFixtures.length} />

      <section className="section-block">
        <h1 className="section-title lime">Live Now</h1>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {liveFixtures.map((fixture, index) => (
            <FixtureCard
              key={fixture.providerFixtureId}
              fixture={fixture}
              entryIndex={index}
              mode="LIVE"
            />
          ))}
          {liveFixtures.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--surface-2)] p-4 [font-family:var(--font-body)] text-sm text-[var(--muted)]">
              No live matches right now.
            </div>
          )}
        </div>
      </section>

      <section className="section-block">
        <h2 className="section-title">Upcoming</h2>
        <div className="grid grid-cols-1 gap-5">
          {upcomingGroups.map((group) => (
            <section
              key={`${group.leagueId}-${group.matchdayKey}`}
              className="rounded-3xl border border-[var(--surface-2)] bg-[radial-gradient(circle_at_top_left,rgba(200,255,0,0.14),transparent_40%),linear-gradient(160deg,rgba(255,255,255,0.06),transparent_32%),var(--surface)] p-4 md:p-5"
            >
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--surface-2)] pb-3">
                <h3 className="[font-family:var(--font-display)] text-3xl uppercase leading-none md:text-4xl">
                  {group.leagueName}
                  {group.country ? (
                    <span className="ml-2 [font-family:var(--font-body)] text-xs text-[var(--muted)]">
                      {group.country}
                    </span>
                  ) : null}
                </h3>
                <span className="rounded-full border border-[var(--surface-2)] px-3 py-1 [font-family:var(--font-mono)] text-xs text-[var(--lime)]">
                  NEXT MATCHDAY - {formatMatchdayLabel(group.matchdayKey)}
                </span>
              </header>

              <div className="mt-4 grid grid-cols-1 gap-3">
                {group.fixtures.map((fixture, index) => (
                  <FixtureCard
                    key={fixture.providerFixtureId}
                    fixture={fixture}
                    entryIndex={index}
                    mode="UPCOMING"
                    showLeague={false}
                  />
                ))}
              </div>
            </section>
          ))}
          {upcomingGroups.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--surface-2)] p-4 [font-family:var(--font-body)] text-sm text-[var(--muted)]">
              No upcoming fixtures found.
            </div>
          )}
        </div>
      </section>

      <section className="section-block">
        <h2 className="section-title">Results</h2>
        <div className="grid grid-cols-1 gap-5">
          {resultGroups.map((group) => (
            <section
              key={`${group.leagueId}-${group.matchdayKey}`}
              className="rounded-3xl border border-[var(--surface-2)] bg-[radial-gradient(circle_at_top_left,rgba(240,240,240,0.1),transparent_36%),linear-gradient(160deg,rgba(255,255,255,0.04),transparent_35%),var(--surface)] p-4 md:p-5"
            >
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--surface-2)] pb-3">
                <h3 className="[font-family:var(--font-display)] text-3xl uppercase leading-none md:text-4xl">
                  {group.leagueName}
                  {group.country ? (
                    <span className="ml-2 [font-family:var(--font-body)] text-xs text-[var(--muted)]">
                      {group.country}
                    </span>
                  ) : null}
                </h3>
                <span className="rounded-full border border-[var(--surface-2)] px-3 py-1 [font-family:var(--font-mono)] text-xs text-[var(--white)]">
                  PAST MATCHDAY - {formatMatchdayLabel(group.matchdayKey)}
                </span>
              </header>

              <div className="mt-4 grid grid-cols-1 gap-3">
                {group.fixtures.map((fixture, index) => (
                  <FixtureCard
                    key={fixture.providerFixtureId}
                    fixture={fixture}
                    entryIndex={index}
                    mode="RESULTS"
                    showLeague={false}
                  />
                ))}
              </div>
            </section>
          ))}
          {resultGroups.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--surface-2)] p-4 [font-family:var(--font-body)] text-sm text-[var(--muted)]">
              No recent results found.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

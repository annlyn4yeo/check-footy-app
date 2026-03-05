"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/app/components/ui/nav-bar";
import { FixtureCard } from "@/app/components/ui/fixture-card";
import { useFixturesLive } from "@/app/hooks/useFixturesLive";
import type { FixtureListItem } from "@/app/types/fixture";
import styles from "./page.module.css";

function compareLeague(a: FixtureListItem, b: FixtureListItem) {
  const leagueKeyA = `${a.league.country ?? ""}-${a.league.name}`;
  const leagueKeyB = `${b.league.country ?? ""}-${b.league.name}`;
  return leagueKeyA.localeCompare(leagueKeyB);
}

function isLiveFixture(fixture: FixtureListItem) {
  return (
    fixture.status === "LIVE" ||
    fixture.status === "HALF_TIME" ||
    fixture.isLive
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
  return new Date(fixture.kickoffUtc).getTime() >= Date.now();
}

function isResultFixture(fixture: FixtureListItem) {
  return isCompletedFixture(fixture);
}

export default function HomePage() {
  const [initial, setInitial] = useState<FixtureListItem[]>([]);
  const [activeTab, setActiveTab] = useState<"LIVE" | "UPCOMING" | "RESULTS">(
    "LIVE",
  );

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
  const upcomingFixtures = fixtures.filter(isUpcomingFixture).sort((a, b) => {
    const leagueCompare = compareLeague(a, b);
    if (leagueCompare !== 0) return leagueCompare;
    return new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime();
  });
  const resultFixtures = fixtures.filter(isResultFixture).sort((a, b) => {
    const leagueCompare = compareLeague(a, b);
    if (leagueCompare !== 0) return leagueCompare;
    return new Date(b.kickoffUtc).getTime() - new Date(a.kickoffUtc).getTime();
  });

  const visibleLive = activeTab === "LIVE" ? liveFixtures : [];
  const visibleUpcoming = activeTab === "RESULTS" ? [] : upcomingFixtures;
  const visibleResults = activeTab === "UPCOMING" ? [] : resultFixtures;

  return (
    <main>
      <NavBar
        liveCount={liveFixtures.length}
        active={activeTab}
        onChange={setActiveTab}
      />

      <section className="section-block">
        <h1 className="section-title lime">Live Now</h1>
        <div className={styles.grid}>
          {visibleLive.map((fixture, index) => (
            <FixtureCard
              key={fixture.providerFixtureId}
              fixture={fixture}
              entryIndex={index}
            />
          ))}
          {visibleLive.length === 0 && (
            <div className={styles.empty}>No live matches right now.</div>
          )}
        </div>
      </section>

      <section className="section-block">
        <h2 className="section-title">Upcoming</h2>
        <div className={styles.grid}>
          {visibleUpcoming.map((fixture, index) => (
            <FixtureCard
              key={fixture.providerFixtureId}
              fixture={fixture}
              entryIndex={visibleLive.length + index}
            />
          ))}
          {visibleUpcoming.length === 0 && (
            <div className={styles.empty}>No upcoming fixtures found.</div>
          )}
        </div>
      </section>

      <section className="section-block">
        <h2 className="section-title">Results</h2>
        <div className={styles.grid}>
          {visibleResults.map((fixture, index) => (
            <FixtureCard
              key={fixture.providerFixtureId}
              fixture={fixture}
              entryIndex={visibleLive.length + visibleUpcoming.length + index}
            />
          ))}
          {visibleResults.length === 0 && (
            <div className={styles.empty}>No recent results found.</div>
          )}
        </div>
      </section>
    </main>
  );
}

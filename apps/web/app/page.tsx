"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/app/components/ui/nav-bar";
import { FixtureCard } from "@/app/components/ui/fixture-card";
import { useFixturesLive } from "@/app/hooks/useFixturesLive";
import type { FixtureListItem } from "@/app/types/fixture";
import styles from "./page.module.css";

export default function HomePage() {
  const [initial, setInitial] = useState<FixtureListItem[]>([]);
  const [activeTab, setActiveTab] = useState<"LIVE" | "TODAY" | "UPCOMING" | "RESULTS">("LIVE");

  useEffect(() => {
    fetch("/api/fixtures", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: FixtureListItem[]) => setInitial(json));
  }, []);

  const fixtures = useFixturesLive(initial);
  const liveFixtures = fixtures.filter(
    (fixture) => fixture.status === "LIVE" || fixture.isLive,
  );
  const nonLiveFixtures = fixtures.filter(
    (fixture) => !(fixture.status === "LIVE" || fixture.isLive),
  );

  const visibleLive = activeTab === "UPCOMING" || activeTab === "RESULTS" ? [] : liveFixtures;
  const visibleToday =
    activeTab === "LIVE"
      ? nonLiveFixtures
      : nonLiveFixtures.filter((fixture) => {
          if (activeTab === "UPCOMING") {
            return fixture.status !== "FT" && fixture.status !== "FINISHED";
          }
          if (activeTab === "RESULTS") {
            return fixture.status === "FT" || fixture.status === "FINISHED";
          }
          return true;
        });

  return (
    <main>
      <NavBar liveCount={liveFixtures.length} active={activeTab} onChange={setActiveTab} />

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
        </div>
      </section>

      <section className="section-block">
        <h2 className="section-title">Today</h2>
        <div className={styles.grid}>
          {visibleToday.map((fixture, index) => (
            <FixtureCard
              key={fixture.providerFixtureId}
              fixture={fixture}
              entryIndex={visibleLive.length + index}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

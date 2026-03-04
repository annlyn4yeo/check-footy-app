"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { FixtureListItem } from "@/app/types/fixture";
import { LiveIndicator } from "@/app/components/ui/live-indicator";
import styles from "./fixture-card.module.css";

function formatKickoff(kickoffUtc: string) {
  const kickoff = new Date(kickoffUtc);
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(kickoff);
}

function resolveStatus(fixture: FixtureListItem) {
  if (
    fixture.status === "LIVE" ||
    fixture.status === "HALF_TIME" ||
    fixture.isLive
  )
    return "LIVE";
  if (
    fixture.status === "FULL_TIME" ||
    fixture.status === "FT" ||
    fixture.status === "FINISHED"
  ) {
    return "FT";
  }
  return "UPCOMING";
}

export function FixtureCard({
  fixture,
  entryIndex,
}: {
  fixture: FixtureListItem;
  entryIndex: number;
}) {
  const status = resolveStatus(fixture);

  const scoreValue = useMemo(() => {
    if (status === "UPCOMING") return "vs";
    return `${fixture.scoreHome ?? 0} : ${fixture.scoreAway ?? 0}`;
  }, [fixture.scoreAway, fixture.scoreHome, status]);

  return (
    <Link
      href={`/fixtures/${fixture.providerFixtureId}`}
      className={styles.link}
    >
      <article
        className={`${styles.card} ${status === "LIVE" ? `${styles.live} ${styles.borderSweep}` : styles.nonLive} ${styles.entry}`}
        style={{ animationDelay: `${entryIndex * 60}ms` }}
      >
        <div className={styles.names}>
          <div className={styles.league}>
            {fixture.league.name}
            {fixture.league.country ? ` (${fixture.league.country})` : ""}
          </div>
          <div>{fixture.homeTeam.shortName ?? fixture.homeTeam.name}</div>
          <div>{fixture.awayTeam.shortName ?? fixture.awayTeam.name}</div>
        </div>

        <div
          key={scoreValue}
          className={`${styles.score} ${styles.scorePulse}`}
        >
          {scoreValue}
        </div>

        <div className={styles.right}>
          {status === "LIVE" ? (
            <>
              <LiveIndicator />
              <div className={`${styles.pill} ${styles.pillLive}`}>
                LIVE <span className={styles.livePillDot} />
              </div>
            </>
          ) : status === "FT" ? (
            <div className={`${styles.pill} ${styles.pillFt}`}>FT</div>
          ) : (
            <div className={styles.upcomingWrap}>
              <div className={`${styles.pill} ${styles.pillUpcoming}`}>
                UPCOMING
              </div>
              <span className={styles.kickoff}>
                {formatKickoff(fixture.kickoffUtc)}
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

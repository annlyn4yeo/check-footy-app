"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { FixtureListItem } from "@/app/types/fixture";
import { LiveIndicator } from "@/app/components/ui/live-indicator";

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

type FixtureCardMode = "LIVE" | "UPCOMING" | "RESULTS";

function getModeStyles(status: "LIVE" | "FT" | "UPCOMING") {
  if (status === "LIVE") {
    return {
      border: "border-[rgba(200,255,0,0.45)]",
      rail: "bg-[linear-gradient(180deg,var(--lime),rgba(200,255,0,0.35))]",
      glow: "shadow-[0_10px_34px_rgba(200,255,0,0.16)]",
      panel:
        "bg-[linear-gradient(165deg,rgba(200,255,0,0.16),rgba(200,255,0,0.02)_38%,transparent_60%),var(--surface)]",
      score: "text-[var(--lime)]",
      tag: "bg-[var(--lime)] text-black border-transparent",
      meta: "text-[rgba(200,255,0,0.9)]",
    };
  }

  if (status === "UPCOMING") {
    return {
      border: "border-[var(--surface-2)]",
      rail: "bg-[linear-gradient(180deg,#ffffff,#bcbcbc)]",
      glow: "shadow-[0_8px_24px_rgba(255,255,255,0.08)]",
      panel:
        "bg-[linear-gradient(160deg,rgba(255,255,255,0.09),rgba(255,255,255,0.02)_34%,transparent_60%),var(--surface)]",
      score: "text-[var(--white)]",
      tag: "bg-[var(--white)] text-black border-transparent",
      meta: "text-[var(--muted)]",
    };
  }

  return {
    border: "border-[var(--surface-2)]",
    rail: "bg-[linear-gradient(180deg,#9ca3af,#4b5563)]",
    glow: "shadow-[0_8px_24px_rgba(80,80,80,0.18)]",
    panel:
      "bg-[linear-gradient(160deg,rgba(160,160,160,0.11),rgba(160,160,160,0.02)_36%,transparent_60%),var(--surface)]",
    score: "text-[var(--white)]",
    tag: "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--surface-2)]",
    meta: "text-[var(--muted)]",
  };
}

export function FixtureCard({
  fixture,
  entryIndex,
  mode,
  showLeague = true,
}: {
  fixture: FixtureListItem;
  entryIndex: number;
  mode?: FixtureCardMode;
  showLeague?: boolean;
}) {
  const status = useMemo(() => {
    if (mode === "LIVE") return "LIVE";
    if (mode === "RESULTS") return "FT";
    if (mode === "UPCOMING") return "UPCOMING";
    return resolveStatus(fixture);
  }, [fixture, mode]);

  const scoreValue = useMemo(() => {
    if (status === "UPCOMING") return "VS";
    return `${fixture.scoreHome ?? 0} : ${fixture.scoreAway ?? 0}`;
  }, [fixture.scoreAway, fixture.scoreHome, status]);

  const kickoffLabel = formatKickoff(fixture.kickoffUtc);
  const homeName = fixture.homeTeam.shortName ?? fixture.homeTeam.name;
  const awayName = fixture.awayTeam.shortName ?? fixture.awayTeam.name;
  const styles = getModeStyles(status);

  return (
    <Link
      href={`/fixtures/${fixture.providerFixtureId}`}
      className="block"
    >
      <article
        className={`relative overflow-hidden rounded-2xl border p-4 transition duration-200 hover:-translate-y-[2px] hover:scale-[1.01] md:grid md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-5 md:p-5 ${styles.border} ${styles.panel} ${styles.glow}`}
        style={{ transitionDelay: `${Math.max(0, entryIndex) * 25}ms` }}
      >
        <span className={`absolute bottom-0 left-0 top-0 w-[6px] ${styles.rail}`} />

        <div className="grid gap-3 pl-3 md:pl-4">
          {showLeague && (
            <div className="[font-family:var(--font-body)] text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
              {fixture.league.name.toUpperCase()}
              {fixture.league.country ? ` (${fixture.league.country})` : ""}
            </div>
          )}
          <div className="[font-family:var(--font-display)] text-[clamp(24px,2.3vw,34px)] font-black uppercase leading-[0.88]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--white)]/50" />
              <span>{homeName}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--white)]/35" />
              <span>{awayName}</span>
            </div>
          </div>
        </div>

        <div
          key={scoreValue}
          className={`min-w-[160px] rounded-xl border border-[var(--surface-2)]/60 bg-black/20 px-4 py-3 text-center [font-family:var(--font-display)] text-[clamp(50px,6.5vw,76px)] leading-[0.88] backdrop-blur-[1px] ${styles.score}`}
        >
          {scoreValue}
        </div>

        <div className="mt-3 flex flex-col items-start gap-2 md:mt-0 md:items-end">
          {status === "LIVE" ? (
            <>
              <LiveIndicator />
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 [font-family:var(--font-body)] text-[10px] font-semibold uppercase tracking-[0.1em] ${styles.tag}`}>
                LIVE <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-black" />
              </div>
            </>
          ) : status === "FT" ? (
            <div className={`inline-flex min-h-[22px] items-center rounded-full border px-3 py-1 [font-family:var(--font-body)] text-[10px] font-semibold uppercase tracking-[0.1em] ${styles.tag}`}>
              FT
            </div>
          ) : (
            <div className="flex flex-col items-start gap-1 md:items-end">
              <div className={`inline-flex min-h-[22px] items-center rounded-full border px-3 py-1 [font-family:var(--font-body)] text-[10px] font-semibold uppercase tracking-[0.1em] ${styles.tag}`}>
                UPCOMING
              </div>
              <span className={`[font-family:var(--font-mono)] text-xs ${styles.meta}`}>
                {kickoffLabel}
              </span>
            </div>
          )}

          {status === "FT" && (
            <span className={`[font-family:var(--font-mono)] text-xs ${styles.meta}`}>
              {kickoffLabel}
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}

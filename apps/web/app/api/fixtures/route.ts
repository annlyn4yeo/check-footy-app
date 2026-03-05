import { NextResponse } from "next/server";
import { FixtureRepository } from "@checkfooty/db";

const ALLOWED_LEAGUE_IDS = new Set([
  2021, // Premier League
  2014, // La Liga
  2002, // Bundesliga
  2019, // Serie A
  2015, // Ligue 1
  2145, // MLS
]);
const MAX_RESULTS_PER_LEAGUE = 20;

function isLiveStatus(status: string) {
  return status === "LIVE" || status === "HALF_TIME";
}

function isCompletedStatus(status: string) {
  return (
    status === "FULL_TIME" ||
    status === "FT" ||
    status === "FINISHED" ||
    status === "CANCELLED"
  );
}

export async function GET() {
  const nowMs = Date.now();
  const fixtures = (await FixtureRepository.findPublicList()).filter(
    (fixture) => ALLOWED_LEAGUE_IDS.has(fixture.league.providerId),
  );

  const compareLeague = (
    a: (typeof fixtures)[number],
    b: (typeof fixtures)[number],
  ) => {
    const leagueKeyA = `${a.league.country ?? ""}-${a.league.name}`;
    const leagueKeyB = `${b.league.country ?? ""}-${b.league.name}`;
    return leagueKeyA.localeCompare(leagueKeyB);
  };

  const live = fixtures
    .filter((fixture) => isLiveStatus(fixture.status) || fixture.isLive)
    .sort((a, b) => {
      const leagueCompare = compareLeague(a, b);
      if (leagueCompare !== 0) return leagueCompare;
      return b.minute - a.minute;
    });

  const upcoming = fixtures
    .filter(
      (fixture) =>
        !isCompletedStatus(fixture.status) &&
        !isLiveStatus(fixture.status) &&
        !fixture.isLive &&
        new Date(fixture.kickoffUtc).getTime() >= nowMs,
    )
    .sort((a, b) => {
      const leagueCompare = compareLeague(a, b);
      if (leagueCompare !== 0) return leagueCompare;
      return (
        new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime()
      );
    });

  const resultsByLeague = fixtures
    .filter(
      (fixture) => isCompletedStatus(fixture.status),
    )
    .sort((a, b) => {
      const leagueCompare = compareLeague(a, b);
      if (leagueCompare !== 0) return leagueCompare;
      return (
        new Date(b.kickoffUtc).getTime() - new Date(a.kickoffUtc).getTime()
      );
    });

  const groupedResults = new Map<number, typeof fixtures>();
  for (const fixture of resultsByLeague) {
    const leagueId = fixture.league.providerId;
    const bucket = groupedResults.get(leagueId) ?? [];
    if (bucket.length >= MAX_RESULTS_PER_LEAGUE) continue;
    bucket.push(fixture);
    groupedResults.set(leagueId, bucket);
  }

  const results = [...groupedResults.values()].flat();

  const merged = [...live, ...upcoming, ...results];

  return NextResponse.json(merged);
}

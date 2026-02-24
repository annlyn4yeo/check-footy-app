import {
  FixtureRepository,
  LeagueRepository,
  TeamRepository,
} from "@checkfooty/db";
import type { FixtureProvider, ProviderFixtureSeed } from "../providers/provider.interface.js";

function dedupeFixtures(fixtures: ProviderFixtureSeed[]) {
  const byProviderFixtureId = new Map<number, ProviderFixtureSeed>();

  for (const fixture of fixtures) {
    byProviderFixtureId.set(fixture.providerFixtureId, fixture);
  }

  return [...byProviderFixtureId.values()];
}

export async function syncProviderFixtures(provider: FixtureProvider) {
  const discovered = await provider.discoverFixtures();
  const deduped = dedupeFixtures(discovered);

  for (const fixture of deduped) {
    const [league, homeTeam, awayTeam] = await Promise.all([
      LeagueRepository.upsertByProviderId(fixture.league),
      TeamRepository.upsertByProviderId(fixture.homeTeam),
      TeamRepository.upsertByProviderId(fixture.awayTeam),
    ]);

    await FixtureRepository.upsertByProviderFixtureId({
      providerFixtureId: fixture.providerFixtureId,
      leagueId: league.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      kickoffUtc: fixture.kickoffUtc,
      minute: fixture.minute,
      scoreHome: fixture.scoreHome,
      scoreAway: fixture.scoreAway,
      status: fixture.status,
      providerLastUpdatedAt: fixture.providerTimestamp,
    });
  }

  return {
    discovered: discovered.length,
    upserted: deduped.length,
  };
}

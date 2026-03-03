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
  const leagueByProviderId = new Map<number, Awaited<ReturnType<typeof LeagueRepository.upsertByProviderId>>>();
  const teamByProviderId = new Map<number, Awaited<ReturnType<typeof TeamRepository.upsertByProviderId>>>();

  for (const fixture of deduped) {
    let league = leagueByProviderId.get(fixture.league.providerId);
    if (!league) {
      league = await LeagueRepository.upsertByProviderId(fixture.league);
      leagueByProviderId.set(fixture.league.providerId, league);
    }

    let homeTeam = teamByProviderId.get(fixture.homeTeam.providerId);
    if (!homeTeam) {
      homeTeam = await TeamRepository.upsertByProviderId(fixture.homeTeam);
      teamByProviderId.set(fixture.homeTeam.providerId, homeTeam);
    }

    let awayTeam = teamByProviderId.get(fixture.awayTeam.providerId);
    if (!awayTeam) {
      awayTeam = await TeamRepository.upsertByProviderId(fixture.awayTeam);
      teamByProviderId.set(fixture.awayTeam.providerId, awayTeam);
    }

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

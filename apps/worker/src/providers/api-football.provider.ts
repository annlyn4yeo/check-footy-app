import type {
  FixtureProvider,
  ProviderFixtureSeed,
} from "./provider.interface.js";
import type { FixtureStatus } from "../types/fixture-status.js";
import type { ProviderFixtureEvent } from "./provider.interface.js";
import { logger } from "../logger.js";
import { createHash } from "node:crypto";

const PREMIER_LEAGUE_ID = 39;
const DEFAULT_DISCOVERY_TTL_MS = 10 * 60 * 1000;
const DEFAULT_FIXTURE_UPDATE_TTL_MS = 15 * 1000;

type ApiFootballTeam = {
  id?: number | null;
  name?: string | null;
  code?: string | null;
  logo?: string | null;
};

type ApiFootballFixture = {
  id?: number;
  date?: string | null;
  timestamp?: number;
  status?: {
    short?: string;
    elapsed?: number | null;
  };
};

type ApiFootballFixtureItem = {
  fixture?: ApiFootballFixture;
  league?: {
    id?: number | null;
    name?: string | null;
    country?: string | null;
  };
  teams?: {
    home?: ApiFootballTeam;
    away?: ApiFootballTeam;
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
  events?: ApiFootballEvent[];
};

type ApiFootballFixtureResponse = {
  response?: ApiFootballFixtureItem[];
};

type ApiFootballEvent = {
  id?: number;
  time?: {
    elapsed?: number | null;
    extra?: number | null;
  };
  team?: {
    id?: number | null;
  };
  player?: {
    name?: string | null;
  };
  assist?: {
    name?: string | null;
  };
  type?: string | null;
  detail?: string | null;
};

function mapStatus(providerShort: string | undefined): FixtureStatus | null {
  switch (providerShort) {
    case "NS":
    case "TBD":
      return "SCHEDULED";

    case "1H":
    case "2H":
    case "ET":
    case "BT":
    case "P":
      return "LIVE";

    case "HT":
      return "HALF_TIME";

    case "FT":
    case "AET":
    case "PEN":
      return "FULL_TIME";

    case "PST":
      return "POSTPONED";

    case "CANC":
    case "ABD":
    case "AWD":
    case "WO":
      return "CANCELLED";

    default:
      return null;
  }
}

function mapEventType(
  event: ApiFootballEvent,
): ProviderFixtureEvent["type"] | null {
  const type = event.type?.toLowerCase() ?? "";
  const detail = event.detail?.toLowerCase() ?? "";

  if (type === "goal") {
    if (detail.includes("penalty")) return "PENALTY_GOAL";
    if (detail.includes("own")) return "OWN_GOAL";
    return "GOAL";
  }

  if (type === "card") {
    if (detail.includes("red")) return "RED_CARD";
    if (detail.includes("yellow")) return "YELLOW_CARD";
    return null;
  }

  if (type === "subst" || type === "substitution") {
    return "SUBSTITUTION";
  }

  if (type === "var") {
    return "VAR";
  }

  return null;
}

function stableEventId(
  providerFixtureId: number,
  event: ApiFootballEvent,
  index: number,
): number {
  if (typeof event.id === "number" && Number.isFinite(event.id)) {
    return event.id;
  }

  const signature = [
    providerFixtureId,
    event.time?.elapsed ?? 0,
    event.time?.extra ?? 0,
    event.team?.id ?? 0,
    event.type ?? "",
    event.detail ?? "",
    event.player?.name ?? "",
    event.assist?.name ?? "",
    index,
  ].join("|");

  const hashHex = createHash("sha1")
    .update(signature)
    .digest("hex")
    .slice(0, 12);
  return Number.parseInt(hashHex, 16);
}

function getApiConfig() {
  const baseUrl = process.env.API_FOOTBALL_BASE_URL;
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!baseUrl || !apiKey) {
    logger.warn("API_FOOTBALL_BASE_URL/API_FOOTBALL_KEY not configured");
    return null;
  }

  return { baseUrl, apiKey };
}

function parseNumber(input: string | undefined): number | null {
  if (!input) return null;

  const parsed = Number.parseInt(input, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLeagueIds(input: string | undefined) {
  if (!input) return [];

  return input
    .split(",")
    .map((value) => parseNumber(value.trim()))
    .filter((value): value is number => value != null);
}

function resolveLeagueIds(input: string | undefined): number[] {
  const configured = parseLeagueIds(input);
  if (configured.length > 0 && !configured.includes(PREMIER_LEAGUE_ID)) {
    logger.warn(
      {
        configuredLeagueIds: configured,
        forcedLeagueId: PREMIER_LEAGUE_ID,
      },
      "Ignoring non-Premier-League league IDs; provider is restricted to Premier League",
    );
  }
  return [PREMIER_LEAGUE_ID];
}

function parseTtlMs(
  value: string | undefined,
  fallbackMs: number,
  minMs = 0,
): number {
  const parsed = parseNumber(value);
  if (parsed == null) return fallbackMs;
  return Math.max(minMs, parsed);
}

function resolveKickoffUtc(fixture: ApiFootballFixture): Date | null {
  if (
    typeof fixture.timestamp === "number" &&
    Number.isFinite(fixture.timestamp)
  ) {
    return new Date(fixture.timestamp * 1000);
  }

  if (fixture.date) {
    const parsed = new Date(fixture.date);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function mapFixtureSeed(
  item: ApiFootballFixtureItem,
  providerTimestamp: Date,
): ProviderFixtureSeed | null {
  const fixture = item.fixture;
  const league = item.league;
  const homeTeam = item.teams?.home;
  const awayTeam = item.teams?.away;

  const providerFixtureId =
    typeof fixture?.id === "number" && Number.isFinite(fixture.id)
      ? fixture.id
      : null;

  const leagueProviderId =
    typeof league?.id === "number" && Number.isFinite(league.id)
      ? league.id
      : null;

  const homeTeamProviderId =
    typeof homeTeam?.id === "number" && Number.isFinite(homeTeam.id)
      ? homeTeam.id
      : null;

  const awayTeamProviderId =
    typeof awayTeam?.id === "number" && Number.isFinite(awayTeam.id)
      ? awayTeam.id
      : null;

  const kickoffUtc = fixture ? resolveKickoffUtc(fixture) : null;

  if (
    providerFixtureId == null ||
    leagueProviderId == null ||
    homeTeamProviderId == null ||
    awayTeamProviderId == null ||
    !kickoffUtc ||
    !league?.name ||
    !homeTeam?.name ||
    !awayTeam?.name
  ) {
    return null;
  }

  const mappedStatus = mapStatus(fixture?.status?.short);
  if (!mappedStatus) {
    return null;
  }

  const minuteRaw = fixture?.status?.elapsed;
  const minute =
    typeof minuteRaw === "number" && Number.isFinite(minuteRaw)
      ? Math.max(0, Math.floor(minuteRaw))
      : 0;

  const scoreHomeRaw = item.goals?.home;
  const scoreAwayRaw = item.goals?.away;

  const scoreHome =
    typeof scoreHomeRaw === "number" && Number.isFinite(scoreHomeRaw)
      ? Math.max(0, Math.floor(scoreHomeRaw))
      : 0;

  const scoreAway =
    typeof scoreAwayRaw === "number" && Number.isFinite(scoreAwayRaw)
      ? Math.max(0, Math.floor(scoreAwayRaw))
      : 0;

  return {
    providerFixtureId,
    kickoffUtc,
    minute,
    scoreHome,
    scoreAway,
    status: mappedStatus,
    providerTimestamp,
    league: {
      providerId: leagueProviderId,
      name: league.name,
      country: league.country ?? null,
    },
    homeTeam: {
      providerId: homeTeamProviderId,
      name: homeTeam.name,
      shortName: homeTeam.code ?? null,
      crestUrl: homeTeam.logo ?? null,
    },
    awayTeam: {
      providerId: awayTeamProviderId,
      name: awayTeam.name,
      shortName: awayTeam.code ?? null,
      crestUrl: awayTeam.logo ?? null,
    },
  };
}

async function fetchFixtureResponses(
  baseUrl: string,
  apiKey: string,
  params: URLSearchParams,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const url = new URL("/fixtures", baseUrl);
    for (const [key, value] of params.entries()) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-apisports-key": apiKey,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (response.status === 429) {
      logger.warn({ params: Object.fromEntries(params.entries()) }, "API-FOOTBALL rate limited (429)");
      return [];
    }

    if (!response.ok) {
      logger.warn(
        {
          params: Object.fromEntries(params.entries()),
          statusCode: response.status,
        },
        "API-FOOTBALL non-200 response",
      );
      return [];
    }

    const payload = (await response.json()) as ApiFootballFixtureResponse;
    return payload.response ?? [];
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      logger.warn({ params: Object.fromEntries(params.entries()) }, "API-FOOTBALL request timed out");
      return [];
    }

    logger.warn(
      { params: Object.fromEntries(params.entries()), error },
      "API-FOOTBALL request failed; returning empty fixtures",
    );
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export class ApiFootballProvider implements FixtureProvider {
  private discoveryCache:
    | { expiresAtMs: number; fixtures: ProviderFixtureSeed[] }
    | null = null;

  private fixtureUpdateCache = new Map<
    number,
    {
      expiresAtMs: number;
      update: Awaited<ReturnType<FixtureProvider["getFixtureUpdate"]>>;
    }
  >();

  private stampFixtures(
    fixtures: ProviderFixtureSeed[],
    providerTimestamp: Date,
  ): ProviderFixtureSeed[] {
    return fixtures.map((fixture) => ({
      ...fixture,
      providerTimestamp,
    }));
  }

  async discoverFixtures() {
    const config = getApiConfig();
    if (!config) return [];

    const nowMs = Date.now();
    const discoveryTtlMs = parseTtlMs(
      process.env.API_FOOTBALL_DISCOVERY_TTL_MS,
      DEFAULT_DISCOVERY_TTL_MS,
    );
    if (this.discoveryCache && nowMs < this.discoveryCache.expiresAtMs) {
      return this.stampFixtures(this.discoveryCache.fixtures, new Date(nowMs));
    }

    const leagueIds = resolveLeagueIds(process.env.API_FOOTBALL_LEAGUE_IDS);
    const season =
      process.env.API_FOOTBALL_SEASON ?? String(new Date().getUTCFullYear());

    const today = new Date().toISOString().slice(0, 10);

    const querySets: URLSearchParams[] = leagueIds.map(
      (leagueId) =>
        new URLSearchParams({
          live: "all",
          league: String(leagueId),
        }),
    );

    if (leagueIds.length > 0) {
      for (const leagueId of leagueIds) {
        querySets.push(
          new URLSearchParams({
            league: String(leagueId),
            season,
            date: today,
          }),
        );
      }
    } else {
      querySets.push(new URLSearchParams({ date: today }));
    }

    const providerTimestamp = new Date(nowMs);
    const byProviderFixtureId = new Map<number, ProviderFixtureSeed>();

    for (const query of querySets) {
      const responseItems = await fetchFixtureResponses(
        config.baseUrl,
        config.apiKey,
        query,
      );

      for (const item of responseItems) {
        const mapped = mapFixtureSeed(item, providerTimestamp);
        if (!mapped) continue;

        byProviderFixtureId.set(mapped.providerFixtureId, mapped);
      }
    }

    const fixtures = [...byProviderFixtureId.values()];
    this.discoveryCache = {
      expiresAtMs: nowMs + discoveryTtlMs,
      fixtures,
    };
    return this.stampFixtures(fixtures, providerTimestamp);
  }

  async getFixtureUpdate(providerFixtureId: number) {
    const config = getApiConfig();
    if (!config) return null;

    const nowMs = Date.now();
    const fixtureUpdateTtlMs = parseTtlMs(
      process.env.API_FOOTBALL_FIXTURE_UPDATE_TTL_MS,
      DEFAULT_FIXTURE_UPDATE_TTL_MS,
      1_000,
    );
    const cached = this.fixtureUpdateCache.get(providerFixtureId);
    if (cached && nowMs < cached.expiresAtMs) {
      return cached.update;
    }

    const responseItems = await fetchFixtureResponses(
      config.baseUrl,
      config.apiKey,
      new URLSearchParams({ id: String(providerFixtureId) }),
    );

    const fixtureItem = responseItems[0];
    const fixture = fixtureItem?.fixture;

    if (!fixture) {
      this.fixtureUpdateCache.set(providerFixtureId, {
        expiresAtMs: nowMs + fixtureUpdateTtlMs,
        update: null,
      });
      return null;
    }

    const mappedStatus = mapStatus(fixture.status?.short);
    if (!mappedStatus) {
      logger.warn(
        {
          providerFixtureId,
          providerStatus: fixture.status?.short ?? null,
        },
        "API-FOOTBALL status could not be mapped",
      );
      this.fixtureUpdateCache.set(providerFixtureId, {
        expiresAtMs: nowMs + fixtureUpdateTtlMs,
        update: null,
      });
      return null;
    }

    const minuteRaw = fixture.status?.elapsed;
    const minute =
      typeof minuteRaw === "number" && Number.isFinite(minuteRaw)
        ? Math.max(0, Math.floor(minuteRaw))
        : 0;

    const scoreHomeRaw = fixtureItem.goals?.home;
    const scoreAwayRaw = fixtureItem.goals?.away;

    const scoreHome =
      typeof scoreHomeRaw === "number" && Number.isFinite(scoreHomeRaw)
        ? Math.max(0, Math.floor(scoreHomeRaw))
        : 0;

    const scoreAway =
      typeof scoreAwayRaw === "number" && Number.isFinite(scoreAwayRaw)
        ? Math.max(0, Math.floor(scoreAwayRaw))
        : 0;

    const events: ProviderFixtureEvent[] = [];
    for (const [index, event] of (fixtureItem.events ?? []).entries()) {
      const normalizedType = mapEventType(event);
      if (!normalizedType) continue;

      const elapsedRaw = event.time?.elapsed;
      if (typeof elapsedRaw !== "number" || !Number.isFinite(elapsedRaw)) {
        continue;
      }

      const extraRaw = event.time?.extra;

      events.push({
        providerEventId: stableEventId(providerFixtureId, event, index),
        minute: Math.max(0, Math.floor(elapsedRaw)),
        extraMinute:
          typeof extraRaw === "number" && Number.isFinite(extraRaw)
            ? Math.max(0, Math.floor(extraRaw))
            : null,
        type: normalizedType,
        providerTeamId:
          typeof event.team?.id === "number" && Number.isFinite(event.team.id)
            ? event.team.id
            : null,
        playerName: event.player?.name ?? null,
        assistName: event.assist?.name ?? null,
      });
    }

    const hasMeaningfulUpdate =
      mappedStatus === "LIVE" ||
      mappedStatus === "HALF_TIME" ||
      mappedStatus === "FULL_TIME" ||
      minute > 0 ||
      scoreHome > 0 ||
      scoreAway > 0 ||
      events.length > 0;

    if (!hasMeaningfulUpdate) {
      this.fixtureUpdateCache.set(providerFixtureId, {
        expiresAtMs: nowMs + fixtureUpdateTtlMs,
        update: null,
      });
      return null;
    }

    const update = {
      providerFixtureId,
      minute,
      scoreHome,
      scoreAway,
      status: mappedStatus,
      providerTimestamp: new Date(),
      events,
    };
    this.fixtureUpdateCache.set(providerFixtureId, {
      expiresAtMs: nowMs + fixtureUpdateTtlMs,
      update,
    });
    return update;
  }
}

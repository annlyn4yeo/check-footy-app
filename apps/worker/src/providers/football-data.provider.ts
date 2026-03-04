import { createHash } from "node:crypto";
import { logger } from "../logger.js";
import type { FixtureStatus } from "../types/fixture-status.js";
import type {
  FixtureProvider,
  ProviderFixtureEvent,
  ProviderFixtureSeed,
} from "./provider.interface.js";

const DEFAULT_BASE_URL = "https://api.football-data.org/v4";
const DEFAULT_DISCOVERY_TTL_MS = 10 * 60 * 1000;
const DEFAULT_FIXTURE_UPDATE_TTL_MS = 15 * 1000;
const DEFAULT_UPCOMING_DAYS = 14;
const DEFAULT_RESULTS_DAYS = 30;
const DEFAULT_COMPETITIONS = [
  "PL",
  "PD",
  "BL1",
  "SA",
  "FL1",
  "DED",
  "PPL",
  "MLS",
  "BSA",
  "LMX",
];

type FootballDataConfig = {
  baseUrl: string;
  apiKey: string;
};

type FootballDataArea = {
  name?: string | null;
};

type FootballDataCompetition = {
  id?: number | null;
  name?: string | null;
  code?: string | null;
  area?: FootballDataArea | null;
};

type FootballDataTeam = {
  id?: number | null;
  name?: string | null;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
};

type FootballDataScore = {
  regularTime?: { home?: number | null; away?: number | null } | null;
  fullTime?: { home?: number | null; away?: number | null } | null;
  halfTime?: { home?: number | null; away?: number | null } | null;
};

type FootballDataGoal = {
  minute?: number | null;
  injuryTime?: number | null;
  type?: string | null;
  team?: { id?: number | null } | null;
  scorer?: { name?: string | null } | null;
  assist?: { name?: string | null } | null;
};

type FootballDataMatch = {
  id?: number | null;
  utcDate?: string | null;
  status?: string | null;
  minute?: number | null;
  competition?: FootballDataCompetition | null;
  homeTeam?: FootballDataTeam | null;
  awayTeam?: FootballDataTeam | null;
  score?: FootballDataScore | null;
  goals?: FootballDataGoal[] | null;
};

type FootballDataMatchesResponse = {
  matches?: FootballDataMatch[];
};

type FootballDataCompetitionResponse = {
  currentSeason?: {
    startDate?: string | null;
  } | null;
};

function parseIntEnv(value: string | undefined, fallback: number, min = 1) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
}

function mapStatus(status: string | null | undefined): FixtureStatus | null {
  switch ((status ?? "").toUpperCase()) {
    case "SCHEDULED":
    case "TIMED":
      return "SCHEDULED";
    case "IN_PLAY":
    case "PAUSED":
    case "EXTRA_TIME":
    case "PENALTY_SHOOTOUT":
      return "LIVE";
    case "FINISHED":
      return "FULL_TIME";
    case "POSTPONED":
      return "POSTPONED";
    case "SUSPENDED":
    case "CANCELLED":
    case "AWARDED":
      return "CANCELLED";
    default:
      return null;
  }
}

function mapScore(score: FootballDataScore | null | undefined) {
  const pick = (
    value: number | null | undefined,
    fallback: number | null | undefined,
  ) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof fallback === "number" && Number.isFinite(fallback)) return fallback;
    return 0;
  };

  const home = pick(score?.fullTime?.home, score?.regularTime?.home);
  const away = pick(score?.fullTime?.away, score?.regularTime?.away);

  return { home, away };
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function mapFixtureSeed(
  match: FootballDataMatch,
  providerTimestamp: Date,
): ProviderFixtureSeed | null {
  const fixtureId =
    typeof match.id === "number" && Number.isFinite(match.id) ? match.id : null;
  const competition = match.competition;
  const competitionId =
    typeof competition?.id === "number" && Number.isFinite(competition.id)
      ? competition.id
      : null;
  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;
  const homeTeamId =
    typeof homeTeam?.id === "number" && Number.isFinite(homeTeam.id)
      ? homeTeam.id
      : null;
  const awayTeamId =
    typeof awayTeam?.id === "number" && Number.isFinite(awayTeam.id)
      ? awayTeam.id
      : null;
  const kickoffUtc = match.utcDate ? new Date(match.utcDate) : null;
  const mappedStatus = mapStatus(match.status);

  if (
    fixtureId == null ||
    competitionId == null ||
    homeTeamId == null ||
    awayTeamId == null ||
    !kickoffUtc ||
    Number.isNaN(kickoffUtc.getTime()) ||
    !competition?.name ||
    !homeTeam?.name ||
    !awayTeam?.name ||
    !mappedStatus
  ) {
    return null;
  }

  const minute =
    typeof match.minute === "number" && Number.isFinite(match.minute)
      ? Math.max(0, Math.floor(match.minute))
      : 0;
  const score = mapScore(match.score);

  return {
    providerFixtureId: fixtureId,
    kickoffUtc,
    minute,
    scoreHome: score.home,
    scoreAway: score.away,
    status: mappedStatus,
    providerTimestamp,
    league: {
      providerId: competitionId,
      name: competition.name,
      country: competition.area?.name ?? null,
    },
    homeTeam: {
      providerId: homeTeamId,
      name: homeTeam.name,
      shortName: homeTeam.shortName ?? homeTeam.tla ?? null,
      crestUrl: homeTeam.crest ?? null,
    },
    awayTeam: {
      providerId: awayTeamId,
      name: awayTeam.name,
      shortName: awayTeam.shortName ?? awayTeam.tla ?? null,
      crestUrl: awayTeam.crest ?? null,
    },
  };
}

function mapGoalType(goal: FootballDataGoal): ProviderFixtureEvent["type"] {
  const type = (goal.type ?? "").toUpperCase();
  if (type.includes("OWN")) return "OWN_GOAL";
  if (type.includes("PENALTY")) return "PENALTY_GOAL";
  return "GOAL";
}

function stableGoalEventId(
  providerFixtureId: number,
  goal: FootballDataGoal,
  index: number,
): number {
  const signature = [
    providerFixtureId,
    goal.minute ?? 0,
    goal.injuryTime ?? 0,
    goal.team?.id ?? 0,
    goal.type ?? "",
    goal.scorer?.name ?? "",
    goal.assist?.name ?? "",
    index,
  ].join("|");
  const hashHex = createHash("sha1").update(signature).digest("hex").slice(0, 12);
  return Number.parseInt(hashHex, 16);
}

function parseCompetitionCodes(input: string | undefined) {
  if (!input) return [...DEFAULT_COMPETITIONS];
  const codes = input
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(codes)];
}

async function fetchJson<T>(
  config: FootballDataConfig,
  path: string,
  params: Record<string, string | number | undefined> = {},
  extraHeaders: Record<string, string> = {},
): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    const normalizedBase = config.baseUrl.endsWith("/")
      ? config.baseUrl
      : `${config.baseUrl}/`;
    const url = new URL(normalizedPath, normalizedBase);
    for (const [key, value] of Object.entries(params)) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Auth-Token": config.apiKey,
        Accept: "application/json",
        ...extraHeaders,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn(
        {
          path,
          params,
          statusCode: response.status,
        },
        "football-data request failed",
      );
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      logger.warn({ path, params }, "football-data request timed out");
      return null;
    }
    logger.warn({ path, params, error }, "football-data request errored");
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function getConfig(): FootballDataConfig | null {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  const baseUrl = process.env.FOOTBALL_DATA_BASE_URL ?? DEFAULT_BASE_URL;

  if (!apiKey) {
    logger.warn("FOOTBALL_DATA_API_KEY not configured");
    return null;
  }

  return { apiKey, baseUrl };
}

export class FootballDataProvider implements FixtureProvider {
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

  private competitionSeasonCache = new Map<string, number>();

  private async resolveSeason(
    config: FootballDataConfig,
    competitionCode: string,
  ): Promise<number> {
    const configured = Number.parseInt(process.env.FOOTBALL_DATA_SEASON ?? "", 10);
    if (Number.isFinite(configured)) return configured;

    const cached = this.competitionSeasonCache.get(competitionCode);
    if (cached) return cached;

    const payload = await fetchJson<FootballDataCompetitionResponse>(
      config,
      `/competitions/${competitionCode}`,
    );

    const season = payload?.currentSeason?.startDate
      ? new Date(payload.currentSeason.startDate).getUTCFullYear()
      : new Date().getUTCFullYear();

    this.competitionSeasonCache.set(competitionCode, season);
    return season;
  }

  async discoverFixtures() {
    const config = getConfig();
    if (!config) return [];

    const nowMs = Date.now();
    const discoveryTtlMs = parseIntEnv(
      process.env.FOOTBALL_DATA_DISCOVERY_TTL_MS,
      DEFAULT_DISCOVERY_TTL_MS,
      5_000,
    );
    if (this.discoveryCache && nowMs < this.discoveryCache.expiresAtMs) {
      return this.discoveryCache.fixtures.map((fixture) => ({
        ...fixture,
        providerTimestamp: new Date(nowMs),
      }));
    }

    const upcomingDays = parseIntEnv(
      process.env.FOOTBALL_DATA_UPCOMING_DAYS,
      DEFAULT_UPCOMING_DAYS,
      1,
    );
    const resultsDays = parseIntEnv(
      process.env.FOOTBALL_DATA_RESULTS_DAYS,
      DEFAULT_RESULTS_DAYS,
      1,
    );

    const today = new Date();
    const dateFromUpcoming = toDateString(today);
    const dateToUpcoming = toDateString(
      new Date(today.getTime() + upcomingDays * 24 * 60 * 60 * 1000),
    );
    const dateFromResults = toDateString(
      new Date(today.getTime() - resultsDays * 24 * 60 * 60 * 1000),
    );
    const dateToResults = toDateString(today);

    const competitionCodes = parseCompetitionCodes(
      process.env.FOOTBALL_DATA_COMPETITIONS,
    );
    const providerTimestamp = new Date(nowMs);
    const byFixtureId = new Map<number, ProviderFixtureSeed>();

    for (const code of competitionCodes) {
      const season = await this.resolveSeason(config, code);
      const queries: Array<Record<string, string | number | undefined>> = [
        { status: "LIVE" },
        {
          status: "SCHEDULED",
          season,
          dateFrom: dateFromUpcoming,
          dateTo: dateToUpcoming,
        },
        {
          status: "FINISHED",
          season,
          dateFrom: dateFromResults,
          dateTo: dateToResults,
        },
      ];

      for (const params of queries) {
        const payload = await fetchJson<FootballDataMatchesResponse>(
          config,
          `/competitions/${code}/matches`,
          params,
        );
        const matches = payload?.matches ?? [];

        for (const match of matches) {
          const mapped = mapFixtureSeed(match, providerTimestamp);
          if (!mapped) continue;
          byFixtureId.set(mapped.providerFixtureId, mapped);
        }
      }
    }

    const fixtures = [...byFixtureId.values()];
    this.discoveryCache = {
      expiresAtMs: nowMs + discoveryTtlMs,
      fixtures,
    };
    return fixtures;
  }

  async getFixtureUpdate(providerFixtureId: number) {
    const config = getConfig();
    if (!config) return null;

    const nowMs = Date.now();
    const updateTtlMs = parseIntEnv(
      process.env.FOOTBALL_DATA_FIXTURE_UPDATE_TTL_MS,
      DEFAULT_FIXTURE_UPDATE_TTL_MS,
      1_000,
    );
    const cached = this.fixtureUpdateCache.get(providerFixtureId);
    if (cached && nowMs < cached.expiresAtMs) {
      return cached.update;
    }

    const payload = await fetchJson<{ match?: FootballDataMatch | null }>(
      config,
      `/matches/${providerFixtureId}`,
      {},
      { "X-Unfold-Goals": "true" },
    );
    const match = payload?.match ?? null;
    const mapped = match ? mapFixtureSeed(match, new Date()) : null;

    if (!mapped) {
      this.fixtureUpdateCache.set(providerFixtureId, {
        expiresAtMs: nowMs + updateTtlMs,
        update: null,
      });
      return null;
    }

    const goals = match?.goals ?? [];
    const events: ProviderFixtureEvent[] = [];
    for (const [index, goal] of goals.entries()) {
      const minuteRaw = goal.minute;
      if (typeof minuteRaw !== "number" || !Number.isFinite(minuteRaw)) continue;

      events.push({
        providerEventId: stableGoalEventId(providerFixtureId, goal, index),
        minute: Math.max(0, Math.floor(minuteRaw)),
        extraMinute:
          typeof goal.injuryTime === "number" && Number.isFinite(goal.injuryTime)
            ? Math.max(0, Math.floor(goal.injuryTime))
            : null,
        type: mapGoalType(goal),
        providerTeamId:
          typeof goal.team?.id === "number" && Number.isFinite(goal.team.id)
            ? goal.team.id
            : null,
        playerName: goal.scorer?.name ?? null,
        assistName: goal.assist?.name ?? null,
      });
    }

    const update = {
      providerFixtureId,
      minute: mapped.minute,
      scoreHome: mapped.scoreHome,
      scoreAway: mapped.scoreAway,
      status: mapped.status,
      providerTimestamp: new Date(),
      events,
    };

    this.fixtureUpdateCache.set(providerFixtureId, {
      expiresAtMs: nowMs + updateTtlMs,
      update,
    });

    return update;
  }
}

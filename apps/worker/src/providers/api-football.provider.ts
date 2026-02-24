import type { FixtureProvider } from "./provider.interface.js";
import type { FixtureStatus } from "../types/fixture-status.js";
import type { ProviderFixtureEvent } from "./provider.interface.js";
import { logger } from "../logger.js";
import { createHash } from "node:crypto";

type ApiFootballFixtureResponse = {
  response?: Array<{
    fixture?: {
      id?: number;
      timestamp?: number;
      status?: {
        short?: string;
        elapsed?: number | null;
      };
    };
    goals?: {
      home?: number | null;
      away?: number | null;
    };
    events?: ApiFootballEvent[];
  }>;
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

export class ApiFootballProvider implements FixtureProvider {
  async getFixtureUpdate(providerFixtureId: number) {
    const baseUrl = process.env.API_FOOTBALL_BASE_URL;
    const apiKey = process.env.API_FOOTBALL_KEY;

    if (!baseUrl || !apiKey) {
      logger.warn("API_FOOTBALL_BASE_URL/API_FOOTBALL_KEY not configured");
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    try {
      const url = new URL("/fixtures", baseUrl);
      url.searchParams.set("id", String(providerFixtureId));

      console.log(`Fetching fixture ${providerFixtureId} from API-FOOTBALL`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "x-apisports-key": apiKey,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (response.status === 429) {
        logger.warn({ providerFixtureId }, "API-FOOTBALL rate limited (429)");
        return null;
      }

      if (!response.ok) {
        logger.warn(
          { providerFixtureId, statusCode: response.status },
          "API-FOOTBALL non-200 response",
        );
        return null;
      }

      const payload = (await response.json()) as ApiFootballFixtureResponse;
      const fixture = payload.response?.[0];

      if (!fixture?.fixture) {
        return null;
      }

      const mappedStatus = mapStatus(fixture.fixture.status?.short);
      if (!mappedStatus) {
        logger.warn(
          {
            providerFixtureId,
            providerStatus: fixture.fixture.status?.short ?? null,
          },
          "API-FOOTBALL status could not be mapped",
        );
        return null;
      }

      const minuteRaw = fixture.fixture.status?.elapsed;
      const minute =
        typeof minuteRaw === "number" && Number.isFinite(minuteRaw)
          ? Math.max(0, Math.floor(minuteRaw))
          : 0;

      const scoreHomeRaw = fixture.goals?.home;
      const scoreAwayRaw = fixture.goals?.away;

      const scoreHome =
        typeof scoreHomeRaw === "number" && Number.isFinite(scoreHomeRaw)
          ? Math.max(0, Math.floor(scoreHomeRaw))
          : 0;

      const scoreAway =
        typeof scoreAwayRaw === "number" && Number.isFinite(scoreAwayRaw)
          ? Math.max(0, Math.floor(scoreAwayRaw))
          : 0;

      const events: ProviderFixtureEvent[] = [];
      for (const [index, event] of (fixture.events ?? []).entries()) {
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
        return null;
      }

      return {
        providerFixtureId,
        minute,
        scoreHome,
        scoreAway,
        status: mappedStatus,
        providerTimestamp: new Date(),
        events,
      };
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        logger.warn({ providerFixtureId }, "API-FOOTBALL request timed out");
        return null;
      }

      logger.warn(
        { providerFixtureId, error },
        "API-FOOTBALL request failed; returning null",
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

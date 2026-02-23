import { NextResponse } from "next/server";
import { FixtureRepository } from "@checkfooty/db";

export async function GET(
  _: Request,
  context: { params: Promise<{ providerFixtureId: string }> },
) {
  const { providerFixtureId } = await context.params;

  const id = Number(providerFixtureId);

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const fixture = await FixtureRepository.findPublicByProviderFixtureId(id);

  if (!fixture) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const response = {
    providerFixtureId: fixture.providerFixtureId,
    status: fixture.status,
    minute: fixture.minute,
    scoreHome: fixture.scoreHome,
    scoreAway: fixture.scoreAway,
    isLive: fixture.isLive,
    kickoffUtc: fixture.kickoffUtc,
    league: fixture.league,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    updatedAt: fixture.updatedAt,
    matchEvents: fixture.matchEvents.map((event) => ({
      ...event,
      providerEventId: event.providerEventId.toString(),
      team:
        event.teamId === fixture.homeTeamId
          ? "HOME"
          : event.teamId === fixture.awayTeamId
            ? "AWAY"
            : null,
    })),
  };

  return NextResponse.json(response);
}

import { NextResponse } from "next/server";
import { prisma } from "@checkfooty/db";

export async function GET(
  _: Request,
  context: { params: Promise<{ providerFixtureId: string }> },
) {
  const { providerFixtureId } = await context.params;

  const id = Number(providerFixtureId);

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const fixture = await prisma.fixture.findUnique({
    where: { providerFixtureId: id },
    select: {
      providerFixtureId: true,
      status: true,
      minute: true,
      scoreHome: true,
      scoreAway: true,
      updatedAt: true,
      events: {
        orderBy: [{ minute: "desc" }, { providerEventId: "desc" }],
        select: {
          providerEventId: true,
          minute: true,
          type: true,
          playerName: true,
          assistName: true,
          createdAt: true,
        },
      },
    },
  });

  if (!fixture) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const response = {
    providerFixtureId: fixture.providerFixtureId,
    status: fixture.status,
    minute: fixture.minute,
    scoreHome: fixture.scoreHome,
    scoreAway: fixture.scoreAway,
    updatedAt: fixture.updatedAt,
    matchEvents: fixture.events.map((event) => ({
      ...event,
      providerEventId: event.providerEventId.toString(),
    })),
  };

  return NextResponse.json(response);
}

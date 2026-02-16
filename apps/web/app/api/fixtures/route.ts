import { NextResponse } from "next/server";
import { prisma } from "@checkfooty/db";

export async function GET() {
  const fixtures = await prisma.fixture.findMany({
    where: { deletedAt: null },
    orderBy: [{ isLive: "desc" }, { kickoffUtc: "asc" }],
    select: {
      providerFixtureId: true,
      status: true,
      minute: true,
      scoreHome: true,
      scoreAway: true,
      isLive: true,
      kickoffUtc: true,
    },
  });

  return NextResponse.json(fixtures);
}

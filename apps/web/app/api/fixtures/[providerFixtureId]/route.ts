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
    },
  });

  if (!fixture) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(fixture);
}

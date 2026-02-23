import { NextResponse } from "next/server";
import { FixtureRepository } from "@checkfooty/db";

export async function GET() {
  const fixtures = await FixtureRepository.findPublicList();

  return NextResponse.json(fixtures);
}

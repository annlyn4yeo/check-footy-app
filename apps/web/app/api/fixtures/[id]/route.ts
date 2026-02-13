export const runtime = "nodejs";

import { FixtureRepository } from "@checkfooty/db";
import { redis } from "@/lib/redis";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const providerFixtureId = Number(id);

  if (Number.isNaN(providerFixtureId)) {
    return new Response("Invalid fixture id", { status: 400 });
  }

  const cacheKey = `fixture:${providerFixtureId}`;

  const cached = await redis.get(cacheKey);

  if (cached) {
    return Response.json(JSON.parse(cached));
  }

  const fixture =
    await FixtureRepository.findByProviderFixtureId(providerFixtureId);

  if (!fixture) {
    return new Response("Not Found", { status: 404 });
  }

  await redis.set(cacheKey, JSON.stringify(fixture), "EX", 30);

  return Response.json(fixture);
}

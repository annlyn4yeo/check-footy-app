export const runtime = "nodejs";

import { FixtureRepository } from "@checkfooty/db";
import { redis } from "@/lib/redis";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const cacheKey = `fixture:${params.id}`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);

  if (cached) {
    return Response.json(JSON.parse(cached));
  }

  // 2. Fallback to DB
  const fixture = await FixtureRepository.findById(params.id);

  if (!fixture) {
    return new Response("Not Found", { status: 404 });
  }

  // 3. Store in cache (TTL 30 seconds)
  await redis.set(cacheKey, JSON.stringify(fixture), "EX", 30);

  return Response.json(fixture);
}

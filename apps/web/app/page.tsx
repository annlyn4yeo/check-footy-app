"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useFixturesLive } from "@/app/hooks/useFixturesLive";
import type { FixtureListItem } from "@/app/types/fixture";

export default function HomePage() {
  const [initial, setInitial] = useState<FixtureListItem[]>([]);

  useEffect(() => {
    fetch("/api/fixtures", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: FixtureListItem[]) => setInitial(json));
  }, []);

  const fixtures = useFixturesLive(initial);

  return (
    <div
      style={{
        padding: 32,
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      {fixtures.map((fixture) => (
        <Link
          key={fixture.providerFixtureId}
          href={`/fixtures/${fixture.providerFixtureId}`}
        >
          <motion.div
            whileHover={{ scale: 0.99 }}
            transition={{ duration: 0.15 }}
            style={{
              padding: 16,
              marginBottom: 16,
              borderRadius: 12,
              background: "var(--bg-surface)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {fixture.homeTeam.name} vs {fixture.awayTeam.name}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 2,
                }}
              >
                {fixture.league.name}
                {fixture.league.country ? ` (${fixture.league.country})` : ""}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                {fixture.status}
              </div>
            </div>

            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {fixture.scoreHome} : {fixture.scoreAway}
            </div>

            {fixture.isLive && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--accent-primary)",
                }}
              >
                LIVE {fixture.minute}'
              </div>
            )}
          </motion.div>
        </Link>
      ))}
    </div>
  );
}

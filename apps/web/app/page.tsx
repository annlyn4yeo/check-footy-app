"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useFixturesLive } from "@/app/hooks/useFixturesLive";

export default function HomePage() {
  const [initial, setInitial] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/fixtures", { cache: "no-store" })
      .then((res) => res.json())
      .then(setInitial);
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
      {fixtures.map((f) => (
        <Link
          key={f.providerFixtureId}
          href={`/fixtures/${f.providerFixtureId}`}
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
                Fixture {f.providerFixtureId}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                {f.status}
              </div>
            </div>

            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {f.scoreHome} : {f.scoreAway}
            </div>

            {f.isLive && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--accent-primary)",
                }}
              >
                LIVE {f.minute}'
              </div>
            )}
          </motion.div>
        </Link>
      ))}
    </div>
  );
}

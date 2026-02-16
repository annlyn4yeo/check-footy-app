"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    <div style={{ padding: 32 }}>
      {fixtures.map((f) => (
        <Link
          key={f.providerFixtureId}
          href={`/fixtures/${f.providerFixtureId}`}
        >
          <div
            style={{
              padding: 20,
              marginBottom: 16,
              borderRadius: 16,
              background: "#11161d",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div>
              <strong>{f.providerFixtureId}</strong>
              <div style={{ fontSize: 12 }}>{f.status}</div>
            </div>

            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {f.scoreHome} : {f.scoreAway}
            </div>

            {f.isLive && (
              <div style={{ color: "#b4ff00" }}>LIVE {f.minute}'</div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  useFixtureSubscription,
  FixtureUpdate,
} from "@/app/hooks/useFixtureSubscription";
import "./fixture.css";

export default function FixturePage() {
  const params = useParams();
  const fixtureId = Number(params.providerFixtureId);

  const { data: liveData, connected } = useFixtureSubscription(fixtureId);

  const [snapshot, setSnapshot] = useState<FixtureUpdate | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/fixtures/${fixtureId}`, {
        cache: "no-store",
      });

      if (!res.ok) return;

      const json = await res.json();
      setSnapshot(json);
    }

    load();
  }, [fixtureId]);

  const data = liveData ?? snapshot;

  const scoreKey = `${data?.scoreHome}-${data?.scoreAway}`;

  return (
    <div className="fixture-root">
      <div className="scoreboard">
        <div className="status-row">
          <span
            className={`status-badge ${data?.status === "LIVE" ? "live" : ""}`}
          >
            {data?.status ?? "—"}
          </span>

          {data?.status === "LIVE" && <span className="live-indicator" />}
        </div>

        <div className="score-row">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={scoreKey}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.05, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="score"
            >
              {data?.scoreHome ?? 0} : {data?.scoreAway ?? 0}
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.div
          key={data?.minute}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="minute"
        >
          {data?.minute ? `${data.minute}'` : ""}
        </motion.div>

        {!connected && <div className="connection-state">Syncing…</div>}
      </div>

      <div className="timeline-placeholder">Event timeline coming soon</div>
    </div>
  );
}

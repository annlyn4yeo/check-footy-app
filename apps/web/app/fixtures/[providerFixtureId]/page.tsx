"use client";

import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useFixtureSubscription } from "@/app/hooks/useFixtureSubscription";
import "./fixture.css";

export default function FixturePage() {
  const params = useParams();
  const fixtureId = Number(params.providerFixtureId);

  const { data, connected } = useFixtureSubscription(fixtureId);

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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.05, opacity: 0 }}
              transition={{ duration: 0.2 }}
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

        {!connected && <div className="connection-state">Reconnecting…</div>}
      </div>

      <div className="timeline-placeholder">Event timeline coming soon</div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import styles from "./nav-bar.module.css";

type Tab = "LIVE" | "UPCOMING" | "RESULTS";

const TABS: Tab[] = ["LIVE", "UPCOMING", "RESULTS"];

export function NavBar({
  liveCount,
  active,
  onChange,
}: {
  liveCount: number;
  active?: Tab;
  onChange?: (tab: Tab) => void;
}) {
  const [internalActive, setInternalActive] = useState<Tab>(active ?? "LIVE");
  const selected = useMemo(() => active ?? internalActive, [active, internalActive]);

  return (
    <header className={styles.nav}>
      <div className={styles.wordmark}>
        CHECKFOOTY <span className={styles.dot} />
      </div>

      <nav className={styles.tabs}>
        {TABS.map((tab) => {
          const isActive = selected === tab;

          return (
            <button
              key={tab}
              type="button"
              className={`${styles.tab} ${isActive ? styles.active : ""}`}
              onClick={() => {
                setInternalActive(tab);
                onChange?.(tab);
              }}
            >
              {tab}
              {tab === "LIVE" && liveCount > 0 && <span className={styles.liveDot} />}
            </button>
          );
        })}
      </nav>

      <div className={styles.avatar} aria-label="Account">
        NN
      </div>
    </header>
  );
}

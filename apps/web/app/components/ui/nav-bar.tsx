"use client";

import { useMemo, useState } from "react";

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
  const selected = useMemo(
    () => active ?? internalActive,
    [active, internalActive],
  );

  return (
    <header className="grid min-h-[76px] w-full grid-cols-1 items-center gap-3 border-b border-[var(--surface-2)] py-2 md:grid-cols-[1fr_auto_1fr] md:py-0">
      <div className="inline-flex items-center justify-self-start gap-2 [font-family:var(--font-display)] text-2xl tracking-[0.02em]">
        CHECKFOOTY <span className="h-[7px] w-[7px] rounded-full bg-[var(--lime)]" />
      </div>

      <nav className="inline-flex max-w-[calc(100vw-28px)] items-center justify-self-start overflow-x-auto rounded-full border border-[var(--surface-2)] p-1 md:justify-self-center">
        {TABS.map((tab) => {
          const isActive = selected === tab;

          return (
            <button
              key={tab}
              type="button"
              className={`inline-flex items-center gap-2 rounded-full border-0 px-3.5 py-2.5 [font-family:var(--font-body)] text-xs font-semibold uppercase tracking-[0.08em] transition ${
                isActive
                  ? "bg-[var(--lime)] text-black"
                  : "bg-transparent text-[var(--muted)]"
              }`}
              onClick={() => {
                setInternalActive(tab);
                onChange?.(tab);
              }}
            >
              {tab}
              {tab === "LIVE" && liveCount > 0 && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              )}
            </button>
          );
        })}
      </nav>

      <div
        className="hidden h-[34px] w-[34px] place-items-center justify-self-end rounded-full bg-[var(--surface-2)] [font-family:var(--font-body)] text-[11px] font-semibold tracking-[0.08em] text-[var(--white)] md:grid"
        aria-label="Account"
      >
        NN
      </div>
    </header>
  );
}

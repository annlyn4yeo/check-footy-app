"use client";

import Link from "next/link";

export function NavBar({
  liveCount,
}: {
  liveCount: number;
}) {
  return (
    <header className="flex min-h-[76px] w-full items-center justify-between gap-3 border-b border-[var(--surface-2)] py-2">
      <Link
        href="/"
        className="inline-flex items-center gap-2 [font-family:var(--font-display)] text-2xl tracking-[0.02em]"
      >
        CHECKFOOTY <span className="h-[7px] w-[7px] rounded-full bg-[var(--lime)]" />
      </Link>

      <div className="inline-flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 [font-family:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.1em] ${
            liveCount > 0
              ? "border-[var(--lime)] bg-[var(--lime)] text-black"
              : "border-[var(--surface-2)] text-[var(--muted)]"
          }`}
        >
          LIVE NOW
          <span className={`h-1.5 w-1.5 rounded-full ${liveCount > 0 ? "bg-black animate-pulse" : "bg-[var(--muted)]"}`} />
          <span>{liveCount}</span>
        </span>
      </div>

      <div
        className="hidden h-[34px] w-[34px] place-items-center justify-self-end rounded-full bg-[var(--surface-2)] [font-family:var(--font-body)] text-[11px] font-semibold tracking-[0.08em] text-[var(--white)] md:grid"
        aria-label="Account"
      >
        NN
      </div>
    </header>
  );
}

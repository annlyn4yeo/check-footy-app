export function LiveIndicator() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative inline-flex h-[10px] w-[10px] items-center justify-center">
        <span className="absolute h-[10px] w-[10px] animate-ping rounded-full bg-[color-mix(in_srgb,var(--lime)_35%,transparent)]" />
        <span className="h-[6px] w-[6px] rounded-full bg-[var(--lime)]" />
      </span>
      <span className="[font-family:var(--font-body)] text-[11px] font-medium tracking-[0.08em] text-[var(--lime)]">
        LIVE
      </span>
    </span>
  );
}

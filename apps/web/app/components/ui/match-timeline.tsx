import { memo } from "react";
import type { FixtureEvent } from "@/app/hooks/useFixtureSubscription";

function renderEventLabel(event: FixtureEvent) {
  const player = event.playerName?.trim();
  const minute = `${event.minute}'`;
  const icon = event.kind === "GOAL" ? "GOAL" : "EVENT";

  if (event.team === "AWAY") {
    return `${player ?? "Unknown"} ${minute} ${icon}`;
  }

  return `${icon} ${minute} ${player ?? "Unknown"}`;
}

const TimelineItem = memo(function TimelineItem({
  event,
}: {
  event: FixtureEvent;
}) {
  const sideClass =
    event.team === "AWAY"
      ? "justify-start ml-auto pl-3 sm:pl-3"
      : "justify-end mr-auto pr-3 sm:pr-3";

  return (
    <div className={`flex w-full sm:w-1/2 ${sideClass}`}>
      <div className="max-w-full whitespace-nowrap rounded-full border border-[var(--surface-2)] bg-[var(--surface)] px-3 py-2 text-sm font-medium [font-family:var(--font-body)]">
        {renderEventLabel(event)}
      </div>
    </div>
  );
});

export function MatchTimeline({
  events,
  liveMinute,
}: {
  events: FixtureEvent[];
  liveMinute: number | null;
}) {
  const markerTop =
    typeof liveMinute === "number"
      ? `${Math.max(5, Math.min(95, (liveMinute / 100) * 100))}%`
      : null;

  return (
    <section className="relative min-h-[220px]">
      <div className="absolute bottom-0 left-2 top-0 w-[2px] bg-[var(--surface-2)] sm:left-1/2 sm:-translate-x-1/2" />

      {markerTop && (
        <div
          className="absolute left-5 z-[2] inline-flex -translate-y-1/2 items-center gap-1.5 text-xs text-[var(--lime)] [font-family:var(--font-mono)] sm:left-[calc(50%+8px)]"
          style={{ top: markerTop }}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--lime)]" />
          <span>{liveMinute}&apos;</span>
        </div>
      )}

      <div className="relative flex flex-col gap-3.5 pl-6 sm:pl-0">
        {events.map((event) => (
          <TimelineItem key={event.eventId} event={event} />
        ))}
      </div>
    </section>
  );
}

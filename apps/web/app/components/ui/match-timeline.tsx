import { memo } from "react";
import type { FixtureEvent } from "@/app/hooks/useFixtureSubscription";
import styles from "./match-timeline.module.css";

function renderEventLabel(event: FixtureEvent) {
  const player = event.playerName?.trim();
  const minute = `${event.minute}'`;
  const icon = event.kind === "GOAL" ? "⚽" : "•";

  if (event.team === "AWAY") {
    return `${player ?? "Unknown"} ${minute} ${icon}`;
  }

  return `${icon} ${minute} ${player ?? "Unknown"}`;
}

const TimelineItem = memo(function TimelineItem({ event }: { event: FixtureEvent }) {
  const side = event.team === "AWAY" ? styles.right : styles.left;
  return (
    <div className={`${styles.row} ${side}`}>
      <div className={styles.pill}>{renderEventLabel(event)}</div>
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
    <section className={styles.wrap}>
      <div className={styles.centerLine} />
      {markerTop && (
        <div className={styles.liveMinute} style={{ top: markerTop }}>
          <span className={styles.liveMinuteDot} />
          <span>{liveMinute}&apos;</span>
        </div>
      )}

      <div className={styles.events}>
        {events.map((event) => (
          <TimelineItem key={event.eventId} event={event} />
        ))}
      </div>
    </section>
  );
}

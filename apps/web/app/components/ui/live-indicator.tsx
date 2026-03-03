import styles from "./live-indicator.module.css";

export function LiveIndicator() {
  return (
    <span className={styles.wrap}>
      <span className={styles.ring} />
      <span className={styles.dot} />
      <span className={styles.label}>LIVE</span>
    </span>
  );
}

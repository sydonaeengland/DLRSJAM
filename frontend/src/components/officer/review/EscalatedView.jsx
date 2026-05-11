// View shown when an application has been escalated — displays the reason and supervisor status.
import styles from "./SpecialView.module.css";

const ArrowUpIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#be185d" strokeWidth="2" strokeLinecap="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export default function EscalatedView({ app, onBack }) {
  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.iconWrap} style={{ background: "#fdf4ff", borderColor: "#f0abfc" }}>
          <ArrowUpIcon />
        </div>
        <h2 className={styles.title} style={{ color: "#be185d" }}>Application Escalated</h2>
        <p className={styles.sub}>This application is under supervisor review. You cannot take action until it is returned to you or resolved.</p>
        {app.escalation_reason && (
          <div className={styles.commentBox}>
            <p className={styles.commentLabel}>Your escalation reason</p>
            <p className={styles.commentVal}>"{app.escalation_reason}"</p>
          </div>
        )}
        <button className={styles.backBtn} onClick={onBack}>← Return to Dashboard</button>
      </div>
    </div>
  );
}
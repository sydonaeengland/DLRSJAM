// View shown when the application is waiting on the applicant to resubmit.
import styles from "./SpecialView.module.css";

const RotateIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round">
    <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 .49-4.5" />
  </svg>
);

export default function WaitingView({ app, onBack }) {
  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.iconWrap} style={{ background: "#fff7ed", borderColor: "#fed7aa" }}>
          <RotateIcon />
        </div>
        <h2 className={styles.title} style={{ color: "#c2410c" }}>Waiting on Applicant</h2>
        <p className={styles.sub}>You requested resubmission. This case will return to your queue automatically once the applicant responds.</p>
        {app.officer_comment && (
          <div className={styles.commentBox}>
            <p className={styles.commentLabel}>Your request to applicant</p>
            <p className={styles.commentVal}>"{app.officer_comment}"</p>
          </div>
        )}
        <button className={styles.backBtn} onClick={onBack}>← Return to Dashboard</button>
      </div>
    </div>
  );
}
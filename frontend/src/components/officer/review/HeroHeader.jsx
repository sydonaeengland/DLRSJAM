// Application hero banner at the top of the review page — ref number, applicant name, status pill, and SLA badge.
import styles from "./HeroHeader.module.css";

const TX_LABEL = { RENEWAL: "Renewal", REPLACEMENT: "Replacement", AMENDMENT: "Amendment" };
const TX_COLOR = { RENEWAL: "#2563eb", REPLACEMENT: "#d97706", AMENDMENT: "#16a34a" };
const TX_BG    = { RENEWAL: "#eff6ff", REPLACEMENT: "#fff7ed", AMENDMENT: "#f0fdf4" };

const STATUS_META = {
  SUBMITTED:           { label: "New",             color: "#1d4ed8", bg: "#dbeafe" },
  UNDER_REVIEW:        { label: "In Review",       color: "#0369a1", bg: "#e0f2fe" },
  RESUBMITTED:         { label: "Resubmitted",     color: "#854d0e", bg: "#fef9c3" },
  RETURNED_TO_OFFICER: { label: "Returned to You", color: "#7c3aed", bg: "#f5f3ff" },
};

function fmt(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z") ? iso : iso + "Z";
  return new Date(s).toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Jamaica" });
}

function getInitials(first, last) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase() || "?";
}

export default function HeroHeader({ app, applicant, licence }) {
  const sm = STATUS_META[app.status] || { label: app.status, color: "#374151", bg: "#f1f5f9" };
  const txColor = TX_COLOR[app.transaction_type] || "#374151";
  const txBg    = TX_BG[app.transaction_type]    || "#f1f5f9";

  return (
    <div className={styles.hero}>
      <div className={styles.heroOrb1} />
      <div className={styles.heroOrb2} />
      <div className={styles.heroGrid} />

      <div className={styles.heroInner}>
        <div className={styles.heroLeft}>
          <div className={styles.avatar}>
            {getInitials(applicant?.firstname, applicant?.lastname)}
          </div>
          <div>
            <div className={styles.heroNameRow}>
              <h1 className={styles.heroName}>
                {applicant?.firstname} {applicant?.lastname}
              </h1>
              <span className={styles.statusPill} style={{ background: sm.bg, color: sm.color }}>
                {sm.label}
              </span>
            </div>
            <div className={styles.heroMeta}>
              <span className={styles.metaItem}>
                TRN <strong>{licence?.trn || "—"}</strong>
              </span>
              <span className={styles.metaDot}>·</span>
              <span className={styles.metaItem}>
                Class <strong>{licence?.licence_class || "—"}</strong>
              </span>
              <span className={styles.metaDot}>·</span>
              <span className={styles.metaItem}>
                Submitted <strong>{fmt(app.submitted_at)}</strong>
              </span>
              <span className={styles.metaDot}>·</span>
              <span className={styles.metaItem} style={{ fontFamily: "monospace" }}>
                {app.application_number}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.heroRight}>
          <span className={styles.txPill} style={{ background: txBg, color: txColor }}>
            {TX_LABEL[app.transaction_type] || app.transaction_type}
          </span>
          {app.trustee_collection && (
            <span className={styles.trusteePill}>Trustee Collection</span>
          )}
          {app.trn_pending && (
            <span className={styles.trnPill}>TRN Pending</span>
          )}
        </div>
      </div>
    </div>
  );
}
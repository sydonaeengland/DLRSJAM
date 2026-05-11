// Single application row used in the officer queue tables.
import { useNavigate } from "react-router-dom";
import styles from "./AppRow.module.css";

const Ico = ({ d, size = 16, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const ChevRight = p => <Ico {...p} d="M9 18l6-6-6-6" />;
const EyeIcon   = p => <Ico {...p} d={["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6"]} />;
const FileIcon  = p => <Ico {...p} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6"]} />;

export const STATUS_META = {
  SUBMITTED:            { label: "New",             bg: "#dbeafe", color: "#1d4ed8" },
  UNDER_REVIEW:         { label: "In Review",       bg: "#e0f2fe", color: "#0369a1" },
  PENDING_ITA:          { label: "Awaiting ITA",    bg: "#f3e8ff", color: "#7c3aed" },
  ACTION_REQUIRED:      { label: "Action Required", bg: "#fee2e2", color: "#b91c1c" },
  WAITING_ON_APPLICANT: { label: "Waiting",         bg: "#ffedd5", color: "#c2410c" },
  RESUBMITTED:          { label: "Resubmitted",     bg: "#fef9c3", color: "#854d0e" },
  ESCALATED:            { label: "Escalated",       bg: "#fce7f3", color: "#be185d" },
  APPROVED:             { label: "Approved",        bg: "#dcfce7", color: "#15803d" },
  REJECTED:             { label: "Rejected",        bg: "#fee2e2", color: "#991b1b" },
};

export const TX_LABEL = { RENEWAL: "Renewal", REPLACEMENT: "Replacement", AMENDMENT: "Amendment" };
export const TX_COLOR = { RENEWAL: "#2563eb", REPLACEMENT: "#d97706", AMENDMENT: "#16a34a" };
export const TX_BG    = { RENEWAL: "#eff6ff", REPLACEMENT: "#fff7ed", AMENDMENT: "#f0fdf4" };

export function getInitials(name) {
  return (name || "?").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export function daysSince(iso) {
  return iso ? Math.max(0, Math.floor((Date.now() - new Date(iso)) / 86400000)) : 0;
}

export function Empty({ msg }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}><FileIcon size={16} stroke="#d1d5db" /></div>
      <p className={styles.emptyMsg}>{msg}</p>
    </div>
  );
}

export function TableCard({ children, title, count, action, onAction }) {
  return (
    <div className={styles.tableCard}>
      <div className={styles.tableCardHeader}>
        <div className={styles.tableCardTitleWrap}>
          <span className={styles.tableCardTitle}>{title}</span>
          {count > 0 && <span className={styles.tableCardCount}>{count}</span>}
        </div>
        {action && <button className={styles.tableCardAction} onClick={onAction}>{action}</button>}
      </div>
      {children}
    </div>
  );
}

export default function AppRow({ app, onOpen, readOnly }) {
  const navigate = useNavigate();
  const sm      = STATUS_META[app.status] || { label: app.status, bg: "#f1f5f9", color: "#475569" };
  const days    = daysSince(app.submitted_at);
  const urgencyBorder = days > 5 ? "#ef4444" : days > 2 ? "#f59e0b" : "#e2e8f0";
  const pendingITA    = app.status === "PENDING_ITA";

  return (
    <div className={styles.appRow}
      style={{ borderLeftColor: urgencyBorder, cursor: pendingITA ? "default" : "pointer", opacity: pendingITA ? 0.7 : 1 }}
      onClick={() => { if (pendingITA) return; readOnly ? navigate(`/officer/review/${app.id}`) : onOpen(app); }}>
      <div className={styles.appAvatar}
        style={{ background: TX_BG[app.transaction_type] || "#f1f5f9", color: TX_COLOR[app.transaction_type] || "#374151" }}>
        {getInitials(app.applicant_name || "")}
      </div>
      <div className={styles.appInfo}>
        <p className={styles.appName}>{app.applicant_name || "—"}</p>
        <p className={styles.appRef}>{app.application_number}</p>
      </div>
      <div className={styles.appMeta}>
        <span className={styles.txBadge}
          style={{ background: TX_BG[app.transaction_type] || "#f1f5f9", color: TX_COLOR[app.transaction_type] || "#374151" }}>
          {TX_LABEL[app.transaction_type] || app.transaction_type}
        </span>
        <span className={styles.statusPill} style={{ background: sm.bg, color: sm.color }}>
          {sm.label}
        </span>
        <span className={`${styles.appAge} ${days > 3 ? styles.overdue : styles.normal}`}>
          {days === 0 ? "Today" : `${days}d ago`}
        </span>
        {pendingITA ? (
          <span style={{ fontSize: "11px", color: "#7c3aed", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            ITA in progress
          </span>
        ) : (
          <button className={`${styles.reviewBtn} ${readOnly ? styles.readonly : styles.primary}`}>
            {readOnly
              ? <><EyeIcon size={12} />View</>
              : app.status === "SUBMITTED"
                ? <>Start <ChevRight size={11} /></>
                : <>Continue <ChevRight size={11} /></>
            }
          </button>
        )}
      </div>
    </div>
  );
}
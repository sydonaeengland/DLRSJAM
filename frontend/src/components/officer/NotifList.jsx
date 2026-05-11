// Notification dropdown list for the officer portal.
import { useNavigate } from "react-router-dom";
import styles from "./NotifList.module.css";

const Ico = ({ d, size = 16, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const InboxIcon   = p => <Ico {...p} d={["M22 12h-6l-2 3H10l-2-3H2","M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"]} />;
const RotateIcon  = p => <Ico {...p} d={["M1 4v6h6","M3.51 15a9 9 0 1 0 .49-4.5"]} />;
const AlertIcon   = p => <Ico {...p} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"]} />;
const ArrowUpIcon = p => <Ico {...p} d="M12 19V5M5 12l7-7 7 7" />;
const CheckIcon   = p => <Ico {...p} sw={2.5} d="M5 12l5 5L20 7" />;
const ShieldIcon  = p => <Ico {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;

export const NOTIF_META = {
  // Officer-targeted events
  SUBMITTED:                { label: "New application submitted",       color: "#1d4ed8", bg: "#dbeafe", Icon: InboxIcon   },
  RESUBMITTED:              { label: "Applicant resubmitted docs",      color: "#854d0e", bg: "#fef9c3", Icon: RotateIcon  },
  ESCALATION_RECEIVED:      { label: "Application escalated to you",    color: "#be185d", bg: "#fce7f3", Icon: ArrowUpIcon },
  ITA_CLEARED:              { label: "ITA clearance received",          color: "#7c3aed", bg: "#f3e8ff", Icon: ShieldIcon  },
  // Applicant-targeted events
  APPLICATION_APPROVED:     { label: "Your application was approved",   color: "#15803d", bg: "#dcfce7", Icon: CheckIcon   },
  APPLICATION_REJECTED:     { label: "Your application was rejected",   color: "#b91c1c", bg: "#fee2e2", Icon: AlertIcon   },
  RESUBMISSION_REQUESTED:   { label: "Action required on application",  color: "#b91c1c", bg: "#fee2e2", Icon: AlertIcon   },
  APPLICATION_ESCALATED:    { label: "Application escalated for review", color: "#be185d", bg: "#fce7f3", Icon: ArrowUpIcon },
};

export function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-JM", { day: "numeric", month: "short" });
}

export default function NotifList({ notifications, seenNotifs, setSeenNotifs, onNavigate, onMarkRead }) {
  const navigate = useNavigate();
  if (!notifications.length) return <p className={styles.empty}>No recent activity</p>;

  return notifications.map(n => {
    const meta   = NOTIF_META[n.event_type];
    if (!meta) return null;
    const unread = n.is_read === false && !seenNotifs.has(n.id);
    return (
      <div key={n.id}
        className={`${styles.row} ${unread ? styles.unread : ""}`}
        onClick={() => {
          if (n.application_id) navigate(`/officer/review/${n.application_id}`);
          setSeenNotifs(s => new Set([...s, n.id]));
          onMarkRead?.(n.id);
          onNavigate?.();
        }}>
        <div className={styles.icon} style={{ background: meta.bg }}>
          <meta.Icon size={13} stroke={meta.color} />
        </div>
        <div className={styles.body}>
          <p className={styles.name}>{n.applicant_name || n.application_number || "Application"}</p>
          <p className={styles.status} style={{ color: meta.color }}>{meta.label}</p>
          <p className={styles.ref}>{n.application_number}</p>
        </div>
        <div className={styles.meta}>
          <span className={styles.time}>{timeAgo(n.created_at)}</span>
          {unread && <div className={styles.dot} />}
        </div>
      </div>
    );
  });
}
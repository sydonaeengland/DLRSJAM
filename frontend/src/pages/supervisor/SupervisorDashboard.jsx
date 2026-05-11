// Supervisor portal shell — same structure as the officer portal but with escalated cases, officer management, and broader queue visibility.
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import styles from "./supervisor.module.css";
import coatOfArms from "../../assets/coat-of-arms.png";

const Ico = ({ d, size = 16, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const ShieldIcon   = p => <Ico {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const GridIcon     = p => <Ico {...p} d={["M3 3h7v7H3z","M14 3h7v7h-7z","M14 14h7v7h-7z","M3 14h7v7H3z"]} />;
const InboxIcon    = p => <Ico {...p} d={["M22 12h-6l-2 3H10l-2-3H2","M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"]} />;
const AlertIcon    = p => <Ico {...p} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"]} />;
const ClockIcon    = p => <Ico {...p} d={["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z","M12 6v6l4 2"]} />;
const RotateIcon   = p => <Ico {...p} d={["M1 4v6h6","M3.51 15a9 9 0 1 0 .49-4.5"]} />;
const CheckCircle  = p => <Ico {...p} d={["M22 11.08V12a10 10 0 1 1-5.93-9.14","M22 4L12 14.01l-3-3"]} />;
const XCircleIcon  = p => <Ico {...p} d={["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z","M15 9l-6 6","M9 9l6 6"]} />;
const UsersIcon    = p => <Ico {...p} d={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2","M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z","M23 21v-2a4 4 0 0 0-3-3.87","M16 3.13a4 4 0 0 1 0 7.75"]} />;
const BellIcon     = p => <Ico {...p} d={["M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 0 1-3.46 0"]} />;
const RefreshIcon  = p => <Ico {...p} d={["M23 4v6h-6","M1 20v-6h6","M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"]} />;
const ChevRight    = p => <Ico {...p} d="M9 18l6-6-6-6" />;
const ChevLeft     = p => <Ico {...p} d="M15 18l-6-6 6-6" />;
const SearchIcon   = p => <Ico {...p} d={["M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12z","M21 21l-4.35-4.35"]} />;
const UserIcon     = p => <Ico {...p} d={["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2","M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"]} />;
const BuildingIcon = p => <Ico {...p} d={["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z","M9 22V12h6v10"]} />;
const IdIcon       = p => <Ico {...p} d={["M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z","M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"]} />;
const LogOutIcon   = p => <Ico {...p} d={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4","M16 17l5-5-5-5","M21 12H9"]} />;
const EyeIcon      = p => <Ico {...p} d={["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6"]} />;

function SLABadge({ status, hours }) {
  if (status === "Overdue")      return <span className={`${styles.slaPill} ${styles.slaOverdue}`}>Overdue</span>;
  if (status === "NearDeadline") return <span className={`${styles.slaPill} ${styles.slaNear}`}>{hours}h left</span>;
  return <span className={`${styles.slaPill} ${styles.slaOnTime}`}>On Time</span>;
}

function statusPillClass(status) {
  if (!status) return styles.pillGrey;
  const s = status.toUpperCase();
  if (s === "APPROVED")  return styles.pillGreen;
  if (s === "REJECTED")  return styles.pillDarkRed;
  if (s.includes("ESCALAT")) return styles.pillRed;
  if (s.includes("WAITING") || s.includes("ACTION")) return styles.pillAmber;
  if (s === "PENDING_SUPERVISOR_APPROVAL") return styles.pillPurple;
  if (s === "RESUBMITTED") return styles.pillAmber;
  return styles.pillGrey;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z") ? iso : iso + "Z";
  return new Date(s).toLocaleDateString("en-JM", {
    day: "numeric", month: "short", year: "numeric", timeZone: "America/Jamaica",
  });
}

function getInitials(name) {
  return (name || "?").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function toTitleCase(str) {
  if (!str) return "—";
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function ProfileDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const initials = getInitials(user?.name || "");

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className={styles.profileWrap}>
      <button
        className={`${styles.profileBtn} ${open ? styles.open : ""}`}
        onClick={() => setOpen(v => !v)}
      >
        <div className={styles.profileAvatar}>{initials}</div>
        <div>
          <p className={styles.profileName}>{user?.name || "Supervisor"}</p>
          <p className={styles.profileBranch}>{toTitleCase(user?.branch) || user?.staff_id || ""}</p>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
          className={`${styles.profileChevron} ${open ? styles.open : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className={styles.profileDropdown}>
          <div className={styles.profileDropdownHeader}>
            <div className={styles.profileDropdownHeaderTop}>
              <div className={`${styles.profileAvatar} ${styles.md}`}>{initials}</div>
              <div>
                <p className={styles.profileFullName}>{user?.name || "—"}</p>
                <p className={styles.profileEmail}>{user?.email || "—"}</p>
              </div>
            </div>
            {[
              { Icon: IdIcon,       label: "Staff ID",   val: user?.staff_id || "—" },
              { Icon: BuildingIcon, label: "Branch",     val: toTitleCase(user?.branch) },
              { Icon: UsersIcon,    label: "Department", val: user?.department || "Driver's Licence Unit" },
            ].map(row => (
              <div key={row.label} className={styles.profileMetaRow}>
                <row.Icon size={13} stroke="#c4c9d4" />
                <span className={styles.profileMetaLabel}>{row.label}</span>
                <span className={styles.profileMetaVal}>{row.val}</span>
              </div>
            ))}
          </div>
          <div className={styles.profileActions}>
            <button className={styles.profileAction} disabled><UserIcon size={14} /> Edit profile</button>
            <button className={styles.profileAction} disabled><IdIcon   size={14} /> Change password</button>
            <div className={styles.profileDivider} />
            <button className={`${styles.profileAction} ${styles.danger}`} onClick={onLogout}>
              <LogOutIcon size={14} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function hoursAgo(iso) {
  if (!iso) return null;
  const s = iso.endsWith("Z") ? iso : iso + "Z";
  const h = Math.floor((Date.now() - new Date(s)) / 3600000);
  if (h < 1) return "< 1h ago";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const DATE_FILTER_OPTIONS = [
  { id: "all",     label: "All time" },
  { id: "week",    label: "This week" },
  { id: "7days",   label: "Last 7 days" },
  { id: "month",   label: "This month" },
  { id: "30days",  label: "Last 30 days" },
];

function applyDateFilter(items, dateFilter, field = "submitted_at") {
  if (!dateFilter || dateFilter === "all") return items;
  const now = new Date();
  let cutoff;
  if (dateFilter === "week") {
    const day = now.getDay();
    cutoff = new Date(now);
    cutoff.setDate(now.getDate() - day);
    cutoff.setHours(0, 0, 0, 0);
  } else if (dateFilter === "7days") {
    cutoff = new Date(now.getTime() - 7 * 86400000);
  } else if (dateFilter === "month") {
    cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (dateFilter === "30days") {
    cutoff = new Date(now.getTime() - 30 * 86400000);
  }
  if (!cutoff) return items;
  return items.filter(a => {
    const v = a[field];
    if (!v) return false;
    const t = new Date(v.endsWith("Z") ? v : v + "Z");
    return t >= cutoff;
  });
}

function ScorePip({ label, val }) {
  if (val == null) return null;
  const pct = Math.round(val);
  const color = pct >= 80 ? "#15803d" : pct >= 60 ? "#b45309" : "#b91c1c";
  const bg    = pct >= 80 ? "#dcfce7"  : pct >= 60 ? "#fef3c7"  : "#fee2e2";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700,
      padding: "2px 7px", borderRadius: 999, background: bg, color }}>
      {label} {pct}%
    </span>
  );
}

const TX_COLOR = {
  RENEWAL:     { bg: "#eff6ff", color: "#2563eb" },
  REPLACEMENT: { bg: "#fff7ed", color: "#d97706" },
  AMENDMENT:   { bg: "#f0fdf4", color: "#16a34a" },
};

function AppCard({ app, showEscalation = false, onClick, showView = false }) {
  const iconBg = showEscalation ? "#fee2e2"
    : app.status?.includes("WAITING") ? "#fef3c7"
    : app.status === "APPROVED" ? "#dcfce7"
    : app.status === "REJECTED" ? "#fee2e2"
    : "#ede9fe";

  const txMeta = TX_COLOR[app.transaction_type] || { bg: "#f1f5f9", color: "#374151" };

  return (
    <div
      className={`${styles.appCard} ${showEscalation ? styles.appCardEscalated : ""}`}
      onClick={() => onClick(app.id)}
    >
      <div className={styles.appIconBlock} style={{ background: iconBg }}>
        {showEscalation
          ? <AlertIcon size={18} stroke="#b91c1c" />
          : app.status === "APPROVED"   ? <CheckCircle size={18} stroke="#15803d" />
          : app.status === "REJECTED"   ? <XCircleIcon size={18} stroke="#b91c1c" />
          : app.status?.includes("WAITING") ? <RotateIcon size={18} stroke="#b45309" />
          : <ClockIcon size={18} stroke="#6d28d9" />}
      </div>

      <div className={styles.appCardBody}>
        <div className={styles.appCardTopRow}>
          <span className={styles.appCardRef}>{app.application_number}</span>
          {app.transaction_type && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
              background: txMeta.bg, color: txMeta.color }}>{app.transaction_type}</span>
          )}
          <span className={`${styles.pill} ${statusPillClass(app.status)}`}>{app.status?.replace(/_/g, " ")}</span>
        </div>
        <div className={styles.appCardMeta}>
          <span className={styles.appCardMetaBold}>{app.applicant_name}</span>
          <span>TRN: {app.trn}</span>
          <span>Officer: {app.officer_name || "—"}</span>
          {app.submitted_at && <span>Submitted {fmtDate(app.submitted_at)}</span>}
        </div>

        {showEscalation && app.escalation_reason && (
          <div className={styles.escalationReason} style={{ marginTop: 8 }}>
            <div className={styles.escalationReasonLabel}>Escalation Reason</div>
            <div className={styles.escalationReasonText}>"{app.escalation_reason}"</div>
          </div>
        )}
      </div>

      <div className={styles.appCardRight}>
        {!["APPROVED","REJECTED"].includes(app.status) && (
          <SLABadge status={app.sla_status} hours={app.hours_remaining} />
        )}
        {showView && (
          <button
            onClick={e => { e.stopPropagation(); onClick(app.id); }}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "white", color: "#374151", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            <EyeIcon size={11} stroke="currentColor" /> View
          </button>
        )}
        <span className={styles.chevronRight}><ChevRight size={14} /></span>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: "dashboard",     label: "Dashboard",         Icon: GridIcon,    group: null       },
  { id: "escalated",     label: "Escalated Cases",   Icon: AlertIcon,   group: "Needs Action" },
  { id: "resubmissions", label: "Resubmissions",     Icon: RotateIcon,  group: null       },
  { id: "pending",       label: "Active Queue",      Icon: ClockIcon,   group: "Monitor"  },
  { id: "all",           label: "All Applications",  Icon: InboxIcon,   group: null       },
  { id: "officers",      label: "My Officers",       Icon: UsersIcon,   group: "Overview" },
  { id: "completed",     label: "Completed",         Icon: CheckCircle, group: null       },
];

const PAGE_META = {
  dashboard:     "Dashboard",
  escalated:     "Escalated Cases",
  pending:       "Active Queue",
  resubmissions: "Resubmissions",
  all:           "All Applications",
  officers:      "My Officers",
  completed:     "Completed",
};

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, hasRole, logout } = useAuth();

  const [page,          setPage]          = useState(() => searchParams.get("page") || "dashboard");
  const [collapsed,     setCollapsed]     = useState(false);
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [lastRefresh,   setLastRefresh]   = useState(new Date());
  const [notifications, setNotifications] = useState([]);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [seenNotifs,    setSeenNotifs]    = useState(new Set());
  const [signingOut,    setSigningOut]    = useState(false);
  const [sectionSearch, setSectionSearch] = useState("");
  const [dateFilter,    setDateFilter]    = useState("all");
  const [officerSearch, setOfficerSearch] = useState("");
  const [selectedOfficerId, setSelectedOfficerId] = useState(null);

  const [showSigPrompt, setShowSigPrompt] = useState(false);
  const [sigPadEmpty,   setSigPadEmpty]   = useState(true);
  const [sigSaving,     setSigSaving]     = useState(false);
  const sigCanvasRef = useRef(null);
  const sigDrawing   = useRef(false);
  const notifRef     = useRef(null);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [qRes, nRes] = await Promise.all([
        api.get("/api/supervisor/queue"),
        api.get("/api/notifications/").catch(() => ({ data: { notifications: [] } })),
      ]);
      setData(qRes.data);
      setNotifications(nRes.data.notifications || []);
      setLastRefresh(new Date());
    } catch { }
    finally {
      setLoading(false);
      if (manual) setTimeout(() => setRefreshing(false), 700);
    }
  }, []);

  useEffect(() => {
    if (!hasRole("supervisor")) {
      navigate(hasRole("officer") ? "/officer" : "/staff/login");
      return;
    }
    fetchData();
    const t = setInterval(() => fetchData(), 30000);
    return () => clearInterval(t);
  }, [hasRole, navigate, fetchData]);

  useEffect(() => {
    const p = searchParams.get("page");
    if (p) setPage(p);
  }, [searchParams]);

  useEffect(() => {
    api.get("/api/supervisor/profile/signature")
      .then(res => { if (!res.data.signature_image) setShowSigPrompt(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const h = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const sigGetPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };
  const sigStartDraw = e => {
    e.preventDefault();
    sigDrawing.current = true;
    const c = sigCanvasRef.current;
    const ctx = c.getContext("2d");
    const pos = sigGetPos(e, c);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  };
  const sigDraw = e => {
    e.preventDefault();
    if (!sigDrawing.current) return;
    const c = sigCanvasRef.current;
    const ctx = c.getContext("2d");
    const pos = sigGetPos(e, c);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#4A1A6B"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke();
    setSigPadEmpty(false);
  };
  const sigStopDraw = () => { sigDrawing.current = false; };
  const sigClear = () => {
    const c = sigCanvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setSigPadEmpty(true);
  };
  const sigSave = async () => {
    const dataUrl = sigCanvasRef.current.toDataURL("image/png");
    setSigSaving(true);
    try { await api.post("/api/supervisor/profile/signature", { signature_image: dataUrl }); } catch { }
    setSigSaving(false);
    setShowSigPrompt(false);
  };

  const handleLogout = () => {
    setSigningOut(true);
    setTimeout(() => { logout(); navigate("/staff/login"); }, 2200);
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setSeenNotifs(new Set(notifications.map(n => n.id)));
    try { await api.post("/api/notifications/read-all"); } catch { }
  };

  const goToApp = id => navigate(`/supervisor/review/${id}`);
  const navTo = id => { setPage(id); setSectionSearch(""); setDateFilter("all"); setSelectedOfficerId(null); };

  const counts       = data?.counts        || {};
  const all          = data?.all           || [];
  const escalated    = data?.escalated     || [];
  const pending      = data?.pending       || [];
  const resubmissions= data?.resubmissions || [];
  const completed    = data?.completed     || [];
  const officerStats = data?.officer_stats || [];

  const sectionCounts = {
    dashboard:     null,
    escalated:     escalated.length,
    pending:       pending.length,
    resubmissions: resubmissions.length,
    officers:      null,
    completed:     completed.length,
  };

  const badgeCls = {
    escalated:     styles.navBadgeRed,
    pending:       styles.navBadgeGrey,
    resubmissions: styles.navBadgeAmber,
    completed:     styles.navBadgeGreen,
  };

  const unreadCount = notifications.filter(n => n.is_read === false && !seenNotifs.has(n.id)).length;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const supervisorFirstName = user?.name?.split(" ")[0] || "Supervisor";

  const pageSubs = {
    dashboard:     now.toLocaleDateString("en-JM", { weekday: "long", day: "numeric", month: "long" }),
    escalated:     "Cases sent to you by officers — your decision is required",
    pending:       "All active cases currently being worked by officers",
    resubmissions: "You've asked applicants to resubmit — waiting on them",
    officers:      "Live caseload and capacity for officers in your collectorate",
    completed:     "Your approved and rejected cases",
  };

  const SECTION_HEADERS = {
    escalated:     { bg: "linear-gradient(120deg,#7f1d1d,#dc2626)", iconBg: "rgba(255,255,255,0.18)", Icon: AlertIcon,   title: "Escalated Cases",        desc: "Sent to you by officers — review the reason and make a decision" },
    pending:       { bg: "linear-gradient(120deg,#1e3a8a,#3b82f6)", iconBg: "rgba(255,255,255,0.18)", Icon: ClockIcon,   title: "Active Queue",           desc: "Cases currently being worked by officers in your collectorate" },
    resubmissions: { bg: "linear-gradient(120deg,#78350f,#d97706)", iconBg: "rgba(255,255,255,0.18)", Icon: RotateIcon,  title: "Awaiting Resubmission",  desc: "You've requested additional documents — waiting on the applicant" },
    officers:      { bg: "linear-gradient(120deg,#134e4a,#14b8a6)", iconBg: "rgba(255,255,255,0.18)", Icon: UsersIcon,   title: "My Officers",            desc: "Live caseload, capacity and performance for officers in your collectorate" },
    completed:     { bg: "linear-gradient(120deg,#14532d,#16a34a)", iconBg: "rgba(255,255,255,0.18)", Icon: CheckCircle, title: "Completed Cases",        desc: "Applications you have approved or rejected" },
  };

  const SectionHeader = ({ id, count }) => {
    const cfg = SECTION_HEADERS[id];
    if (!cfg) return null;
    return (
      <div className={styles.sectionHeader} style={{ background: cfg.bg }}>
        <div className={styles.sectionHeaderLeft}>
          <div className={styles.sectionHeaderIcon} style={{ background: cfg.iconBg }}>
            <cfg.Icon size={16} stroke="white" />
          </div>
          <div>
            <div className={styles.sectionHeaderTitle}>{cfg.title}</div>
            <div className={styles.sectionHeaderDesc}>{cfg.desc}</div>
          </div>
        </div>
        {count != null && (
          <span className={styles.sectionHeaderBadge}>{count}</span>
        )}
      </div>
    );
  };

  const EmptyState = ({ label }) => (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-6l-2 3H10l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      </div>
      <div className={styles.emptyStateText}>{label}</div>
    </div>
  );

  // section renderers
  const renderList = (items, showEscalation, emptyLabel, showView = false) => (
    items.length === 0
      ? <EmptyState label={emptyLabel} />
      : <div className={styles.appCardList}>{items.map(a => <AppCard key={a.id} app={a} showEscalation={showEscalation} onClick={goToApp} showView={showView} />)}</div>
  );

  const renderDashboard = () => (
    <div>
      {/* Greeting banner */}
      <div className={styles.greetingBanner}>
        <div className={styles.greetingLeft}>
          <div className={styles.greetingTime}>
            {now.toLocaleDateString("en-JM", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            &nbsp;·&nbsp;{user?.branch ? toTitleCase(user.branch) : "Supervisor Portal"}
          </div>
          <div className={styles.greetingText}>
            {greeting}, <span className={styles.greetingName}>{supervisorFirstName}</span>.
          </div>
          <div className={styles.greetingMeta}>
            {escalated.length === 0
              ? "No escalated cases — your queue is clear."
              : `${escalated.length} escalated ${escalated.length === 1 ? "case requires" : "cases require"} your attention.`}
          </div>
          {escalated.length > 0 && (
            <div className={styles.greetingAlert}>
              <span className={styles.greetingAlertChip} style={{ background: "rgba(239,68,68,0.22)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.28)", cursor: "pointer" }}
                onClick={() => navTo("escalated")}>
                <AlertIcon size={11} stroke="#fca5a5" />
                {escalated.length} escalated {escalated.length === 1 ? "case" : "cases"} →
              </span>
              {resubmissions.length > 0 && (
                <span className={styles.greetingAlertChip} style={{ background: "rgba(245,158,11,0.2)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.25)", cursor: "pointer" }}
                  onClick={() => navTo("resubmissions")}>
                  <RotateIcon size={11} stroke="#fcd34d" />
                  {resubmissions.length} awaiting resubmission →
                </span>
              )}
            </div>
          )}
        </div>
        <div className={styles.greetingRight}>
          <div className={styles.greetingCrest}>
            <img src={coatOfArms} alt="" style={{ width: 26, height: 26, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.85 }} />
          </div>
          <div className={styles.greetingQuickStats}>
            <div className={styles.greetingQuickStat}>
              <div className={styles.greetingQuickStatVal}>{all.length}</div>
              <div className={styles.greetingQuickStatLabel}>Total</div>
            </div>
            <div className={styles.greetingQuickStat}>
              <div className={styles.greetingQuickStatVal}>{counts.approved || 0}</div>
              <div className={styles.greetingQuickStatLabel}>Approved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        {[
          { label: "Escalated Cases",  val: escalated.length,     grad: "linear-gradient(135deg,#7f1d1d,#dc2626)", Icon: AlertIcon,   sid: "escalated",     desc: "Sent by officers — awaiting your decision" },
          { label: "Resubmissions",    val: resubmissions.length, grad: "linear-gradient(135deg,#78350f,#d97706)", Icon: RotateIcon,  sid: "resubmissions", desc: "Applicants asked to upload missing documents" },
          { label: "Active in Queue",  val: pending.length,       grad: "linear-gradient(135deg,#1e3a8a,#3b82f6)", Icon: ClockIcon,   sid: "pending",       desc: "Cases being worked by officers right now" },
          { label: "Total Approved",   val: counts.approved || 0, grad: "linear-gradient(135deg,#14532d,#16a34a)", Icon: CheckCircle, sid: "completed",     desc: "Licences issued since you joined this branch" },
        ].map(({ label, val, grad, Icon, sid, desc }) => (
          <div key={label} className={styles.statCard} onClick={() => navTo(sid)}>
            <div className={styles.statCardInner} style={{ background: grad }}>
              <div style={{ flex: 1 }}>
                <div className={styles.statCardLabel}>{label}</div>
                <div className={styles.statCardValue}>{val}</div>
                <div className={styles.statCardDesc}>{desc}</div>
              </div>
              <div className={styles.statCardIcon}><Icon size={18} stroke="white" /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className={styles.secondaryRow}>
        {[
          { label: "All Applications",  val: all.length,           style: { color: "#111827" }, onClick: () => navTo("all") },
          { label: "Rejected",          val: counts.rejected || 0, style: { color: "#b91c1c" }, onClick: () => navTo("completed") },
          { label: "Officer Count",     val: officerStats.length,  style: { color: "#6d28d9" }, onClick: () => navTo("officers") },
        ].map(({ label, val, style: s, onClick }) => (
          <div key={label} className={styles.secondaryCard} onClick={onClick} style={{ cursor: "pointer" }}>
            <span className={styles.secondaryLabel}>{label}</span>
            <span className={styles.secondaryValue} style={s}>{val}</span>
          </div>
        ))}
      </div>

      {/* Needs Attention */}
      {(escalated.length > 0 || resubmissions.length > 0) && (
        <div className={styles.attentionCard}>
          <div className={styles.attentionCardHeader}>
            <div>
              <p className={styles.attentionCardTitle}>Needs Attention</p>
              <p className={styles.attentionCardSub}>Your most urgent cases</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {escalated.length > 0 && (
                <span className={styles.attentionCount}>{Math.min(escalated.length, 5)} of {escalated.length}</span>
              )}
              {escalated.length > 5 && (
                <button className={styles.attentionCardViewAll} onClick={() => navTo("escalated")}>
                  View all <ChevRight size={11} />
                </button>
              )}
            </div>
          </div>

          <div className={styles.attentionCardList}>
            {escalated.slice(0, 5).map(app => {
              const txBg    = TX_COLOR[app.transaction_type]?.bg    || "#f1f5f9";
              const txColor = TX_COLOR[app.transaction_type]?.color || "#374151";
              const txLabel = { RENEWAL: "Renewal", REPLACEMENT: "Replacement", AMENDMENT: "Amendment" }[app.transaction_type] || app.transaction_type;
              const initials = (app.applicant_name || "?").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
              const daysAgoN = app.submitted_at
                ? Math.max(0, Math.floor((Date.now() - new Date(app.submitted_at.endsWith("Z") ? app.submitted_at : app.submitted_at + "Z")) / 86400000))
                : null;
              const urgencyBorder = daysAgoN > 5 ? "#ef4444" : daysAgoN > 2 ? "#f59e0b" : "#e2e8f0";
              return (
                <div key={app.id} className={styles.attentionAppRow}
                  style={{ borderLeftColor: urgencyBorder, cursor: "pointer" }}
                  onClick={() => goToApp(app.id)}>
                  <div className={styles.attentionAvatar} style={{ background: txBg, color: txColor }}>{initials}</div>
                  <div className={styles.attentionAppInfo}>
                    <p className={styles.attentionAppName}>{app.applicant_name || "—"}</p>
                    <p className={styles.attentionAppRef}>{app.application_number}</p>
                  </div>
                  <div className={styles.attentionAppMeta}>
                    <span className={styles.attentionTxBadge} style={{ background: txBg, color: txColor }}>{txLabel}</span>
                    <span className={styles.attentionStatusPill} style={{ background: "#fce7f3", color: "#be185d" }}>Escalated</span>
                    <span className={`${styles.attentionAge} ${daysAgoN > 3 ? styles.attentionAgeOverdue : styles.attentionAgeNormal}`}>
                      {daysAgoN === 0 ? "Today" : `${daysAgoN}d ago`}
                    </span>
                    <button className={styles.attentionReviewBtn}>
                      Review <ChevRight size={11} />
                    </button>
                  </div>
                </div>
              );
            })}

            {resubmissions.length > 0 && (
              <div className={styles.attentionRow} onClick={() => navTo("resubmissions")} style={{ cursor: "pointer" }}>
                <div className={styles.attentionRowIcon} style={{ background: "#fef3c7" }}>
                  <RotateIcon size={14} stroke="#b45309" />
                </div>
                <div className={styles.attentionRowBody}>
                  <div className={styles.attentionRowLabel}>{resubmissions.length} awaiting resubmission</div>
                  <div className={styles.attentionRowDesc}>Applicants haven't uploaded yet</div>
                </div>
                <ChevRight size={13} stroke="#9ca3af" />
              </div>
            )}
            {officerStats.filter(o => o.active >= 7).length > 0 && (
              <div className={styles.attentionRow} onClick={() => navTo("officers")} style={{ cursor: "pointer" }}>
                <div className={styles.attentionRowIcon} style={{ background: "#ede9fe" }}>
                  <UsersIcon size={14} stroke="#7c3aed" />
                </div>
                <div className={styles.attentionRowBody}>
                  <div className={styles.attentionRowLabel}>{officerStats.filter(o => o.active >= 7).length} officer{officerStats.filter(o => o.active >= 7).length !== 1 ? "s" : ""} near capacity</div>
                  <div className={styles.attentionRowDesc}>7+ active cases — may need redistribution</div>
                </div>
                <ChevRight size={13} stroke="#9ca3af" />
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );

  const OFFICER_CAPACITY_LIMIT = 8;

  const CapacityBar = ({ active }) => {
    const pct = Math.min((active / OFFICER_CAPACITY_LIMIT) * 100, 100);
    const color = pct >= 90 ? "#dc2626" : pct >= 65 ? "#d97706" : "#16a34a";
    return (
      <div className={styles.capacityWrap}>
        <div className={styles.capacityBar}>
          <div className={styles.capacityFill} style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className={styles.capacityLabel} style={{ color }}>{active}/{OFFICER_CAPACITY_LIMIT}</span>
      </div>
    );
  };

  const renderOfficers = () => {
    const selectedOfficer = selectedOfficerId
      ? officerStats.find(o => o.officer_id === selectedOfficerId)
      : null;

    const officerApps = selectedOfficerId
      ? all.filter(a => a.officer_name === selectedOfficer?.officer_name)
      : [];

    const filteredOfficerApps = applyDateFilter(officerApps, dateFilter);
    const offSearch = officerSearch.trim().toLowerCase();
    const filteredStats = officerStats.filter(o =>
      !offSearch || (o.officer_name || "").toLowerCase().includes(offSearch)
    );

    return (
      <div>
        {/* Officer overview table */}
        <SectionHeader id="officers" count={officerStats.length} />

        <div className={styles.sectionListCard} style={{ marginBottom: 20 }}>
          {/* Search bar */}
          <div className={styles.sectionFilterBar}>
            <div className={styles.sectionSearch}>
              <SearchIcon size={13} stroke="#9ca3af" />
              <input
                className={styles.sectionSearchInput}
                value={officerSearch}
                onChange={e => setOfficerSearch(e.target.value)}
                placeholder="Search officers by name…"
              />
              {officerSearch && (
                <button className={styles.sectionSearchClear} onClick={() => setOfficerSearch("")}>
                  <XCircleIcon size={13} stroke="#9ca3af" />
                </button>
              )}
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>{["Officer","Branch","Capacity","Escalated","Waiting","Approved (7d)",""].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filteredStats.length === 0
                  ? <tr><td className={styles.td} colSpan={7} style={{ textAlign: "center", color: "#9ca3af", padding: "28px 16px" }}>
                      {officerSearch ? "No officers match your search" : "No officers assigned to this collectorate"}
                    </td></tr>
                  : filteredStats.map(o => (
                    <tr key={o.officer_id} className={`${styles.tableRow} ${selectedOfficerId === o.officer_id ? styles.tableRowSelected : ""}`}>
                      <td className={styles.td}>
                        <div className={styles.officerCell}>
                          <div className={styles.officerAvatar}>{o.officer_name?.split(" ").map(w => w[0]).join("").slice(0,2) || "O"}</div>
                          <div>
                            <div className={styles.officerName}>{o.officer_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className={styles.td} style={{ fontSize: 11, color: "#6b7280" }}>{o.branch || "—"}</td>
                      <td className={styles.td}><CapacityBar active={o.active} /></td>
                      <td className={styles.td}>
                        {o.escalated > 0
                          ? <span className={`${styles.countBadge} ${styles.pillRed}`}><AlertIcon size={11} stroke="#b91c1c" /> {o.escalated}</span>
                          : <span style={{ color: "#d1d5db" }}>—</span>}
                      </td>
                      <td className={styles.td}>
                        {o.waiting > 0
                          ? <span className={`${styles.countBadge} ${styles.pillAmber}`}><RotateIcon size={11} stroke="#b45309" /> {o.waiting}</span>
                          : <span style={{ color: "#d1d5db" }}>—</span>}
                      </td>
                      <td className={styles.td}>
                        {o.approved_7d > 0
                          ? <span className={`${styles.countBadge} ${styles.pillGreen}`}><CheckCircle size={11} stroke="#15803d" /> {o.approved_7d}</span>
                          : <span style={{ color: "#d1d5db" }}>—</span>}
                      </td>
                      <td className={styles.td}>
                        <button
                          className={styles.officerViewBtn}
                          onClick={() => setSelectedOfficerId(selectedOfficerId === o.officer_id ? null : o.officer_id)}>
                          {selectedOfficerId === o.officer_id ? "Hide" : "View cases"}
                        </button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-officer applications drill-down */}
        {selectedOfficer && (
          <div style={{ marginBottom: 20 }}>
            <div className={styles.sectionHeader} style={{ background: "linear-gradient(120deg,#1e0533,#4A1A6B)" }}>
              <div className={styles.sectionHeaderLeft}>
                <div className={styles.sectionHeaderIcon} style={{ background: "rgba(255,255,255,0.15)" }}>
                  <UsersIcon size={16} stroke="white" />
                </div>
                <div>
                  <div className={styles.sectionHeaderTitle}>{selectedOfficer.officer_name} — Cases</div>
                  <div className={styles.sectionHeaderDesc}>All applications currently or previously handled by this officer</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={styles.sectionHeaderBadge}>{officerApps.length}</span>
                <button
                  onClick={() => setSelectedOfficerId(null)}
                  style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", color: "white", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Close ✕
                </button>
              </div>
            </div>

            <div className={styles.sectionListCard}>
              <div className={styles.sectionFilterBar}>
                <div className={styles.sectionSearch}>
                  <SearchIcon size={13} stroke="#9ca3af" />
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Showing cases for {selectedOfficer.officer_name}</span>
                </div>
                <div className={styles.sectionFilterPills}>
                  {DATE_FILTER_OPTIONS.map(opt => (
                    <button key={opt.id}
                      className={`${styles.filterPill} ${dateFilter === opt.id ? styles.filterPillActiveDate : ""}`}
                      onClick={() => setDateFilter(opt.id)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.sectionListBody}>
                {filteredOfficerApps.length === 0
                  ? <EmptyState label={dateFilter !== "all" ? "No cases in this period" : "No cases found for this officer"} />
                  : <div className={styles.appCardList}>
                      {filteredOfficerApps.map(a => (
                        <AppCard key={a.id} app={a}
                          showEscalation={a.status === "ESCALATED" || a.status === "PENDING_SUPERVISOR_APPROVAL"}
                          onClick={goToApp} />
                      ))}
                    </div>
                }
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const TX_FILTER_OPTIONS = ["All", "RENEWAL", "REPLACEMENT", "AMENDMENT"];

  const renderWrappedList = (id, items, showEscalation, emptyLabel, showView = false) => {
    const q = sectionSearch.trim().toLowerCase();
    const txFilter    = data?.[`_txFilter_${id}`] || "All";
    const setTxFilter = v => setData(prev => ({ ...prev, [`_txFilter_${id}`]: v }));

    let filtered = applyDateFilter(items, dateFilter);
    if (txFilter !== "All") filtered = filtered.filter(a => a.transaction_type === txFilter);
    if (q) filtered = filtered.filter(a =>
      (a.applicant_name || "").toLowerCase().includes(q) ||
      (a.application_number || "").toLowerCase().includes(q) ||
      (a.trn || "").toLowerCase().includes(q) ||
      (a.officer_name || "").toLowerCase().includes(q)
    );

    const hasFilter = txFilter !== "All" || !!q || dateFilter !== "all";
    const dateLabel = DATE_FILTER_OPTIONS.find(o => o.id === dateFilter)?.label || "";

    return (
      <div>
        <SectionHeader id={id} count={items.length > 0 ? items.length : null} />

        <div className={styles.sectionListCard}>
          <div className={styles.sectionFilterBar}>
            <div className={styles.sectionSearch}>
              <SearchIcon size={13} stroke="#9ca3af" />
              <input
                className={styles.sectionSearchInput}
                value={sectionSearch}
                onChange={e => setSectionSearch(e.target.value)}
                placeholder="Search by name, TRN, reference or officer…"
              />
              {sectionSearch && (
                <button className={styles.sectionSearchClear} onClick={() => setSectionSearch("")}>
                  <XCircleIcon size={13} stroke="#9ca3af" />
                </button>
              )}
            </div>
          </div>
          <div className={styles.sectionFilterPillsRow}>
            <div className={styles.sectionFilterPills}>
              {TX_FILTER_OPTIONS.map(opt => (
                <button key={opt}
                  className={`${styles.filterPill} ${txFilter === opt ? styles.filterPillActive : ""}`}
                  onClick={() => setTxFilter(opt)}>
                  {opt === "All" ? "All types" : opt.charAt(0) + opt.slice(1).toLowerCase()}
                </button>
              ))}
              <div className={styles.filterDivider} />
              {DATE_FILTER_OPTIONS.map(opt => (
                <button key={opt.id}
                  className={`${styles.filterPill} ${dateFilter === opt.id ? styles.filterPillActiveDate : ""}`}
                  onClick={() => setDateFilter(opt.id)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {hasFilter && (
            <div className={styles.sectionSearchMeta}>
              {filtered.length} of {items.length} {filtered.length === 1 ? "result" : "results"}
              {txFilter !== "All" && <> · {txFilter.toLowerCase()}</>}
              {dateFilter !== "all" && <> · {dateLabel}</>}
              {q && <> · "{sectionSearch}"</>}
              <button className={styles.clearFiltersBtn} onClick={() => { setSectionSearch(""); setTxFilter("All"); setDateFilter("all"); }}>
                Clear all
              </button>
            </div>
          )}
          <div className={styles.sectionListBody}>
            {renderList(filtered, showEscalation, hasFilter ? "No results match your filters" : emptyLabel, showView)}
          </div>
        </div>
      </div>
    );
  };

  const renderSection = () => {
    switch (page) {
      case "escalated":     return renderWrappedList("escalated",     escalated,     true,  "No escalated cases — your queue is clear");
      case "resubmissions": return renderWrappedList("resubmissions", resubmissions, false, "No resubmissions outstanding");
      case "pending":       return renderWrappedList("pending",       pending,       false, "No active applications in the queue");
      case "all":           return renderWrappedList("all",           all,           false, "No applications found");
      case "officers":      return renderOfficers();
      case "completed":     return renderWrappedList("completed",     completed,     false, "No completed applications yet", true);
      default:              return renderDashboard();
    }
  };

  return (
    <div className={styles.root}>

      {/* Signature prompt modal */}
      {showSigPrompt && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, maxWidth: 460, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 4 }}>Add Your Signature</p>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, lineHeight: 1.5 }}>
              No signature is on file for your account. Draw your signature below — it will be saved and used when confirming decisions.
            </p>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <canvas ref={sigCanvasRef} width={420} height={110}
                style={{ width: "100%", height: 110, border: "1.5px solid #cbd5e1", borderRadius: 10, background: "#fafbff", cursor: "crosshair", display: "block", touchAction: "none" }}
                onMouseDown={sigStartDraw} onMouseMove={sigDraw} onMouseUp={sigStopDraw} onMouseLeave={sigStopDraw}
                onTouchStart={sigStartDraw} onTouchMove={sigDraw} onTouchEnd={sigStopDraw}
              />
              {sigPadEmpty && (
                <p style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 12, color: "#cbd5e1", pointerEvents: "none" }}>
                  Draw your signature here
                </p>
              )}
              {!sigPadEmpty && (
                <button onClick={sigClear}
                  style={{ position: "absolute", top: 6, right: 6, background: "white", border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 10, color: "#6b7280", fontFamily: "inherit" }}>
                  Clear
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowSigPrompt(false)}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                Skip for now
              </button>
              <button onClick={sigSave} disabled={sigPadEmpty || sigSaving}
                style={{ flex: 2, padding: 10, borderRadius: 8, border: "none", background: sigPadEmpty ? "#e2e8f0" : "#4A1A6B", color: "white", fontSize: 13, fontWeight: 700, cursor: sigPadEmpty ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {sigSaving ? "Saving…" : "Save Signature"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign-out overlay */}
      {signingOut && (
        <div className={styles.signOutOverlay}>
          <div className={styles.signOutCard}>
            <div className={styles.signOutScanLine} />
            <div className={styles.signOutSpinnerWrap}>
              <svg width="88" height="88" viewBox="0 0 88 88" className={styles.signOutRingOuter}>
                <circle cx="44" cy="44" r="40" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeDasharray="62 190" strokeLinecap="round" />
              </svg>
              <svg width="88" height="88" viewBox="0 0 88 88" className={styles.signOutRingInner}>
                <circle cx="44" cy="44" r="30" fill="none" stroke="rgba(124,58,237,0.2)" strokeWidth="1.5" strokeDasharray="22 166" strokeLinecap="round" />
              </svg>
              <div className={styles.signOutCrest}>
                <ShieldIcon size={26} stroke="white" sw={2} />
              </div>
            </div>
            <p className={styles.signOutTitle}>Signing Out</p>
            <p className={styles.signOutSub}>Closing your session securely<br />and clearing credentials…</p>
            <div className={styles.signOutProgress}><div className={styles.signOutBar} /></div>
            <div className={styles.signOutFooter}>
              <ShieldIcon size={11} stroke="#94a3b8" />
              <span className={styles.signOutFooterText}>SECURED · TAX ADMINISTRATION JAMAICA</span>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : styles.expanded}`}>
        <div className={`${styles.sidebarHeader} ${collapsed ? styles.collapsed : styles.expanded}`}>
          {!collapsed && (
            <div className={styles.logoText}>
              <div className={styles.logoMark}>
                <img src={coatOfArms} alt="Coat of Arms" style={{ width: 20, height: 20, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.92 }} />
              </div>
              <div>
                <p className={styles.logoTitle}>DLRSJAM</p>
                <p className={styles.logoSub}>Supervisor Portal</p>
              </div>
            </div>
          )}
          {collapsed && (
            <img src={coatOfArms} alt="Coat of Arms" style={{ width: 22, height: 22, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.7 }} />
          )}
          <button className={styles.collapseBtn} onClick={() => setCollapsed(v => !v)}>
            {collapsed ? <ChevRight size={14} /> : <ChevLeft size={14} />}
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item, idx) => {
            const active = page === item.id;
            const count  = sectionCounts[item.id];
            const showGroupLabel = !collapsed && item.group && (idx === 0 || NAV_ITEMS[idx - 1].group !== item.group);
            return (
              <span key={item.id}>
                {showGroupLabel && (
                  <div className={styles.navSectionLabel}>{item.group}</div>
                )}
                <button
                  className={`${styles.navBtn} ${collapsed ? styles.collapsed : styles.expanded} ${active ? styles.active : ""}`}
                  onClick={() => navTo(item.id)}
                  title={collapsed ? item.label : undefined}>
                  <span className={styles.navBtnInner}>
                    <item.Icon size={15} stroke="currentColor" />
                    {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                  </span>
                  {!collapsed && count != null && count > 0 && (
                    <span className={`${styles.navBadge} ${badgeCls[item.id] || styles.navBadgeGrey}`}>{count}</span>
                  )}
                  {collapsed && count != null && count > 0 && <span className={styles.navDot} />}
                </button>
              </span>
            );
          })}
        </nav>

        <div className={`${styles.sidebarFooter} ${collapsed ? styles.collapsed : ""}`}>
          <RefreshIcon size={12} stroke={refreshing ? "#c4b5fd" : "rgba(255,255,255,0.2)"} className={refreshing ? styles.spinner : ""} />
          {!collapsed && (
            <span className={styles.refreshTime}>
              {refreshing ? "Refreshing…" : lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className={styles.main}>
        <div className={styles.topbar}>
          <div>
            <p className={styles.pageTitle}>{PAGE_META[page]}</p>
            <p className={styles.pageSub}>{pageSubs[page]}</p>
          </div>
          <div className={styles.topbarRight}>
            {/* Notifications */}
            <div ref={notifRef} className={styles.dropdownWrap}>
              <button
                className={`${styles.iconBtn} ${notifOpen ? styles.notifOpen : ""}`}
                onClick={() => setNotifOpen(v => !v)}
              >
                <BellIcon size={17} stroke={notifOpen ? "#7c3aed" : "#6b7280"} />
                {unreadCount > 0 && <span className={styles.notifDot} />}
              </button>
              {notifOpen && (
                <div className={`${styles.dropdown} ${styles.notif}`}>
                  <div className={styles.dropdownHeader}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span className={styles.dropdownTitle}>Activity</span>
                      {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
                    </div>
                    {unreadCount > 0 && <button className={styles.markReadBtn} onClick={markAllRead}>Mark all read</button>}
                  </div>
                  <div className={styles.dropdownScroll}>
                    {notifications.length === 0
                      ? <div className={styles.notifEmpty}>No notifications</div>
                      : [...notifications].reverse().map(n => (
                        <div key={n.id} className={`${styles.notifItem} ${!n.is_read && !seenNotifs.has(n.id) ? styles.notifItemUnread : ""}`}>
                          <div className={styles.notifItemTitle}>{n.title || n.event_type}</div>
                          <div className={styles.notifItemMsg}>{n.message}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Manual refresh */}
            <button className={styles.iconBtn} onClick={() => fetchData(true)} title="Refresh">
              <RefreshIcon size={16} stroke={refreshing ? "#7c3aed" : "#9ca3af"} className={refreshing ? styles.spinner : ""} />
            </button>

            <div className={styles.topbarDivider} />

            {/* Profile dropdown */}
            <ProfileDropdown user={user} onLogout={handleLogout} />
          </div>
        </div>

        <div className={styles.content}>
          {loading
            ? <div className={styles.loadingCenter}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" className={styles.spinner}>
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                <span className={styles.loadingText}>Loading…</span>
              </div>
            : renderSection()
          }
        </div>
      </div>
    </div>
  );
}

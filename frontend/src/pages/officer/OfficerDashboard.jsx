// Officer portal shell — collapsible sidebar, topbar with notifications, and all queue sections. Also handles the sign-out overlay and signature prompt on first login.
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import styles from "./OfficerDashboard.module.css";
import coatOfArms from "../../assets/coat-of-arms.png";

import NotifList          from "../../components/officer/NotifList";
import ProfileDropdown    from "../../components/officer/ProfileDropdown";
import OverviewPage       from "../../components/officer/OverviewPage";
import QueuePage          from "../../components/officer/QueuePage";
import ChangePasswordModal from "../../components/officer/ChangePasswordModal";

const Ico = ({ d, size = 16, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const GridIcon    = p => <Ico {...p} d={["M3 3h7v7H3z","M14 3h7v7h-7z","M14 14h7v7h-7z","M3 14h7v7H3z"]} />;
const InboxIcon   = p => <Ico {...p} d={["M22 12h-6l-2 3H10l-2-3H2","M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"]} />;
const RotateIcon  = p => <Ico {...p} d={["M1 4v6h6","M3.51 15a9 9 0 1 0 .49-4.5"]} />;
const ArrowUpIcon = p => <Ico {...p} d="M12 19V5M5 12l7-7 7 7" />;
const CheckIcon   = p => <Ico {...p} sw={2.5} d="M5 12l5 5L20 7" />;
const BellIcon    = p => <Ico {...p} d={["M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 0 1-3.46 0"]} />;
const RefreshIcon = p => <Ico {...p} d={["M23 4v6h-6","M1 20v-6h6","M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"]} />;
const BookIcon    = p => <Ico {...p} d={["M4 19.5A2.5 2.5 0 0 1 6.5 17H20","M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"]} />;
const HelpIcon    = p => <Ico {...p} d={["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3","M12 17h.01"]} />;
const ChevRight   = p => <Ico {...p} d="M9 18l6-6-6-6" />;
const ChevLeft    = p => <Ico {...p} d="M15 18l-6-6 6-6" />;

const ShieldIcon  = p => <Ico {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;

const NAV_ITEMS = [
  { id: "overview",    label: "Overview",            Icon: GridIcon    },
  { id: "active",      label: "Active Reviews",       Icon: InboxIcon   },
  { id: "pending_ita", label: "Pending ITA",          Icon: ShieldIcon  },
  { id: "waiting",     label: "Waiting on Applicant", Icon: RotateIcon  },
  { id: "escalated",   label: "Escalated",             Icon: ArrowUpIcon },
  { id: "approved",    label: "Approved by Me",        Icon: CheckIcon   },
];

const PAGE_META = {
  overview: "Overview", active: "Active Reviews", pending_ita: "Pending ITA",
  waiting: "Waiting on Applicant", escalated: "Escalated", approved: "Approved by Me",
};

export default function OfficerDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();

  const [page,        setPage]        = useState(() => searchParams.get("page") || "overview");
  const [txFilter,    setTxFilter]    = useState("All");
  const [search,      setSearch]      = useState("");
  const [apprRange,   setApprRange]   = useState("7d");
  const [collapsed,   setCollapsed]   = useState(false);
  const [allApps,     setAllApps]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [seenNotifs,   setSeenNotifs]   = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [showChangePw,     setShowChangePw]     = useState(false);
  const [signingOut,       setSigningOut]       = useState(false);
  const [showSigPrompt,    setShowSigPrompt]    = useState(false);
  const [sigPadEmpty,      setSigPadEmpty]      = useState(true);
  const [sigSaving,        setSigSaving]        = useState(false);
  const sigCanvasRef = useRef(null);
  const sigDrawing   = useRef(false);
  const notifRef     = useRef(null);

  const now      = new Date();
  const pageSubs = {
    overview:    now.toLocaleDateString("en-JM", { weekday: "long", day: "numeric", month: "long" }),
    active:      "Your active cases",
    pending_ita: "Awaiting ITA traffic clearance",
    waiting:     "Pending resubmissions",
    escalated:   "Under supervisor review",
    approved:    "Your approved applications",
  };

  useEffect(() => {
    const h = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [queueRes, notifRes] = await Promise.all([
        api.get("/api/officer/queue"),
        api.get("/api/notifications/"),
      ]);
      setAllApps(queueRes.data.applications || []);
      setNotifications(notifRes.data.notifications || []);
      setLastRefresh(new Date());
    } catch { }
    finally {
      setLoading(false);
      if (manual) setTimeout(() => setRefreshing(false), 700);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(() => fetchData(), 30000);
    return () => clearInterval(t);
  }, [fetchData]);

  useEffect(() => {
    const p = searchParams.get("page");
    if (p) setPage(p);
  }, [searchParams]);

  // Prompt officer to add signature if none on file
  useEffect(() => {
    api.get("/api/officer/profile/signature")
      .then(res => { if (!res.data.signature_image) setShowSigPrompt(true); })
      .catch(() => {});
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
    ctx.strokeStyle = "#1e3a8a"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
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
    try {
      await api.post("/api/officer/profile/signature", { signature_image: dataUrl });
    } catch { }
    setSigSaving(false);
    setShowSigPrompt(false);
  };

  const activeStates  = ["SUBMITTED", "UNDER_REVIEW", "ACTION_REQUIRED", "RESUBMITTED"];
  const waitingStates = ["WAITING_ON_APPLICANT"];

  const applyFilters = apps => {
    let list = [...apps];
    if (txFilter !== "All") list = list.filter(a => a.transaction_type === txFilter.toUpperCase());
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.application_number?.toLowerCase().includes(q) ||
        a.applicant_name?.toLowerCase().includes(q) ||
        a.trn?.includes(q)
      );
    }
    return list;
  };

  const cutoffMs = { "7d": Date.now() - 7*86400000, "30d": Date.now() - 30*86400000, "all": 0 };

  const apps = {
    active:      applyFilters(allApps.filter(a => activeStates.includes(a.status))),
    pending_ita: applyFilters(allApps.filter(a => a.status === "PENDING_ITA")),
    waiting:     applyFilters(allApps.filter(a => waitingStates.includes(a.status))),
    escalated:   applyFilters(allApps.filter(a => a.status === "ESCALATED")),
    approved:    applyFilters(allApps.filter(a =>
      a.status === "APPROVED" &&
      new Date(a.submitted_at || a.created_at).getTime() >= cutoffMs[apprRange]
    )),
  };

  const counts = {
    overview:    0,
    active:      apps.active.length,
    pending_ita: apps.pending_ita.length,
    waiting:     apps.waiting.length,
    escalated:   apps.escalated.length,
    approved:    apps.approved.length,
  };

  const unreadCount = notifications.filter(n => n.is_read === false && !seenNotifs.has(n.id)).length;

  const handleOpenApp = async app => {
    if (app.status === "SUBMITTED" || app.status === "RESUBMITTED") {
      try { await api.post(`/api/officer/applications/${app.id}/start-review`); } catch { }
    }
    navigate(`/officer/review/${app.id}`);
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

  const markOneRead = async (notifId) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    try { await api.post(`/api/notifications/${notifId}/read`); } catch { }
  };

  const STATS = [
    { label: "Active Reviews", val: apps.active.length,      Icon: InboxIcon,   page: "active",      activeColor: "#2563eb", activeBg: "#eff6ff", activeBorder: "#bfdbfe" },
    { label: "Pending ITA",    val: apps.pending_ita.length, Icon: ShieldIcon,  page: "pending_ita", activeColor: "#7c3aed", activeBg: "#f5f3ff", activeBorder: "#ddd6fe" },
    { label: "Waiting",        val: apps.waiting.length,     Icon: RotateIcon,  page: "waiting",     activeColor: "#ea580c", activeBg: "#fff7ed", activeBorder: "#fed7aa" },
    { label: "Escalated",      val: apps.escalated.length,   Icon: ArrowUpIcon, page: "escalated",   activeColor: "#be185d", activeBg: "#fdf4ff", activeBorder: "#f0abfc" },
    { label: "Approved",       val: apps.approved.length,    Icon: CheckIcon,   page: "approved",    activeColor: "#16a34a", activeBg: "#f0fdf4", activeBorder: "#bbf7d0" },
  ];

  return (
    <div className={styles.root}>

      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}

      {/* Signature prompt modal */}
      {showSigPrompt && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, maxWidth: 460, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 4 }}>Add Your Signature</p>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, lineHeight: 1.5 }}>
              No signature is on file for your account. Draw your signature below — it will be saved and reused when confirming decisions.
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
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                Skip for now
              </button>
              <button onClick={sigSave} disabled={sigPadEmpty || sigSaving}
                style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: sigPadEmpty ? "#e2e8f0" : "#1e3a8a", color: "white", fontSize: 13, fontWeight: 700, cursor: sigPadEmpty ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {sigSaving ? "Saving…" : "Save Signature"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign out overlay */}
      {signingOut && (
        <div className={styles.signOutOverlay}>
          <div className={styles.signOutCard}>
            <div className={styles.signOutScanLine} />
            <div className={styles.signOutSpinnerWrap}>
              <svg width="88" height="88" viewBox="0 0 88 88" className={styles.signOutRingOuter}>
                <circle cx="44" cy="44" r="40" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="62 190" strokeLinecap="round" />
              </svg>
              <svg width="88" height="88" viewBox="0 0 88 88" className={styles.signOutRingInner}>
                <circle cx="44" cy="44" r="30" fill="none" stroke="rgba(220,38,38,0.2)" strokeWidth="1.5" strokeDasharray="22 166" strokeLinecap="round" />
              </svg>
              <div className={styles.signOutCrest}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>
            </div>
            <p className={styles.signOutTitle}>Signing Out</p>
            <p className={styles.signOutSub}>Closing your session securely<br />and clearing credentials…</p>
            <div className={styles.signOutProgress}><div className={styles.signOutBar} /></div>
            <div className={styles.signOutFooter}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
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
                <img src={coatOfArms} alt="" style={{ width: "18px", height: "18px", objectFit: "contain" }} />
              </div>
              <div>
                <p className={styles.logoTitle}>DLRSJAM</p>
                <p className={styles.logoSub}>Officer Portal</p>
              </div>
            </div>
          )}
          <button className={styles.collapseBtn} onClick={() => setCollapsed(v => !v)}>
            {collapsed ? <ChevRight size={14} /> : <ChevLeft size={14} />}
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => {
            const active = page === item.id;
            const count  = counts[item.id];
            return (
              <button key={item.id}
                className={`${styles.navBtn} ${collapsed ? styles.collapsed : styles.expanded} ${active ? styles.active : ""}`}
                onClick={() => setPage(item.id)}
                title={collapsed ? item.label : undefined}>
                <span className={styles.navBtnInner}>
                  <item.Icon size={15} stroke="currentColor" />
                  {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                </span>
                {!collapsed && count > 0 && <span className={styles.navBadge}>{count}</span>}
                {collapsed  && count > 0 && <span className={styles.navDot} />}
              </button>
            );
          })}
          <div className={styles.navDivider} />
          {[{ label: "Policy Reference", Icon: BookIcon }, { label: "Help & Support", Icon: HelpIcon }].map(item => (
            <button key={item.label} disabled
              className={`${styles.navDisabled} ${collapsed ? styles.collapsed : styles.expanded}`}
              title={collapsed ? item.label : undefined}>
              <item.Icon size={15} stroke="currentColor" />
              {!collapsed && item.label}
            </button>
          ))}
        </nav>

        <div className={`${styles.sidebarFooter} ${collapsed ? styles.collapsed : ""}`}>
          <RefreshIcon size={12} stroke={refreshing ? "#2563eb" : "#d1d5db"} className={refreshing ? styles.spinner : ""} />
          {!collapsed && <span className={styles.refreshTime}>{refreshing ? "Refreshing…" : lastRefresh.toLocaleTimeString()}</span>}
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
            <div ref={notifRef} className={styles.dropdownWrap}>
              <button className={`${styles.iconBtn} ${notifOpen ? styles.notifOpen : ""}`}
                onClick={() => setNotifOpen(v => !v)}>
                <BellIcon size={17} stroke={notifOpen ? "#2563eb" : "#6b7280"} />
                {unreadCount > 0 && <span className={styles.notifDot} />}
              </button>
              {notifOpen && (
                <div className={`${styles.dropdown} ${styles.notif}`}>
                  <div className={styles.dropdownHeader}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <span className={styles.dropdownTitle}>Activity</span>
                      {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
                    </div>
                    {unreadCount > 0 && <button className={styles.markReadBtn} onClick={markAllRead}>Mark all read</button>}
                  </div>
                  <div className={styles.dropdownScroll}>
                    <NotifList notifications={notifications} seenNotifs={seenNotifs}
                      setSeenNotifs={setSeenNotifs} onNavigate={() => setNotifOpen(false)} onMarkRead={markOneRead} />
                  </div>
                </div>
              )}
            </div>
            <button className={styles.iconBtn} onClick={() => fetchData(true)} title="Refresh">
              <RefreshIcon size={16} stroke={refreshing ? "#2563eb" : "#9ca3af"} className={refreshing ? styles.spinner : ""} />
            </button>
            <div className={styles.topbarDivider} />
            <ProfileDropdown user={user} onLogout={handleLogout} onChangePassword={() => setShowChangePw(true)} />
          </div>
        </div>

        <div className={styles.content}>
          {loading && page !== "overview"
            ? <div className={styles.loadingCenter}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" className={styles.spinner}>
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                <span className={styles.loadingText}>Loading…</span>
              </div>
            : page === "overview"
              ? <OverviewPage
                  user={user} loading={loading} stats={STATS}
                  activeApps={apps.active}
                  notifications={notifications} unreadCount={unreadCount}
                  seenNotifs={seenNotifs} setSeenNotifs={setSeenNotifs}
                  markAllRead={markAllRead} markOneRead={markOneRead} setPage={setPage} onOpen={handleOpenApp}
                />
              : <QueuePage
                  page={page} apps={apps}
                  apprRange={apprRange} setApprRange={setApprRange}
                  search={search} setSearch={setSearch}
                  txFilter={txFilter} setTxFilter={setTxFilter}
                  onOpen={handleOpenApp}
                />
          }
        </div>
      </div>
    </div>
  );
}
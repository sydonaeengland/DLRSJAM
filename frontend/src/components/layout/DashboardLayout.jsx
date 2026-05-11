// Applicant dashboard shell — sticky header with nav links, notification bell, avatar dropdown, and the sign-out overlay animation.
import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import coatOfArms from "../../assets/coat-of-arms.png";
import { BRAND } from "../../config/theme";

const NOTIF_META = {
  APPLICATION_APPROVED:   { label: "Application approved",        color: "#15803d", bg: "#dcfce7" },
  APPLICATION_REJECTED:   { label: "Application rejected",        color: "#b91c1c", bg: "#fee2e2" },
  RESUBMISSION_REQUESTED: { label: "Action required",             color: "#b91c1c", bg: "#fee2e2" },
  APPLICATION_ESCALATED:  { label: "Application under review",    color: "#be185d", bg: "#fce7f3" },
};

function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso.endsWith("Z") ? iso : iso + "Z")) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-JM", { day: "numeric", month: "short" });
}

export default function DashboardLayout({ children }) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#f5f6f8" }}>
      <DashboardHeader />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}

function DashboardHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [signingOut,    setSigningOut]    = useState(false);
  const ref      = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current      && !ref.current.contains(e.target))      setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target))  setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await api.get("/api/notifications/applicant");
      setNotifications(res.data.notifications || []);
    } catch { }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30000);
    return () => clearInterval(t);
  }, [fetchNotifs]);

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try { await api.post("/api/notifications/applicant/read-all"); } catch { }
  };

  const markOneRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try { await api.post(`/api/notifications/applicant/${id}/read`); } catch { }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleLogout = () => {
    setSigningOut(true);
    setDropdownOpen(false);
    setTimeout(() => { logout(); navigate("/login"); }, 1800);
  };
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const navLinks = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "My Applications", path: "/applications" },
  ];

  return (
    <>
    {signingOut && (
      <div style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(0,15,40,0.85)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "dlrs-fadeIn 0.25s ease forwards",
      }}>
        <style>{`
          @keyframes dlrs-fadeIn { from { opacity:0 } to { opacity:1 } }
          @keyframes dlrs-fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
          @keyframes dlrs-spin   { to { transform:rotate(360deg) } }
          @keyframes dlrs-spinR  { to { transform:rotate(-360deg) } }
          @keyframes dlrs-bar    { 0%{width:0%;margin-left:0%} 50%{width:65%;margin-left:10%} 100%{width:0%;margin-left:100%} }
          @keyframes dlrs-scan   { 0%{top:0%} 100%{top:100%} }
        `}</style>
        <div style={{
          background: "white", borderRadius: 24, padding: "48px 52px",
          textAlign: "center", boxShadow: "0 40px 100px rgba(0,0,0,0.4)",
          maxWidth: 360, width: "90%", position: "relative", overflow: "hidden",
          animation: "dlrs-fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) forwards",
        }}>
          {/* scan line */}
          <div style={{
            position: "absolute", left: 0, right: 0, height: 2,
            background: "linear-gradient(90deg, transparent, rgba(37,99,235,0.5), transparent)",
            animation: "dlrs-scan 1.2s ease-in-out infinite", zIndex: 1,
          }} />

          {/* spinning rings */}
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
            <svg width="96" height="96" style={{ position: "absolute", animation: "dlrs-spin 1.8s linear infinite" }}>
              <circle cx="48" cy="48" r="44" fill="none" stroke="#bfdbfe" strokeWidth="2.5" strokeDasharray="60 220" strokeLinecap="round"/>
            </svg>
            <svg width="72" height="72" style={{ position: "absolute", animation: "dlrs-spinR 2.6s linear infinite" }}>
              <circle cx="36" cy="36" r="32" fill="none" stroke="#93c5fd" strokeWidth="2" strokeDasharray="40 160" strokeLinecap="round"/>
            </svg>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 28px rgba(37,99,235,0.4)",
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
          </div>

          <p style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "0 0 8px", letterSpacing: "-0.3px" }}>Signing out</p>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 32px", lineHeight: 1.65 }}>
            Your session is being ended securely.
          </p>

          {/* progress bar */}
          <div style={{ height: 3, background: "#f1f5f9", borderRadius: 999, overflow: "hidden", marginBottom: 28 }}>
            <div style={{ height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #1e3a5f, #3b82f6)", animation: "dlrs-bar 1.4s ease-in-out infinite" }} />
          </div>

          <div style={{ paddingTop: 20, borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            <img src={coatOfArms} alt="" style={{ width: 16, height: 16, objectFit: "contain", opacity: 0.4 }} />
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.05em" }}>DLRSJAM PORTAL</span>
          </div>
        </div>
      </div>
    )}
    <header style={{
      background: "white",
      position: "sticky", top: 0, zIndex: 40,
      boxShadow: "0 1px 0 #e9e8e7",
    }}>
      <div style={{
        maxWidth: "1400px", margin: "0 auto", padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px",
      }}>

        {/* Logo */}
        <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", flexShrink: 0 }}>
          <img src={coatOfArms} alt="" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#1b1c1c", letterSpacing: "-0.3px", lineHeight: 1 }}>
              DLRSJAM
            </div>
            <div style={{ fontSize: "9px", fontWeight: "600", color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1 }}>
              Driver's Licence Renewal System
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  padding: "6px 16px",
                  fontSize: "14px",
                  fontWeight: isActive ? "600" : "400",
                  color: isActive ? BRAND.primary : "#6b7280",
                  textDecoration: "none",
                  borderBottom: isActive ? `2px solid ${BRAND.primary}` : "2px solid transparent",
                  lineHeight: "28px",
                  transition: "color 0.15s",
                }}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={() => navigate("/apply")}
            style={{
              marginLeft: "12px",
              padding: "8px 18px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              background: BRAND.primary,
              color: "white",
              border: "none",
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Application
          </button>
        </nav>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>

          {/* Notification bell */}
          <div style={{ position: "relative" }} ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(v => !v); if (!notifOpen) markAllRead(); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                width: "36px", height: "36px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#6b7280", position: "relative",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f5f6f8"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: 4, right: 4,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#dc2626", border: "1.5px solid white",
                }} />
              )}
            </button>

            {notifOpen && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)",
                width: 320, background: "white", borderRadius: 14,
                boxShadow: "0 8px 30px rgba(0,0,0,0.12)", border: "1px solid #e9e8e7",
                zIndex: 50, overflow: "hidden",
              }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f0ef", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1b1c1c" }}>Notifications</span>
                  {notifications.some(n => !n.is_read) && (
                    <button onClick={markAllRead} style={{ fontSize: 11, color: BRAND.primary, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, padding: 0 }}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 360, overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "24px 16px" }}>No notifications yet</p>
                  ) : notifications.map(n => {
                    const meta = NOTIF_META[n.event_type];
                    if (!meta) return null;
                    return (
                      <div key={n.id}
                        onClick={() => { if (n.application_id) navigate(`/applications/${n.application_id}`); markOneRead(n.id); setNotifOpen(false); }}
                        style={{
                          display: "flex", gap: 10, padding: "12px 16px",
                          borderBottom: "1px solid #f8f8f8", cursor: n.application_id ? "pointer" : "default",
                          background: n.is_read ? "white" : "#fafbff",
                        }}
                        onMouseEnter={e => { if (n.application_id) e.currentTarget.style.background = "#f5f6f8"; }}
                        onMouseLeave={e => e.currentTarget.style.background = n.is_read ? "white" : "#fafbff"}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2.5" strokeLinecap="round">
                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: meta.color, margin: "0 0 2px" }}>{meta.label}</p>
                          <p style={{ fontSize: 11, color: "#6b7280", margin: 0, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.message}</p>
                          <p style={{ fontSize: 10, color: "#94a3b8", margin: "3px 0 0" }}>{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.is_read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: BRAND.primary, flexShrink: 0, marginTop: 4 }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{ position: "relative" }} ref={ref}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: BRAND.primary,
                color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "700", fontSize: "13px",
                border: "none", cursor: "pointer",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              {initials}
            </button>

            {dropdownOpen && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)",
                width: "220px", background: "white", borderRadius: "12px",
                boxShadow: "0 8px 30px rgba(0,0,0,0.12)", border: "1px solid #e9e8e7",
                zIndex: 50, overflow: "hidden",
              }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f0ef" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#1b1c1c" }}>{user?.name}</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user?.email}
                  </div>
                </div>
                <div style={{ padding: "6px" }}>
                  <button
                    onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                    style={{
                      width: "100%", textAlign: "left", padding: "9px 10px",
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: "13px", color: "#1b1c1c", borderRadius: "8px",
                      display: "flex", alignItems: "center", gap: "8px",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f5f3f2"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    My Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%", textAlign: "left", padding: "9px 10px",
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: "13px", color: "#dc2626", borderRadius: "8px",
                      display: "flex", alignItems: "center", gap: "8px",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
    </>
  );
}
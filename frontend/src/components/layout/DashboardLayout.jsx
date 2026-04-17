import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import coatOfArms from "../../assets/coat-of-arms.png";
import { BRAND } from "../../config/theme";

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const navLinks = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "My Applications", path: "/applications" },
  ];

  return (
    <header style={{
      background: "white",
      borderBottom: "1px solid #e9e8e7",
      position: "sticky", top: 0, zIndex: 40,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        maxWidth: "1200px", margin: "0 auto", padding: "0 24px",
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
                  color: isActive ? BRAND.primary : "#64748b",
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
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = BRAND.primaryDark}
            onMouseLeave={(e) => e.currentTarget.style.background = BRAND.primary}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Application
          </button>
        </nav>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            style={{
              background: "none", border: "none", cursor: "pointer",
              width: "36px", height: "36px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#64748b", position: "relative",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#f1f0ef"}
            onMouseLeave={(e) => e.currentTarget.style.background = "none"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </button>

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
  );
}
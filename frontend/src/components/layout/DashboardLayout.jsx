import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import coatOfArms from "../../assets/coat-of-arms.png";
import { BRAND } from "../../config/theme";

export default function DashboardLayout({ children }) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      <DashboardHeader />
      <main style={{ flex: 1 }}>{children}</main>
      <DashboardFooter />
    </div>
  );
}

function DashboardHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };
  const initials = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <header style={{ background: "white", borderBottom: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 40 }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
        <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <img src={coatOfArms} alt="" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: BRAND.primaryDeep, lineHeight: 1 }}>DLRSJAM</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>Driver's Licence Renewal System</div>
          </div>
        </Link>

        <div style={{ position: "relative" }} ref={ref}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: "8px" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
            onMouseLeave={(e) => e.currentTarget.style.background = "none"}
          >
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: BRAND.primary, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "14px", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#111827" }}>{user?.name || "Applicant"}</div>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>{user?.email}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {dropdownOpen && (
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: "200px", background: "white", borderRadius: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb", zIndex: 50, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: "11px", color: "#9ca3af" }}>Signed in as</div>
                <div style={{ fontSize: "13px", fontWeight: "500", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
              </div>
              <button
                onClick={handleLogout}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#dc2626", display: "flex", alignItems: "center", gap: "8px" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function DashboardFooter() {
  return (
    <footer style={{ background: BRAND.primaryDeep, color: "white", padding: "40px 24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "32px" }}>
        <div>
          <div style={{ fontWeight: "600", marginBottom: "10px" }}>Contact Us</div>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: 1.8 }}>Ministry of Transport & Mining<br />1-876-926-5780</div>
        </div>
        <div>
          <div style={{ fontWeight: "600", marginBottom: "10px" }}>Support</div>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: 1.8 }}>Mon – Fri: 8:00 AM – 4:00 PM<br />support@dlrsjam.gov.jm</div>
        </div>
        <div>
          <div style={{ fontWeight: "600", marginBottom: "10px" }}>Information</div>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: 1.8 }}>Terms of Service<br />Privacy Policy</div>
        </div>
      </div>
      <div style={{ maxWidth: "1200px", margin: "24px auto 0", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.15)", textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
        © 2026 Government of Jamaica. All rights reserved.
      </div>
    </footer>
  );
}
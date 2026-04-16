import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LicenceCard from "../../components/applicant/LicenceCard";
import { BRAND } from "../../config/theme";
import { APPLICATION_STATUS_STYLES, APPLICATION_STATUS_LABELS } from "../../config/constants";
import api from "../../services/api";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [licence, setLicence] = useState(null);
  const [applications, setApplications] = useState([]);
  const [digitalLicence, setDigitalLicence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);

  const firstName = user?.name?.split(" ")[0] || "there";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [licRes, appRes, dlRes] = await Promise.all([
          api.get("/api/applicant/licence"),
          api.get("/api/applicant/applications"),
          api.get("/api/applicant/digital-licence/latest"),
        ]);
        setLicence(licRes.data);
        setApplications(appRes.data.applications ?? []);
        setDigitalLicence(dlRes.data.digital_licence ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Merge digital licence data over base licence record
  const displayLicence = digitalLicence ? {
    ...licence,
    photo_url:    digitalLicence.photo_url,
    generated_at: digitalLicence.generated_at,
  } : licence;

  const expiryDate = displayLicence?.expiry_date ? new Date(displayLicence.expiry_date) : null;
  const today = new Date();
  const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 90;
  const expiryLabel = expiryDate ? expiryDate.toLocaleDateString("en-JM", { day: "numeric", month: "long", year: "numeric" }) : "—";

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <div style={{ textAlign: "center" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading your dashboard…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Expiry banner */}
        {(isExpired || isExpiringSoon) && (
          <div style={{
            background: isExpired ? "#fef2f2" : `linear-gradient(135deg, ${BRAND.primaryDeep} 0%, ${BRAND.primary} 100%)`,
            borderRadius: "14px", padding: "28px 32px", marginBottom: "32px",
            display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "20px",
          }}>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: "800", color: isExpired ? "#dc2626" : "white", marginBottom: "6px" }}>
                {isExpired ? `⚠ Your licence has expired, ${firstName}` : `Good day, ${firstName} 👋`}
              </h1>
              <p style={{ fontSize: "14px", color: isExpired ? "#991b1b" : "rgba(255,255,255,0.85)" }}>
                {isExpired
                  ? `Expired on ${expiryLabel}. Start a renewal immediately.`
                  : `Your licence expires on ${expiryLabel} — ${daysUntilExpiry} days away.`}
              </p>
            </div>
            <button onClick={() => navigate("/apply")} style={{ background: isExpired ? "#dc2626" : "#fbbf24", color: isExpired ? "white" : BRAND.primaryDeep, border: "none", borderRadius: "10px", padding: "12px 24px", fontWeight: "700", fontSize: "14px", cursor: "pointer", whiteSpace: "nowrap" }}>
              Start Renewal →
            </button>
          </div>
        )}

        {/* Welcome heading */}
        {!isExpired && !isExpiringSoon && (
          <div style={{ marginBottom: "32px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: BRAND.primaryDeep, marginBottom: "4px" }}>Welcome back, {firstName}</h1>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>Manage your driver's licence applications and documents.</p>
          </div>
        )}

        {/* Renewal CTA */}
        <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)", border: `2px solid ${BRAND.primary}`, borderRadius: "14px", padding: "24px 28px", marginBottom: "24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "20px" }}>
          <div style={{ flex: 1 }}>
            <span style={{ background: "#fbbf24", color: BRAND.primaryDeep, fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "99px", textTransform: "uppercase" }}>Most Common</span>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: BRAND.primaryDeep, margin: "8px 0 4px" }}>Renew Your Driver's Licence</h2>
            <p style={{ fontSize: "13px", color: "#374151", marginBottom: "10px" }}>
              {expiryLabel !== "—" ? `Your licence expires on ${expiryLabel}.` : "Renew your licence online."} Complete in just a few minutes.
            </p>
            <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#6b7280" }}>
              <span>⏱ ~5 mins</span>
              <span>📄 Fee: J$4,500</span>
            </div>
          </div>
          <button onClick={() => navigate("/apply")} style={{ background: BRAND.primary, color: "white", border: "none", borderRadius: "10px", padding: "12px 24px", fontWeight: "700", fontSize: "14px", cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
            Start Renewal →
          </button>
        </div>

        {/* Quick actions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "28px" }}>
          <QuickActionCard icon="📋" iconBg="#fff7ed" title="Request Replacement" desc="Lost, stolen, or damaged licence? Get a replacement quickly." onClick={() => navigate("/apply?type=replacement")} />
          <QuickActionCard icon="🕐" iconBg="#f0fdfa" title="Track Application" desc="Monitor the progress of your submitted applications." onClick={() => navigate("/applications")} />
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
          <StatCard label="Licence Status" value={
            <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: "700", background: isExpired ? "#fef2f2" : "#f0fdf4", color: isExpired ? "#dc2626" : "#15803d" }}>
              {displayLicence?.status ?? "—"}
            </span>
          } sub={`Valid until ${expiryLabel}`} />
          <StatCard label="Licence Class" value={displayLicence?.licence_class ?? "—"} sub={displayLicence?.licence_class === "A" ? "Motorcycle only" : displayLicence?.licence_class === "B" ? "Motor cars only" : displayLicence?.licence_class === "C" ? "All motor vehicles" : "—"} />
          <StatCard label="Collectorate" value={displayLicence?.collectorate?.split(" ").slice(0, 2).join(" ") ?? "—"} sub={displayLicence?.collectorate ?? ""} smallValue />
        </div>

        {/* Licence card */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: BRAND.primaryDeep }}>Your Current Licence</h2>
            <button onClick={() => setIsFlipped((v) => !v)} style={{ background: "none", border: `1px solid ${BRAND.primary}`, borderRadius: "8px", padding: "6px 14px", fontSize: "12px", fontWeight: "600", color: BRAND.primary, cursor: "pointer" }}>
              ↺ Flip Card {isFlipped ? "(Back)" : "(Front)"}
            </button>
          </div>
          <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e5e7eb", padding: "28px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ maxWidth: "480px", margin: "0 auto" }}>
              <LicenceCard licence={displayLicence} isFlipped={isFlipped} isExpired={isExpired} isExpiringSoon={isExpiringSoon} />
            </div>
          </div>
        </div>

        {/* Applications */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: BRAND.primaryDeep }}>Your Applications</h2>
            <button onClick={() => navigate("/applications")} style={{ background: "none", border: `1px solid ${BRAND.primary}`, borderRadius: "8px", padding: "6px 14px", fontSize: "12px", fontWeight: "600", color: BRAND.primary, cursor: "pointer" }}>View All</button>
          </div>

          {applications.length === 0 ? (
            <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e5e7eb", padding: "48px", textAlign: "center" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>📭</div>
              <p style={{ color: "#6b7280", fontSize: "14px" }}>No applications yet. Start a renewal to get going.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {applications.slice(0, 3).map((app) => {
                const style = APPLICATION_STATUS_STYLES[app.status] ?? { bg: "#f9fafb", color: "#374151" };
                return (
                  <div key={app.id} style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "18px 22px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>📄</div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                          <span style={{ fontSize: "14px", fontWeight: "700", color: BRAND.primaryDeep }}>{app.transaction_type}</span>
                          <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "99px", background: style.bg, color: style.color }}>
                            {APPLICATION_STATUS_LABELS[app.status] ?? app.status}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>Ref: <strong style={{ color: "#374151" }}>{app.application_number}</strong></div>
                        <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                          {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString("en-JM") : new Date(app.created_at).toLocaleDateString("en-JM")}
                        </div>
                      </div>
                    </div>
                    <OutlineBtn onClick={() => navigate(`/applications/${app.id}`)}>View Details</OutlineBtn>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <InfoCard color="#eff6ff" iconColor="#1d4ed8" icon="⏱" title="Processing Times" desc="Most applications are reviewed within 5–7 business days." />
          <InfoCard color="#f0fdf4" iconColor="#15803d" icon="✅" title="Required Documents" desc="Ensure all documents are clear and valid before submission." />
          <InfoCard color="#fffbeb" iconColor="#d97706" icon="❓" title="Need Help?" desc="Contact us at support@dlrsjam.gov.jm" />
        </div>

      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, sub, smallValue }) {
  return (
    <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: smallValue ? "13px" : "20px", fontWeight: "700", color: "#111827", marginBottom: "4px" }}>{value}</div>
      <div style={{ fontSize: "12px", color: "#6b7280" }}>{sub}</div>
    </div>
  );
}

function QuickActionCard({ icon, iconBg, title, desc, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "20px", cursor: "pointer", boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.1)" : "0 1px 4px rgba(0,0,0,0.04)", transition: "box-shadow 0.2s", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
      <div>
        <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", marginBottom: "12px" }}>{icon}</div>
        <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827", marginBottom: "4px" }}>{title}</div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>{desc}</div>
      </div>
      <span style={{ color: BRAND.primary, fontSize: "18px", transform: hovered ? "translateX(3px)" : "none", transition: "transform 0.2s" }}>→</span>
    </div>
  );
}

function InfoCard({ color, iconColor, icon, title, desc }) {
  return (
    <div style={{ background: color, borderRadius: "12px", padding: "20px" }}>
      <div style={{ fontSize: "24px", marginBottom: "10px" }}>{icon}</div>
      <div style={{ fontWeight: "700", fontSize: "14px", color: iconColor, marginBottom: "6px" }}>{title}</div>
      <div style={{ fontSize: "12px", color: iconColor, opacity: 0.8, lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

function OutlineBtn({ children, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? BRAND.primary : "white", color: hovered ? "white" : BRAND.primary, border: `1px solid ${BRAND.primary}`, borderRadius: "8px", padding: "7px 14px", fontSize: "12px", fontWeight: "600", cursor: "pointer", transition: "all 0.15s" }}>
      {children}
    </button>
  );
}
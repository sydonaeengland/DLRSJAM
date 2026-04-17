import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LicenceCard from "../../components/applicant/LicenceCard";
import DashboardGreeting from "../../components/applicant/DashboardGreeting";
import LicenceStatusCard from "../../components/applicant/LicenceStatusCard";
import PickupDepotCard from "../../components/applicant/PickupDepotCard";
import { BRAND } from "../../config/theme";
import { APPLICATION_STATUS_STYLES, APPLICATION_STATUS_LABELS } from "../../config/constants";
import api from "../../services/api";

const TRANSACTION_LABELS = {
  RENEWAL: "Licence Renewal",
  REPLACEMENT: "Licence Replacement",
  AMENDMENT: "Licence Amendment",
};

const TRANSACTION_ICONS = {
  RENEWAL: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </svg>
  ),
  REPLACEMENT: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  AMENDMENT: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
};

const COLLECTORATE_ADDRESSES = {
  "Kingston": "1-3 Swallowfield Road, Kingston 5",
  "St. Andrew": "1-3 Swallowfield Road, Kingston 5",
  "St. Catherine": "27 Independence Street, Spanish Town",
  "Portmore": "Portmore Mall, Greater Portmore",
  "St. Thomas": "High Street, Morant Bay",
  "Portland": "Harbour Street, Port Antonio",
  "St. Mary": "Main Street, Port Maria",
  "St. Ann": "Albion Road, St. Ann's Bay",
  "Trelawny": "Albert George Market, Falmouth",
  "St. James": "22 Church Street, Montego Bay",
  "Hanover": "Lucea Main Street, Lucea",
  "Westmoreland": "Market Street, Savanna-la-Mar",
  "St. Elizabeth": "Coke Drive, Black River",
  "Manchester": "25 Hargreaves Ave, Mandeville",
  "Clarendon": "Chapelton Road, May Pen",
};

function PhoneIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function MailIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [licence, setLicence] = useState(null);
  const [applications, setApplications] = useState([]);
  const [digitalLicence, setDigitalLicence] = useState(null);
  const [latestAppCollectorate, setLatestAppCollectorate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);

  const fullName = user?.name || "Applicant";
  const firstName = fullName.split(" ")[0];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [licRes, appRes, dlRes] = await Promise.all([
          api.get("/api/applicant/licence"),
          api.get("/api/applicant/applications"),
          api.get("/api/applicant/digital-licence/latest"),
        ]);
        setLicence(licRes.data);
        const apps = appRes.data.applications ?? [];
        setApplications(apps);
        setDigitalLicence(dlRes.data.digital_licence ?? null);
        const latestApp = apps
          .filter(a => a.status !== "DRAFT" && a.collectorate)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        if (latestApp?.collectorate) setLatestAppCollectorate(latestApp.collectorate);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const displayLicence = digitalLicence
    ? { ...licence, photo_url: digitalLicence.photo_url, generated_at: digitalLicence.generated_at }
    : licence;

  const today = new Date();
  const expiryDate = displayLicence?.expiry_date ? new Date(displayLicence.expiry_date) : null;
  const daysUntilExpiry = expiryDate
    ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 90;
  const expiryLabel = expiryDate
    ? expiryDate.toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  const actionRequiredApp = applications.find(
    a => a.status === "ACTION_REQUIRED" || a.status === "WAITING_ON_APPLICANT"
  );
  const draftApp = applications.find(a => a.status === "DRAFT");
  const approvedApp = applications.find(a => a.status === "APPROVED");

  const rawCollectorate = latestAppCollectorate || displayLicence?.collectorate || null;
  const collectorateName = rawCollectorate
    ? rawCollectorate.replace(/^\d+\s*/, "").split("(")[0].trim()
    : null;
  const collectorateAddress = collectorateName ? COLLECTORATE_ADDRESSES[collectorateName] : null;
  const mapQuery = encodeURIComponent(
    collectorateAddress ?? (collectorateName ? collectorateName + " Tax Administration Jamaica" : "Tax Administration Jamaica Kingston")
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px 64px" }}>

        {actionRequiredApp && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#fef2f2", border: "1px solid #fecaca",
            borderLeft: "4px solid #dc2626",
            borderRadius: "10px", padding: "14px 18px",
            marginBottom: "24px", gap: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span style={{ fontSize: "14px", color: "#991b1b", fontWeight: "500" }}>
                Action required on your {TRANSACTION_LABELS[actionRequiredApp.transaction_type] ?? "application"}.
              </span>
            </div>
            <button
              onClick={() => navigate(`/applications/${actionRequiredApp.id}`)}
              style={{ background: "none", border: "none", fontSize: "13px", fontWeight: "700", color: "#dc2626", cursor: "pointer", whiteSpace: "nowrap", padding: 0 }}
            >
              View details →
            </button>
          </div>
        )}

        <DashboardGreeting
          firstName={firstName}
          isExpired={isExpired}
          isExpiringSoon={isExpiringSoon}
          daysUntilExpiry={daysUntilExpiry}
          expiryLabel={expiryLabel}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div onClick={() => setIsFlipped(v => !v)} style={{ cursor: "pointer", maxWidth: "520px" }}>
              <LicenceCard
                licence={displayLicence}
                isFlipped={isFlipped}
                isExpired={isExpired}
                isExpiringSoon={isExpiringSoon}
              />
              <p style={{ textAlign: "center", fontSize: "11px", color: "#94a3b8", fontStyle: "italic", marginTop: "10px" }}>
                Tap card to flip for security details
              </p>
            </div>
            <RecentActivity applications={applications} navigate={navigate} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <LicenceStatusCard
              isExpired={isExpired}
              isExpiringSoon={isExpiringSoon}
              daysUntilExpiry={daysUntilExpiry}
              expiryLabel={expiryLabel}
              expiryDate={expiryDate}
              issueDate={displayLicence?.issue_date}
              today={today}
            />
            {draftApp && (
              <div style={{ background: "#fffbeb", borderRadius: "12px", border: "1px solid #fde68a", padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#92400e", margin: 0 }}>Application in Progress</p>
                </div>
                <p style={{ fontSize: "12px", color: "#a16207", margin: "0 0 12px", lineHeight: 1.5 }}>
                  You have an unsubmitted {TRANSACTION_LABELS[draftApp.transaction_type] ?? "application"}.
                </p>
                {/* ✅ FIXED: was /apply/retrieve-record?resume= */}
                <button
                  onClick={() => navigate(`/apply?resume=${draftApp.id}`)}
                  style={{ background: "#d97706", color: "white", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: "700", cursor: "pointer", width: "100%" }}
                >
                  Resume →
                </button>
              </div>
            )}
            <PickupDepotCard
              collectorateName={collectorateName}
              collectorateAddress={collectorateAddress}
              mapQuery={mapQuery}
              approvedApp={approvedApp}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "24px" }}>
          <ActionCard
            onClick={() => navigate("/apply?type=replacement")}
            bg="linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)"
            border="#fed7aa" glowColor="rgba(251,191,36,0.15)" shadowColor="rgba(217,119,6,0.15)"
            iconColor="#d97706"
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>}
            title="Lost or Damaged?" titleColor="#92400e"
            desc="Get a replacement licence issued quickly. Lost, stolen, or damaged cards covered." descColor="#a16207"
            cta="Request Replacement" ctaColor="#d97706"
          />
          <ActionCard
            onClick={() => navigate("/applications")}
            bg="linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)"
            border="#bfdbfe" glowColor="rgba(59,130,246,0.1)" shadowColor="rgba(37,99,235,0.15)"
            iconColor={BRAND.primary}
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
            title="Track Your Progress" titleColor="#1e3a8a"
            desc="Follow every step of your application in real time — from submission to card pickup." descColor="#3b82f6"
            cta="View Applications" ctaColor={BRAND.primary}
          />
          <ActionCard
            bg="linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
            border="#bbf7d0" glowColor="rgba(34,197,94,0.1)"
            iconColor="#15803d"
            icon={<PhoneIcon size={22} />}
            title="Need Help?" titleColor="#14532d"
          >
            <p style={{ fontSize: "12px", color: "#16a34a", margin: "0 0 10px", lineHeight: 1.6 }}>
              Our TAJ team is available weekdays to assist with any questions about your licence.
            </p>
            <a href="tel:18769265780" style={{ fontSize: "13px", fontWeight: "700", color: "#15803d", textDecoration: "none", display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
              <PhoneIcon size={13} /> 1-876-926-5780
            </a>
            <a href="mailto:support@dlrsjam.gov.jm" style={{ fontSize: "12px", color: "#16a34a", textDecoration: "none", display: "flex", alignItems: "center", gap: "5px" }}>
              <MailIcon size={12} /> support@dlrsjam.gov.jm
            </a>
            <span style={{ fontSize: "11px", color: "#4ade80", marginTop: "6px", display: "block" }}>Mon–Fri · 8AM–4PM</span>
          </ActionCard>
        </div>

      </div>
    </DashboardLayout>
  );
}

function RecentActivity({ applications, navigate }) {
  return (
    <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e9e8e7", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid #f1f0ef" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#1b1c1c", margin: 0 }}>Recent Activity</h2>
        <button
          onClick={() => navigate("/applications")}
          style={{ background: "none", border: "none", fontSize: "13px", color: BRAND.primary, fontWeight: "600", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "4px" }}
        >
          View All
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
      {applications.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>No applications yet</p>
        </div>
      ) : (
        applications.slice(0, 4).map((app, i) => {
          const s = APPLICATION_STATUS_STYLES[app.status] ?? { bg: "#f9fafb", color: "#6b7280" };
          const label = APPLICATION_STATUS_LABELS[app.status] ?? app.status;
          const txLabel = TRANSACTION_LABELS[app.transaction_type] ?? app.transaction_type;
          const txIcon = TRANSACTION_ICONS[app.transaction_type] ?? TRANSACTION_ICONS.RENEWAL;
          const date = new Date(app.submitted_at ?? app.created_at)
            .toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric" });
          return (
            <ActivityRow
              key={app.id}
              txLabel={txLabel} txIcon={txIcon}
              appNumber={app.application_number ?? `DL-${new Date(app.created_at).toISOString().slice(0,10).replace(/-/g,"")}-${String(app.id).padStart(6,"0")}`}
              date={date} statusBg={s.bg} statusColor={s.color} statusLabel={label}
              isLast={i === Math.min(applications.length, 4) - 1}
              onClick={() => navigate(`/applications/${app.id}`)}
            />
          );
        })
      )}
    </div>
  );
}

function ActivityRow({ txLabel, txIcon, appNumber, date, statusBg, statusColor, statusLabel, isLast, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "14px", padding: "14px 20px",
        borderBottom: isLast ? "none" : "1px solid #f1f0ef",
        background: hovered ? "#f8fafc" : "white",
        transition: "background 0.12s", cursor: "pointer",
      }}
    >
      <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#f5f3f2", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {txIcon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "14px", fontWeight: "600", color: "#1b1c1c", margin: "0 0 2px" }}>{txLabel}</p>
        <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0, fontFamily: "monospace" }}>{appNumber}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
        <span style={{ fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "4px", background: statusBg, color: statusColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {statusLabel}
        </span>
        <span style={{ fontSize: "11px", color: "#94a3b8" }}>{date}</span>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
}

function ActionCard({ onClick, bg, border, glowColor, shadowColor, iconColor, icon, title, titleColor, desc, descColor, cta, ctaColor, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onClick && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: bg, borderRadius: "14px", border: `1px solid ${border}`,
        padding: "22px", position: "relative", overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        boxShadow: hovered && shadowColor ? `0 8px 24px ${shadowColor}` : "0 1px 3px rgba(0,0,0,0.04)",
        transform: hovered && onClick ? "translateY(-2px)" : "translateY(0)",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
    >
      <div style={{ position: "absolute", top: "-12px", right: "-12px", width: "80px", height: "80px", borderRadius: "50%", background: glowColor }} />
      <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", color: iconColor, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
        {icon}
      </div>
      <p style={{ fontSize: "15px", fontWeight: "700", color: titleColor, margin: "0 0 6px" }}>{title}</p>
      {desc && <p style={{ fontSize: "12px", color: descColor, margin: "0 0 16px", lineHeight: 1.6 }}>{desc}</p>}
      {cta && (
        <span style={{ fontSize: "13px", fontWeight: "700", color: ctaColor, display: "flex", alignItems: "center", gap: "4px" }}>
          {cta}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      )}
      {children}
    </div>
  );
}
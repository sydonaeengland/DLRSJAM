// Applicant dashboard — shows the licence card, status, pickup info, and quick-action buttons.
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LicenceCard from "../../components/applicant/LicenceCard";
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

const DESIGN_W = 520;
const DESIGN_H = Math.round(DESIGN_W / 1.586);
const PDF_W = 1040;
const PDF_H = Math.round(PDF_W / 1.586);

function DownloadLicenceButton({ frontRef, backRef, licence }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const download = async () => {
    setLoading(true);
    setError(false);
    try {
      const [domToImage, { jsPDF: _jsPDF }] = await Promise.all([
        import("dom-to-image-more").then(m => m.default),
        import("jspdf"),
      ]);

      // Capture at 2× the design size for crisp output
      const opts = { width: DESIGN_W, height: DESIGN_H, scale: 2 };
      const [frontDataUrl, backDataUrl] = await Promise.all([
        domToImage.toPng(frontRef.current, opts),
        domToImage.toPng(backRef.current, opts),
      ]);

      const pdf = new _jsPDF({ orientation: "landscape", unit: "px", format: [PDF_W, PDF_H] });
      pdf.addImage(frontDataUrl, "PNG", 0, 0, PDF_W, PDF_H);
      pdf.addPage([PDF_W, PDF_H], "landscape");
      pdf.addImage(backDataUrl, "PNG", 0, 0, PDF_W, PDF_H);
      pdf.save(`dlrsjam-licence-${licence?.control_number ?? "card"}.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={download}
        disabled={loading}
        style={{ width: "100%", background: loading ? "#94a3b8" : BRAND.primary, border: "none", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: "700", color: "white", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
      >
        {loading ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            Generating PDF…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF
          </>
        )}
      </button>
      {error && <p style={{ fontSize: "11px", color: "#dc2626", margin: "4px 0 0", textAlign: "center" }}>Export failed — please try again.</p>}
    </>
  );
}

function AccountSettingsModal({ onClose }) {
  const emailRef = useRef(null);
  const [originalEmail, setOriginalEmail] = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get("/api/applicant/profile").then(res => {
      setEmail(res.data.email || "");
      setOriginalEmail(res.data.email || "");
      setPhone(res.data.phone || "");
    }).catch(() => {});
    setTimeout(() => emailRef.current?.focus(), 50);
  }, []);

  const emailChanging = email.trim().toLowerCase() !== originalEmail.toLowerCase();

  const save = async () => {
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const payload = { email, phone };
      if (emailChanging) payload.password = password;
      await api.patch("/api/applicant/profile", payload);
      setOriginalEmail(email);
      setPassword("");
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = email.trim() && (!emailChanging || password.trim());

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
      onClick={onClose}>
      <div style={{ background: "white", borderRadius: "16px", padding: "28px", maxWidth: "420px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <p style={{ fontSize: "16px", fontWeight: "800", color: "#111827", margin: 0 }}>Account Settings</p>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: "2px 0 0" }}>Update your contact information</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#374151", display: "block", marginBottom: "6px" }}>Email address</label>
            <input ref={emailRef} type="email" value={email} onChange={e => { setEmail(e.target.value); setSuccess(false); setError(null); }}
              style={{ width: "100%", border: `1.5px solid ${emailChanging ? "#a78bfa" : "#e2e8f0"}`, borderRadius: "10px", padding: "10px 12px", fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#374151", display: "block", marginBottom: "6px" }}>Phone number</label>
            <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setSuccess(false); }}
              style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px", fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>

          {emailChanging && (
            <div style={{ padding: "14px", background: "#faf5ff", border: "1.5px solid #c4b5fd", borderRadius: "10px" }}>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#6d28d9", display: "block", marginBottom: "6px" }}>
                Confirm your current password <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <p style={{ fontSize: "11px", color: "#7c3aed", margin: "0 0 8px" }}>Required to change your login email.</p>
              <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(null); }}
                placeholder="Enter your password"
                style={{ width: "100%", border: "1.5px solid #c4b5fd", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "white" }} />
            </div>
          )}
        </div>

        {error && (
          <p style={{ fontSize: "12px", color: "#dc2626", marginTop: "12px", padding: "10px 12px", background: "#fef2f2", borderRadius: "8px" }}>{error}</p>
        )}
        {success && (
          <p style={{ fontSize: "12px", color: "#15803d", marginTop: "12px", padding: "10px 12px", background: "#f0fdf4", borderRadius: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l5 5L20 7" /></svg>
            Contact details updated successfully.
          </p>
        )}

        <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "13px", fontWeight: "600", color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
            {success ? "Close" : "Cancel"}
          </button>
          <button onClick={save} disabled={saving || !canSave}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: saving || !canSave ? "#94a3b8" : BRAND.primary, color: "white", fontSize: "13px", fontWeight: "700", cursor: saving || !canSave ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [licence, setLicence] = useState(null);
  const [applications, setApplications] = useState([]);
  const [digitalLicence, setDigitalLicence] = useState(null);
  const [pickupCollectorate, setPickupCollectorate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const frontRef = useRef(null);
  const backRef  = useRef(null);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  const fullName = user?.name || "Applicant";
  const firstName = fullName.split(" ")[0];

  const applicationsRef = useRef([]);

  useEffect(() => {
    let pollTimer = null;

    const fetchData = async () => {
      try {
        const [licRes, appRes, dlRes] = await Promise.all([
          api.get("/api/applicant/licence"),
          api.get("/api/applicant/applications"),
          api.get("/api/applicant/digital-licence/latest"),
        ]);
        setLicence(licRes.data);
        const apps = appRes.data.applications ?? [];
        applicationsRef.current = apps;
        setApplications(apps);

        const dl = dlRes.data.digital_licence ?? null;
        setDigitalLicence(dl);

        // Backfill in background — don't block initial render
        if (apps.some(a => a.status === "APPROVED") && (!dl || !dl.photo_url)) {
          api.post("/api/applicant/digital-licence/backfill").then(() =>
            Promise.all([
              api.get("/api/applicant/licence"),
              api.get("/api/applicant/digital-licence/latest"),
            ]).then(([licRes2, dlRes2]) => {
              setLicence(licRes2.data);
              setDigitalLicence(dlRes2.data.digital_licence ?? null);
            })
          ).catch(() => {});
        }
        const latestApp = apps
          .filter(a => a.status !== "DRAFT" && a.collectorate)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        if (latestApp) {
          setPickupCollectorate({
            full:    latestApp.collectorate,
            address: latestApp.collectorate_address,
            lat:     latestApp.collectorate_lat,
            lng:     latestApp.collectorate_lng,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }

      // Poll every 30s while there's an active in-progress application
      const IN_PROGRESS = ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED", "WAITING_ON_APPLICANT", "ACTION_REQUIRED", "PENDING_ITA", "ESCALATED", "PENDING_SUPERVISOR_APPROVAL"];
      const hasActive = applicationsRef.current.some(a => IN_PROGRESS.includes(a.status));
      if (hasActive) {
        pollTimer = setTimeout(fetchData, 30000);
      }
    };

    fetchData();

    const onFocus = () => {
      clearTimeout(pollTimer);
      fetchData();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearTimeout(pollTimer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const signatureImage = applications
    .filter(a => a.signature_image)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]?.signature_image ?? null;

  const displayLicence = {
    ...licence,
    ...(digitalLicence ? { photo_url: digitalLicence.photo_url, generated_at: digitalLicence.generated_at } : {}),
    ...(signatureImage ? { signature_image: signatureImage } : {}),
  };

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

  const collectorateName = pickupCollectorate
    ? pickupCollectorate.full.replace(/^\d+\s*/, "").split("(")[0].trim()
    : null;
  const collectorateAddress = pickupCollectorate?.address ?? null;
  const collectorateLat = pickupCollectorate?.lat ?? null;
  const collectorateLng = pickupCollectorate?.lng ?? null;

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
      {/* Greeting banner */}
      <div style={{ background: "#f5f6f8", borderBottom: "1px solid #e9e8e7" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 32px" }}>
          <div style={{
            background: "linear-gradient(135deg, #1e40af 0%, #2563eb 55%, #3b82f6 100%)",
            borderRadius: "16px",
            padding: "24px 28px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", flexWrap: "wrap",
            boxShadow: "0 4px 20px rgba(37,99,235,0.25)",
            position: "relative", overflow: "hidden",
          }}>
            {/* subtle radial glow top-right */}
            <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />

            <div>
              <p style={{ fontSize: "11px", fontWeight: "600", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>
                {new Date().toLocaleDateString("en-JM", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <h1 style={{ fontSize: "22px", fontWeight: "800", color: "white", letterSpacing: "-0.4px", margin: "0 0 10px" }}>
                {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"}, {firstName}
              </h1>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {expiryDate && (
                  <span style={{
                    fontSize: "12px", fontWeight: "600",
                    color: isExpired ? "#fca5a5" : isExpiringSoon ? "#fde68a" : "rgba(255,255,255,0.75)",
                    background: "rgba(255,255,255,0.1)",
                    border: `1px solid ${isExpired ? "rgba(252,165,165,0.4)" : isExpiringSoon ? "rgba(253,230,138,0.4)" : "rgba(255,255,255,0.15)"}`,
                    borderRadius: "6px", padding: "3px 10px",
                    display: "flex", alignItems: "center", gap: "5px",
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {isExpired ? "Licence expired" : `Expires ${expiryLabel}`}
                  </span>
                )}
                {licence?.licence_class && (
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", padding: "3px 10px" }}>
                    Class {licence.licence_class}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {draftApp && (
                <button onClick={() => navigate(`/apply?resume=${draftApp.id}`)}
                  style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "8px", padding: "9px 16px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Resume Application
                </button>
              )}
              {(isExpired || isExpiringSoon) && (
                <button onClick={() => navigate("/apply")}
                  style={{ background: "white", color: "#1e40af", border: "none", borderRadius: "8px", padding: "9px 16px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                  {isExpired ? "Renew Now" : "Renew Licence"}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 32px 64px" }}>

        {/* Action required banner */}
        {actionRequiredApp && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#fef2f2", border: "1px solid #fecaca",
            borderLeft: "4px solid #dc2626",
            borderRadius: "10px", padding: "12px 16px",
            marginBottom: "20px", gap: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span style={{ fontSize: "13px", color: "#991b1b", fontWeight: "600" }}>
                Action required — {TRANSACTION_LABELS[actionRequiredApp.transaction_type] ?? "application"}
              </span>
            </div>
            <button onClick={() => navigate(`/applications/${actionRequiredApp.id}`)}
              style={{ background: "none", border: "none", fontSize: "13px", fontWeight: "700", color: "#dc2626", cursor: "pointer", whiteSpace: "nowrap", padding: 0 }}>
              View →
            </button>
          </div>
        )}

        {/* Main grid: licence card + sidebar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(300px, 26%)", gap: "24px", alignItems: "start" }}>

          {/* Left */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Licence card */}
            <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e9e8e7", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", gap: "24px", alignItems: "flex-start" }}>
              {/* Card + flip hint */}
              <div style={{ flex: "0 0 auto", width: "min(520px, 100%)" }}>
                <div onClick={() => setIsFlipped(v => !v)} style={{ cursor: "pointer" }}>
                  <LicenceCard
                    licence={displayLicence}
                    isFlipped={isFlipped}
                    isExpired={isExpired}
                    isExpiringSoon={isExpiringSoon}
                  />
                </div>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: "8px 0 0", textAlign: "center" }}>
                  Tap card to flip
                </p>
              </div>

              {/* Right info + actions */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", minWidth: 0, paddingTop: "4px" }}>
                <div>
                  <p style={{ fontSize: "15px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 3px" }}>Digital Licence</p>
                  {digitalLicence?.generated_at && (
                    <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                      Issued {new Date(digitalLicence.generated_at).toLocaleDateString("en-JM", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <DownloadLicenceButton frontRef={frontRef} backRef={backRef} licence={displayLicence} />
                  <button
                    onClick={() => setIsFlipped(v => !v)}
                    style={{ width: "100%", background: "none", border: "1.5px solid #e9e8e7", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: "600", color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                    </svg>
                    {isFlipped ? "View Front" : "View Back"}
                  </button>
                </div>

                {licence && (
                  <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {[
                      { label: "Control No.", value: licence.control_number ?? "—" },
                      { label: "Class", value: licence.licence_class ?? "—" },
                      { label: "Expires", value: expiryLabel },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", fontFamily: "monospace" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <RecentActivity applications={applications} navigate={navigate} />
          </div>

          {/* Right sidebar */}
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
            <PickupDepotCard
              collectorateName={collectorateName}
              collectorateAddress={collectorateAddress}
              lat={collectorateLat}
              lng={collectorateLng}
              approvedApp={approvedApp}
            />

            {/* Quick Actions */}
            <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e9e8e7", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f0ef" }}>
                <p style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Quick Actions</p>
              </div>
              <div style={{ padding: "8px" }}>
                {[
                  {
                    label: "Apply for Replacement",
                    desc: "Lost or damaged licence",
                    onClick: () => navigate("/apply?type=replacement"),
                    color: "#d97706", bg: "#fef3c7",
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
                  },
                  {
                    label: "View Applications",
                    desc: "Track your submissions",
                    onClick: () => navigate("/applications"),
                    color: BRAND.primary, bg: "#eff6ff",
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
                  },
                  {
                    label: "Account Settings",
                    desc: "Email, phone & password",
                    onClick: () => setShowAccountSettings(true),
                    color: "#7c3aed", bg: "#f5f3ff",
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
                  },
                ].map(({ label, desc, onClick, color, bg, icon }) => (
                  <button key={label} onClick={onClick}
                    style={{ width: "100%", background: "none", border: "none", borderRadius: "10px", padding: "10px 10px", fontSize: "13px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "10px", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: "600", color: "#1b1c1c", margin: 0 }}>{label}</p>
                      <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>{desc}</p>
                    </div>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                ))}
              </div>
              <div style={{ margin: "0 16px 14px", paddingTop: "12px", borderTop: "1px solid #f1f0ef" }}>
                <p style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Need Help?</p>
                <a href="tel:18769265780" style={{ fontSize: "12px", fontWeight: "600", color: "#15803d", textDecoration: "none", display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                  <PhoneIcon size={12} /> 1-876-926-5780
                </a>
                <a href="mailto:support@dlrsjam.gov.jm" style={{ fontSize: "12px", color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: "5px" }}>
                  <MailIcon size={12} /> support@dlrsjam.gov.jm
                </a>
                <span style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", display: "block" }}>Mon–Fri · 8AM–4PM</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {showAccountSettings && <AccountSettingsModal onClose={() => setShowAccountSettings(false)} />}

      {/* Hidden cards for PDF capture — sized at DESIGN_W so scale=1, dom-to-image scales up */}
      <div style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none", zIndex: -1 }}>
        <div ref={frontRef} style={{ width: DESIGN_W, height: DESIGN_H, overflow: "hidden", borderRadius: 18, flexShrink: 0 }}>
          <LicenceCard licence={displayLicence} isFlipped={false} isExpired={isExpired} isExpiringSoon={isExpiringSoon} />
        </div>
        <div ref={backRef} style={{ width: DESIGN_W, height: DESIGN_H, overflow: "hidden", borderRadius: 18, flexShrink: 0, marginTop: 8 }}>
          <LicenceCard licence={displayLicence} isFlipped={true} isExpired={isExpired} isExpiringSoon={isExpiringSoon} />
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


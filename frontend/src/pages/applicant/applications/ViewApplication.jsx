import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppState } from "../../../context/ApplicationContext";
import { BRAND } from "../../../config/theme";
import api from "../../../services/api";
import InfoBanner from "../../../components/apply/InfoBanner";
import DashboardLayout from "../../../components/layout/DashboardLayout";

const Ico = ({ d, size = 16, stroke = "currentColor", fill = "none", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const CheckIcon    = (p) => <Ico {...p} sw={2.5} d="M5 12l5 5L20 7" />;
const ClockIcon    = (p) => <Ico {...p} d={["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M12 6v6l4 2"]} />;
const AlertIcon    = (p) => <Ico {...p} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"]} />;
const FileIcon     = (p) => <Ico {...p} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6"]} />;
const UserIcon     = (p) => <Ico {...p} d={["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2","M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8"]} />;
const MapPinIcon   = (p) => <Ico {...p} d={["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z","M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6"]} />;
const CreditIcon   = (p) => <Ico {...p} d={["M1 4h22v16H1z","M1 10h22"]} />;
const ActivityIcon = (p) => <Ico {...p} d="M22 12h-4l-3 9L9 3l-3 9H2" />;
const ShieldIcon   = (p) => <Ico {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const PrinterIcon  = (p) => <Ico {...p} d={["M6 9V2h12v7","M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2","M6 14h12v8H6z"]} />;
const UploadIcon   = (p) => <Ico {...p} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M17 8l-5-5-5 5","M12 3v12"]} />;
const XIcon        = (p) => <Ico {...p} d="M18 6L6 18M6 6l12 12" />;
const ChevronIcon  = ({ down, ...p }) => <Ico {...p} d={down ? "M6 9l6 6 6-6" : "M18 15l-6-6-6 6"} />;
const ArrowLeft    = (p) => <Ico {...p} d="M19 12H5M12 5l-7 7 7 7" />;
const GridIcon     = (p) => <Ico {...p} d={["M3 3h7v7H3z","M14 3h7v7h-7z","M3 14h7v7H3z","M14 14h7v7h-7z"]} />;
const SendIcon     = (p) => <Ico {...p} d={["M22 2L11 13","M22 2L15 22l-4-9-9-4 20-7"]} />;

const TRANSACTION_LABELS = {
  RENEWAL: "Licence Renewal",
  REPLACEMENT: "Licence Replacement",
  AMENDMENT: "Licence Amendment",
};

const STATUS_STYLES = {
  DRAFT:           { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8",  label: "Draft" },
  SUBMITTED:       { bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6",  label: "Submitted" },
  UNDER_REVIEW:    { bg: "#fef9c3", color: "#854d0e", dot: "#f59e0b",  label: "Under Review" },
  PENDING_ITA:     { bg: "#f3e8ff", color: "#7e22ce", dot: "#a855f7",  label: "Pending ITA" },
  ACTION_REQUIRED: { bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444",  label: "Action Required" },
  RESUBMITTED:     { bg: "#e0e7ff", color: "#4338ca", dot: "#6366f1",  label: "Resubmitted" },
  ESCALATED:       { bg: "#fae8ff", color: "#86198f", dot: "#d946ef",  label: "Escalated" },
  APPROVED:        { bg: "#dcfce7", color: "#15803d", dot: "#22c55e",  label: "Approved" },
  REJECTED:        { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444",  label: "Rejected" },
};

const TIMELINE_STAGES = ["Draft", "Submitted", "Under Review", "Decision"];

const DOC_TYPE_LABELS = {
  licence_photo:          "Passport-style Photo",
  national_id_front:      "National ID (Front)",
  national_id_back:       "National ID (Back)",
  existing_licence_front: "Driver's Licence (Front)",
  existing_licence_back:  "Driver's Licence (Back)",
  police_report:          "Police Report",
  proof_of_address:       "Proof of Address",
  trustee_letter:         "Trustee Letter",
};

const DOC_TYPE_OPTIONS = [
  { value: "national_id_front",      label: "National ID (Front)" },
  { value: "national_id_back",       label: "National ID (Back)" },
  { value: "existing_licence_front", label: "Driver's Licence (Front)" },
  { value: "existing_licence_back",  label: "Driver's Licence (Back)" },
  { value: "licence_photo",          label: "Passport-style Photo" },
  { value: "police_report",          label: "Police Report" },
  { value: "proof_of_address",       label: "Proof of Address" },
  { value: "trustee_letter",         label: "Trustee Letter" },
];

const REVIEW_BADGE = {
  APPROVED: { bg: "#dcfce7", color: "#15803d", label: "Approved" },
  REJECTED: { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
  PENDING:  { bg: "#f1f5f9", color: "#475569", label: "Pending" },
};

const EVENT_LABELS = {
  CREATED:           "Application Created",
  STATUS_CHANGE:     "Status Updated",
  SUBMITTED:         "Application Submitted",
  RESUBMITTED:       "Documents Resubmitted",
  PAYMENT_CONFIRMED: "Payment Confirmed",
  REVIEW_STARTED:    "Review Started",
  ACTION_REQUIRED:   "Action Required",
  ITA_REQUESTED:     "ITA Clearance Requested",
  ESCALATED:         "Escalated to Supervisor",
  APPROVED:          "Application Approved",
  REJECTED:          "Application Rejected",
};

const EVENT_ICONS = {
  CREATED:           { icon: FileIcon,     bg: "#eff6ff", color: "#2563eb" },
  SUBMITTED:         { icon: SendIcon,     bg: "#eff6ff", color: "#2563eb" },
  PAYMENT_CONFIRMED: { icon: CreditIcon,   bg: "#f0fdf4", color: "#16a34a" },
  REVIEW_STARTED:    { icon: ClockIcon,    bg: "#fef9c3", color: "#d97706" },
  ACTION_REQUIRED:   { icon: AlertIcon,    bg: "#fef2f2", color: "#dc2626" },
  RESUBMITTED:       { icon: UploadIcon,   bg: "#e0e7ff", color: "#4338ca" },
  ITA_REQUESTED:     { icon: ShieldIcon,   bg: "#faf5ff", color: "#7e22ce" },
  ESCALATED:         { icon: ShieldIcon,   bg: "#fdf4ff", color: "#a21caf" },
  APPROVED:          { icon: CheckIcon,    bg: "#f0fdf4", color: "#16a34a" },
  REJECTED:          { icon: XIcon,        bg: "#fef2f2", color: "#dc2626" },
  STATUS_CHANGE:     { icon: ActivityIcon, bg: "#f8fafc", color: "#64748b" },
};

function stageIndex(s) {
  return ({ DRAFT:0, SUBMITTED:1, UNDER_REVIEW:2, PENDING_ITA:2, ACTION_REQUIRED:2, RESUBMITTED:2, ESCALATED:2, APPROVED:3, REJECTED:3 })[s] ?? 1;
}
function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-JM", { day: "numeric", month: "long", year: "numeric" });
}
function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function daysSince(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso)) / 86400000);
}

function SCard({ children, accent, leftBorder, style, cardRef }) {
  return (
    <div ref={cardRef} style={{ background: "white", borderRadius: "14px", border: "1px solid #e9e8e7", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden", display: "flex", ...style }}>
      {leftBorder && <div style={{ width: "4px", background: leftBorder, flexShrink: 0, borderRadius: "14px 0 0 14px" }} />}
      <div style={{ flex: 1, padding: "20px" }}>
        {accent && <div style={{ height: "3px", background: accent, margin: "-20px -20px 16px" }} />}
        {children}
      </div>
    </div>
  );
}

function SectionHead({ iconBg, icon, title, desc, right, toggle, open }) {
  return (
    <div onClick={toggle} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: open ? "16px" : 0, cursor: toggle ? "pointer" : "default" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize: "14px", fontWeight: "700", color: "#111827", margin: "0 0 2px" }}>{title}</p>
          {desc && <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0, lineHeight: 1.5 }}>{desc}</p>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginLeft: "12px", marginTop: "2px" }}>
        {right}
        {toggle && <ChevronIcon down={!open} size={15} stroke="#9ca3af" />}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "9px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontSize: "12px", color: "#6b7280", flexShrink: 0, marginRight: "16px" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: "600", color: "#111827", textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}

export default function ViewApplication() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const { state } = useAppState();
  const appId     = id || state.applicationId;
  const licenceRecord = state.licenceRecord;

  const [app,          setApp]          = useState(null);
  const [licence,      setLicence]      = useState(licenceRecord || null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [detailsOpen,  setDetailsOpen]  = useState(true);
  const [docsOpen,     setDocsOpen]     = useState(true);
  const [paymentOpen,  setPaymentOpen]  = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);
  const [uploads,      setUploads]      = useState([]);
  const [note,         setNote]         = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [submitError,  setSubmitError]  = useState("");
  const fileRef   = useRef(null);
  const actionRef = useRef(null);
  const printTime = new Date().toLocaleString("en-JM", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (!appId) { setError("No application ID."); setLoading(false); return; }
    const fetches = [api.get(`/api/applicant/applications/${appId}`)];
    if (!licenceRecord) fetches.push(api.get("/api/applicant/licence"));
    Promise.all(fetches)
      .then(([appRes, licRes]) => {
        setApp(appRes.data);
        if (licRes) setLicence(licRes.data);
        setLoading(false);
      })
      .catch(() => { setError("Could not load application."); setLoading(false); });
  }, [appId]);

  const handleFileAdd = (e) => {
    const newFiles = Array.from(e.target.files).map((f) => ({
      file: f,
      name: f.name,
      size: (f.size / 1024).toFixed(0) + " KB",
      doc_type: "national_id_front",
    }));
    setUploads((p) => [...p, ...newFiles]);
    e.target.value = "";
  };

  const handleResubmit = async () => {
    setSubmitting(true); setSubmitError("");
    try {
      for (const u of uploads) {
        const fd = new FormData();
        fd.append("file", u.file);
        fd.append("doc_type", u.doc_type);
        await api.post(
          `/api/applicant/applications/${appId}/documents`,
          fd,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }
      await api.post(`/api/applicant/applications/${appId}/submit`);
      setSubmitted(true);
      const r = await api.get(`/api/applicant/applications/${appId}`);
      setApp(r.data);
    } catch {
      setSubmitError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <DashboardLayout>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)", gap: "14px" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>Loading application…</p>
      </div>
    </DashboardLayout>
  );

  if (error || !app) return (
    <DashboardLayout>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)", gap: "16px" }}>
        <p style={{ fontSize: "15px", color: "#dc2626" }}>{error || "Application not found."}</p>
        <button onClick={() => navigate("/dashboard")} style={{ padding: "10px 20px", borderRadius: "8px", background: BRAND.primary, color: "white", border: "none", fontWeight: "700", cursor: "pointer" }}>
          Back to Dashboard
        </button>
      </div>
    </DashboardLayout>
  );

  const ss         = STATUS_STYLES[app.status] || STATUS_STYLES.SUBMITTED;
  const txLabel    = TRANSACTION_LABELS[app.transaction_type] || app.transaction_type;
  const stage      = stageIndex(app.status);
  const isAR       = ["ACTION_REQUIRED", "WAITING_ON_APPLICANT"].includes(app.status);
  const isApproved = app.status === "APPROVED";
  const isRejected = app.status === "REJECTED";
  const fee        = app.fee_amount ? `$${parseFloat(app.fee_amount).toLocaleString("en-JM", { minimumFractionDigits: 2 })}` : "—";
  const name       = licence ? `${licence.firstname} ${licence.lastname}` : "—";
  const cls        = licence?.licence_class || "—";
  const trn        = licence?.trn || "—";
  const daysAgo    = daysSince(app.submitted_at);

  return (
    <DashboardLayout>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          body * { visibility: hidden !important; }
          #print-receipt, #print-receipt * { visibility: visible !important; }
          #print-receipt { position: fixed !important; top:0; left:0; right:0; bottom:0; display:block !important; background:white; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      {/* ── Hidden print receipt ── */}
      <div id="print-receipt" style={{ display: "none" }}>
        <div style={{ width: "210mm", minHeight: "297mm", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "#111", background: "white", boxSizing: "border-box" }}>
          <div style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
              </div>
              <div>
                <p style={{ fontSize: "7px", fontWeight: "700", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 2px" }}>GOVERNMENT OF JAMAICA</p>
                <p style={{ fontSize: "14px", fontWeight: "800", color: "white", margin: "0 0 1px" }}>Tax Administration Jamaica</p>
                <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.6)", margin: 0 }}>Driver's Licence Renewal System · dlrsjam.gov.jm</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "7px", fontWeight: "700", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 3px" }}>Official Receipt</p>
              <p style={{ fontSize: "13px", fontWeight: "800", color: "white", margin: "0 0 2px", fontFamily: "monospace" }}>{app.application_number}</p>
              <p style={{ fontSize: "8px", color: "rgba(255,255,255,0.6)", margin: 0 }}>{printTime}</p>
            </div>
          </div>
          <div style={{ background: "#f0fdf4", borderBottom: "1px solid #bbf7d0", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M1.5 5l2.5 2.5 4.5-4.5" /></svg>
              </div>
              <p style={{ fontSize: "10px", fontWeight: "700", color: "#15803d", margin: 0 }}>Payment Confirmed — Application Submitted</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "7px", color: "#6b7280", margin: "0 0 1px" }}>Amount Paid</p>
              <p style={{ fontSize: "16px", fontWeight: "900", color: "#15803d", margin: 0 }}>{fee} <span style={{ fontSize: "9px" }}>JMD</span></p>
            </div>
          </div>
          <div style={{ padding: "18px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              {[
                { title: "Applicant", color: "#1e3a8a", rows: [["Full Name", name.toUpperCase()], ["TRN", trn], ["Licence Class", `Class ${cls}`], ["Date of Birth", licence?.date_of_birth || "—"], ["Address", licence ? [licence.address_line1, licence.address_line2, licence.parish].filter(Boolean).join(", ") : "—"]] },
                { title: "Application", color: "#374151", rows: [["Transaction", txLabel], ["Reference", app.application_number], ["Date Submitted", fmt(app.submitted_at)], ["Status", ss.label], ...(app.pickup_collectorate ? [["Pickup", app.pickup_collectorate]] : [])] },
              ].map(({ title, color, rows }) => (
                <div key={title} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{ background: color, padding: "6px 12px" }}>
                    <p style={{ fontSize: "8px", fontWeight: "800", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>{title}</p>
                  </div>
                  <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: "7px" }}>
                    {rows.map(([k, v]) => (
                      <div key={k} style={{ borderBottom: "1px solid #f9fafb", paddingBottom: "6px" }}>
                        <p style={{ fontSize: "7px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 1px" }}>{k}</p>
                        <p style={{ fontSize: "10px", fontWeight: "600", color: "#111827", margin: 0 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", marginBottom: "14px" }}>
              <div style={{ background: "#065f46", padding: "6px 12px" }}>
                <p style={{ fontSize: "8px", fontWeight: "800", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Payment</p>
              </div>
              <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                {[["Amount", `${fee} JMD`], ["Method", "Card (Stripe)"], ["Status", "PAID"], ["Date", fmt(app.payment_confirmed_at || app.submitted_at)]].map(([k, v]) => (
                  <div key={k}>
                    <p style={{ fontSize: "7px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 1px" }}>{k}</p>
                    <p style={{ fontSize: k === "Amount" ? "12px" : "10px", fontWeight: "700", color: k === "Status" ? "#16a34a" : "#111827", margin: 0 }}>{v}</p>
                  </div>
                ))}
              </div>
              {app.payment_reference && (
                <div style={{ padding: "0 12px 10px" }}>
                  <p style={{ fontSize: "7px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", margin: "0 0 1px" }}>Stripe Ref</p>
                  <p style={{ fontSize: "8px", color: "#6b7280", fontFamily: "monospace", margin: 0, wordBreak: "break-all" }}>{app.payment_reference}</p>
                </div>
              )}
            </div>
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px" }}>
              <p style={{ fontSize: "8px", fontWeight: "800", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>When Collecting Your Licence</p>
              <p style={{ fontSize: "9px", color: "#78350f", margin: 0, lineHeight: 1.7 }}>Bring this receipt · Valid photo ID · Confirmation email · Ref: {app.application_number} · Processing takes 5–7 business days after approval.</p>
            </div>
            <div style={{ borderTop: "2px solid #1e3a8a", paddingTop: "10px", display: "flex", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "9px", fontWeight: "800", color: "#1e3a8a", margin: "0 0 1px" }}>Tax Administration Jamaica</p>
                <p style={{ fontSize: "8px", color: "#6b7280", margin: 0 }}>support@dlrsjam.gov.jm · 1-876-XXX-XXXX · Mon–Fri 8AM–4PM</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "8px", color: "#9ca3af", margin: 0 }}>Official government receipt · Printed {printTime}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Page ── */}
      <div style={{ minHeight: "calc(100vh - 64px)", background: "#f5f6f8", display: "flex", flexDirection: "column" }}>

        {/* Hero header */}
        <div style={{ background: `linear-gradient(135deg, ${BRAND.primaryDeep} 0%, ${BRAND.primary} 100%)`, position: "relative", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "320px", height: "320px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
          <div style={{ position: "absolute", bottom: "-40px", left: "30%", width: "160px", height: "160px", borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
          <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 32px 0", position: "relative" }}>

            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button onClick={() => navigate("/dashboard")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "6px 12px", fontSize: "13px", fontWeight: "600", color: "white", cursor: "pointer" }}>
                  <ArrowLeft size={13} stroke="white" /> Dashboard
                </button>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px" }}>/</span>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", fontWeight: "500" }}>My Applications</span>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px" }}>/</span>
                <span style={{ fontSize: "13px", color: "white", fontWeight: "600", fontFamily: "monospace" }}>{app.application_number}</span>
              </div>
            </div>

            {/* Identity */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileIcon size={24} stroke="white" />
                </div>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: "700", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 4px" }}>
                    {app.transaction_type} APPLICATION
                  </p>
                  <h1 style={{ fontSize: "24px", fontWeight: "800", color: "white", margin: "0 0 8px", letterSpacing: "-0.4px" }}>{txLabel}</h1>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    {[
                      daysAgo !== null && `Submitted ${daysAgo === 0 ? "today" : `${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago`}`,
                      `Class ${cls}`,
                      app.fee_amount && `${fee} JMD paid`,
                      app.pickup_collectorate && app.pickup_collectorate.split("(")[0].trim(),
                    ].filter(Boolean).map((chip, i) => (
                      <span key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "999px", padding: "3px 10px", fontWeight: "500" }}>
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "12px", padding: "8px 16px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: ss.dot }} />
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "white", letterSpacing: "0.04em" }}>{ss.label}</span>
                </div>
              </div>
            </div>

            {/* Progress timeline */}
            <div style={{ background: "white", borderRadius: "16px 16px 0 0", padding: "22px 28px 8px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Application Progress</p>
                <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>Step {stage + 1} of {TIMELINE_STAGES.length}</p>
              </div>
              <div style={{ position: "relative", paddingBottom: "20px" }}>
                <div style={{ position: "absolute", top: "19px", left: "19px", right: "19px", height: "3px", background: "#f1f5f9", borderRadius: "3px" }} />
                <div style={{ position: "absolute", top: "19px", left: "19px", width: `calc(${(stage / (TIMELINE_STAGES.length - 1)) * 100}% * ((100% - 38px) / 100%))`, height: "3px", borderRadius: "3px", background: `linear-gradient(90deg, ${BRAND.primaryDeep}, ${BRAND.primary})`, transition: "width 0.8s ease" }} />
                <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
                  {TIMELINE_STAGES.map((label, i) => {
                    const done = i < stage, current = i === stage;
                    return (
                      <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", flex: 1 }}>
                        <div style={{ width: "38px", height: "38px", borderRadius: "50%", zIndex: 1, background: done ? BRAND.primaryDeep : current ? BRAND.primary : "white", border: `2px solid ${done ? BRAND.primaryDeep : current ? BRAND.primary : "#e2e8f0"}`, boxShadow: current ? `0 0 0 5px ${BRAND.primary}20` : done ? "0 2px 8px rgba(30,58,138,0.25)" : "none", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
                          {done ? <CheckIcon size={16} stroke="white" /> : current ? <ClockIcon size={16} stroke="white" /> : <span style={{ fontSize: "12px", fontWeight: "700", color: "#d1d5db" }}>{i + 1}</span>}
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontSize: "11px", fontWeight: i <= stage ? "700" : "500", color: i <= stage ? "#111827" : "#9ca3af", margin: 0 }}>{label}</p>
                          {current && <p style={{ fontSize: "10px", color: BRAND.primary, margin: "2px 0 0", fontWeight: "600" }}>Current</p>}
                          {done && <p style={{ fontSize: "10px", color: "#9ca3af", margin: "2px 0 0" }}>Done</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ background: "white", flex: 1 }}>
          <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px", alignItems: "start" }}>

              {/* LEFT SIDEBAR */}
              <div style={{ position: "sticky", top: "80px", display: "flex", flexDirection: "column", gap: "16px", paddingTop: "20px", paddingBottom: "40px" }}>

                <SCard leftBorder={BRAND.primary}>
                  <SectionHead iconBg={`${BRAND.primary}12`} icon={<UserIcon size={16} stroke={BRAND.primary} />} title="Applicant Details" desc="Personal information and licence details on file." toggle={() => setDetailsOpen(v => !v)} open={detailsOpen} />
                  {detailsOpen && (
                    <div>
                      {[["Full Name", name], ["TRN", trn], ["Licence Class", `Class ${cls}`], ["Date of Birth", licence?.date_of_birth || "—"], ["Occupation", licence?.occupation || "—"]].map(([k, v]) => <InfoRow key={k} label={k} value={v} />)}
                      {licence && <InfoRow label="Address" value={[licence.address_line1, licence.address_line2, licence.parish].filter(Boolean).join(", ")} />}
                    </div>
                  )}
                </SCard>

                <SCard leftBorder={isApproved ? "#22c55e" : BRAND.primary}>
                  <SectionHead iconBg={isApproved ? "#f0fdf4" : `${BRAND.primary}12`} icon={<MapPinIcon size={16} stroke={isApproved ? "#16a34a" : BRAND.primary} />} title="Pickup Location" desc="Where you'll collect your physical licence card." />
                  {app.pickup_collectorate ? (
                    <div style={{ background: isApproved ? "#f0fdf4" : "#f8fafc", border: `1px solid ${isApproved ? "#86efac" : "#e5e7eb"}`, borderRadius: "10px", padding: "12px 14px" }}>
                      <p style={{ fontSize: "13px", fontWeight: "700", color: "#111827", margin: "0 0 4px" }}>{app.pickup_collectorate}</p>
                      {isApproved
                        ? <p style={{ fontSize: "12px", color: "#16a34a", fontWeight: "600", margin: 0 }}>Ready for collection — bring ref: {app.application_number}</p>
                        : <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>Awaiting approval before collection</p>}
                    </div>
                  ) : <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>Not specified</p>}
                </SCard>

                <SCard leftBorder="#22c55e">
                  <SectionHead iconBg="#f0fdf4" icon={<CreditIcon size={16} stroke="#16a34a" />} title="Payment" desc="Fee paid to process this application." right={<span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 10px", borderRadius: "999px", background: "#dcfce7", color: "#15803d" }}>PAID</span>} toggle={() => setPaymentOpen(v => !v)} open={paymentOpen} />
                  {paymentOpen && (
                    <div>
                      {[["Amount", `${fee} JMD`], ["Method", "Card (Stripe)"], ["Date", fmt(app.payment_confirmed_at || app.submitted_at)]].map(([k, v]) => <InfoRow key={k} label={k} value={v} />)}
                      {app.payment_reference && (
                        <div style={{ paddingTop: "10px" }}>
                          <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 3px" }}>Stripe Reference</p>
                          <p style={{ fontSize: "10px", color: "#6b7280", fontFamily: "monospace", margin: 0, wordBreak: "break-all" }}>{app.payment_reference}</p>
                        </div>
                      )}
                    </div>
                  )}
                </SCard>

                <button
                  onClick={() => window.print()}
                  style={{ width: "100%", height: "44px", borderRadius: "10px", border: `1.5px solid ${BRAND.primary}`, background: "white", color: BRAND.primary, fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                >
                  <PrinterIcon size={14} stroke={BRAND.primary} /> Print Official Receipt
                </button>

              </div>

              {/* RIGHT CONTENT */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "20px", paddingBottom: "40px" }}>

                {/* Status banners */}
                {isAR && !submitted && (
                  <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: "14px", padding: "18px 20px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fecaca", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <AlertIcon size={18} stroke="#dc2626" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "14px", fontWeight: "800", color: "#991b1b", margin: "0 0 4px" }}>Action Required</p>
                        <p style={{ fontSize: "13px", color: "#b91c1c", margin: "0 0 12px", lineHeight: 1.6 }}>
                          {app.officer_comment || "The officer has requested additional information. Please upload the required documents below."}
                        </p>
                        <button onClick={() => actionRef.current?.scrollIntoView({ behavior: "smooth" })} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#dc2626", color: "white", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>
                          <UploadIcon size={13} stroke="white" /> Upload Documents ↓
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {app.status === "PENDING_ITA" && (
                  <div style={{ background: "#faf5ff", border: "1.5px solid #d8b4fe", borderRadius: "14px", padding: "18px 20px", display: "flex", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ShieldIcon size={18} stroke="#7e22ce" /></div>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: "800", color: "#6b21a8", margin: "0 0 4px" }}>Pending ITA Clearance</p>
                      <p style={{ fontSize: "13px", color: "#7e22ce", margin: 0, lineHeight: 1.6 }}>Your application has been forwarded to the Island Traffic Authority for traffic ticket clearance. This typically takes 3–5 business days. No action required from you at this time.</p>
                    </div>
                  </div>
                )}

                {app.status === "ESCALATED" && (
                  <div style={{ background: "#fdf4ff", border: "1.5px solid #f0abfc", borderRadius: "14px", padding: "18px 20px", display: "flex", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fae8ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ShieldIcon size={18} stroke="#a21caf" /></div>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: "800", color: "#86198f", margin: "0 0 4px" }}>Under Senior Review</p>
                      <p style={{ fontSize: "13px", color: "#a21caf", margin: 0, lineHeight: 1.6 }}>Your application has been escalated to a senior TAJ supervisor. You will be notified by email once a decision is made.</p>
                    </div>
                  </div>
                )}

                {isApproved && (
                  <div style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1.5px solid #86efac", borderRadius: "14px", padding: "18px 20px", display: "flex", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CheckIcon size={18} stroke="white" /></div>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: "800", color: "#15803d", margin: "0 0 4px" }}>Application Approved</p>
                      <p style={{ fontSize: "13px", color: "#16a34a", margin: 0, lineHeight: 1.6 }}>Your licence is being prepared for collection at <strong>{app.pickup_collectorate || "your selected TAJ office"}</strong>. Bring reference <strong>{app.application_number}</strong> when collecting.</p>
                    </div>
                  </div>
                )}

                {isRejected && (
                  <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: "14px", padding: "18px 20px", display: "flex", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fecaca", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><XIcon size={18} stroke="#dc2626" /></div>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: "800", color: "#991b1b", margin: "0 0 4px" }}>Application Rejected</p>
                      <p style={{ fontSize: "13px", color: "#b91c1c", margin: 0, lineHeight: 1.6 }}>{app.officer_comment || "Your application was not approved. Please visit your nearest TAJ office for assistance."}</p>
                    </div>
                  </div>
                )}

                {submitted && <InfoBanner type="success" message="Documents submitted successfully. Your application is back under review." />}

                {/* Documents grid */}
                <SCard leftBorder="#f59e0b">
                  <SectionHead iconBg="#fffbeb" icon={<GridIcon size={16} stroke="#d97706" />} title="Documents Submitted" desc="All documents uploaded as part of this application. Officers review these for authenticity and validity." toggle={() => setDocsOpen(v => !v)} open={docsOpen} />
                  {docsOpen && (
                    <div>
                      {app.documents && app.documents.length > 0 ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
                          {app.documents.map((doc) => {
                            const badge = REVIEW_BADGE[doc.review_status] || REVIEW_BADGE.PENDING;
                            return (
                              <div key={doc.id} style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px", background: "#fafafa", display: "flex", flexDirection: "column", gap: "8px" }}>
                                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <FileIcon size={18} stroke="#6b7280" />
                                </div>
                                <div>
                                  <p style={{ fontSize: "12px", fontWeight: "700", color: "#111827", margin: "0 0 6px", lineHeight: 1.3 }}>
                                    {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                                  </p>
                                  <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "999px", background: badge.bg, color: badge.color }}>
                                    {badge.label}
                                  </span>
                                </div>
                                {doc.ai_check_comment && (
                                  <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0, lineHeight: 1.4 }}>{doc.ai_check_comment}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>No documents on record.</p>
                      )}
                      <p style={{ fontSize: "11px", color: "#9ca3af", margin: "12px 0 0", fontStyle: "italic" }}>
                        Document contents are securely stored and visible only to processing officers.
                      </p>
                    </div>
                  )}
                </SCard>

                {/* Resubmission panel */}
                {isAR && !submitted && (
                  <SCard leftBorder="#ef4444" style={{ border: "1.5px solid #fca5a5" }} cardRef={actionRef}>
                    <SectionHead iconBg="#fef2f2" icon={<UploadIcon size={16} stroke="#dc2626" />} title="Respond to Officer" desc="Upload the documents the officer requested and submit your response." open={true} />

                    {app.officer_comment && (
                      <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "14px 16px", marginBottom: "16px" }}>
                        <p style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Officer's Request</p>
                        <p style={{ fontSize: "13px", color: "#991b1b", margin: 0, lineHeight: 1.6 }}>"{app.officer_comment}"</p>
                      </div>
                    )}

                    <div
                      onClick={() => fileRef.current?.click()}
                      style={{ border: "2px dashed #fca5a5", borderRadius: "12px", padding: "28px", textAlign: "center", cursor: "pointer", background: "#fff5f5", marginBottom: "12px" }}
                    >
                      <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#fecaca", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                        <UploadIcon size={20} stroke="#dc2626" />
                      </div>
                      <p style={{ fontSize: "13px", fontWeight: "700", color: "#991b1b", margin: "0 0 4px" }}>Click to upload documents</p>
                      <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>JPG, PNG or PDF · max 5MB each</p>
                      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" multiple style={{ display: "none" }} onChange={handleFileAdd} />
                    </div>

                    {uploads.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                        {uploads.map((u, i) => (
                          <div key={i} style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <FileIcon size={13} stroke="#6b7280" />
                                <span style={{ fontSize: "13px", color: "#374151", fontWeight: "600" }}>{u.name}</span>
                                <span style={{ fontSize: "11px", color: "#9ca3af" }}>{u.size}</span>
                              </div>
                              <button onClick={() => setUploads(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer" }}>
                                <XIcon size={14} stroke="#9ca3af" />
                              </button>
                            </div>
                            {/* Doc type selector per file */}
                            <select
                              value={u.doc_type}
                              onChange={(e) => setUploads(p => p.map((f, j) => j === i ? { ...f, doc_type: e.target.value } : f))}
                              style={{ width: "100%", height: "36px", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "0 10px", fontSize: "12px", color: "#374151", background: "white", fontFamily: "inherit", outline: "none" }}
                            >
                              {DOC_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#374151", display: "block", marginBottom: "6px" }}>
                        Note to Officer <span style={{ fontWeight: "400", color: "#9ca3af" }}>(optional)</span>
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add context about the resubmitted documents…"
                        rows={3}
                        style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                      />
                    </div>

                    {submitError && <div style={{ marginBottom: "10px" }}><InfoBanner type="error" message={submitError} /></div>}

                    <button
                      onClick={handleResubmit}
                      disabled={submitting || uploads.length === 0}
                      style={{ width: "100%", height: "48px", borderRadius: "10px", border: "none", background: submitting || uploads.length === 0 ? "#94a3b8" : "#dc2626", color: "white", fontSize: "14px", fontWeight: "700", cursor: submitting || uploads.length === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                    >
                      {submitting ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
                            <path d="M21 12a9 9 0 11-6.219-8.56" />
                          </svg>
                          Submitting…
                        </>
                      ) : "Submit Response to Officer →"}
                    </button>
                  </SCard>
                )}

                {/* Activity log */}
                <SCard accent="#e2e8f0">
                  <SectionHead iconBg="#f8fafc" icon={<ActivityIcon size={16} stroke="#6b7280" />} title="Activity Log" desc="A complete timeline of every action taken on this application." toggle={() => setActivityOpen(v => !v)} open={activityOpen} />
                  {activityOpen && (
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: "17px", top: "18px", bottom: "18px", width: "1px", background: "#e5e7eb" }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {app.events && [...app.events].reverse().map((ev, i) => {
                          const evStyle = EVENT_ICONS[ev.event_type] || EVENT_ICONS.STATUS_CHANGE;
                          const EvIcon = evStyle.icon;
                          const evLabel = EVENT_LABELS[ev.event_type] || ev.event_type?.replace(/_/g, " ");
                          return (
                            <div key={ev.id} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                              <div style={{ width: "34px", height: "34px", borderRadius: "10px", flexShrink: 0, zIndex: 1, background: evStyle.bg, border: `1px solid ${evStyle.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <EvIcon size={15} stroke={evStyle.color} />
                              </div>
                              <div style={{ flex: 1, padding: "10px 14px", borderRadius: "10px", background: i === 0 ? "#f8faff" : "#fafafa", border: `1px solid ${i === 0 ? "#dbeafe" : "#f3f4f6"}` }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#111827", margin: 0 }}>{evLabel}</p>
                                  <span style={{ fontSize: "11px", color: "#9ca3af", whiteSpace: "nowrap", flexShrink: 0 }}>{fmtTime(ev.created_at)}</span>
                                </div>
                                {ev.triggered_by && <p style={{ fontSize: "11px", color: "#9ca3af", margin: "2px 0 0" }}>by {ev.triggered_by}</p>}
                                {ev.comment && (
                                  <p style={{ fontSize: "12px", color: "#6b7280", margin: "6px 0 0", padding: "8px 12px", background: "white", borderRadius: "8px", border: "1px solid #f3f4f6", lineHeight: 1.6, fontStyle: "italic" }}>
                                    "{ev.comment}"
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </SCard>

              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
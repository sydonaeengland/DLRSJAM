// Detailed view of a single submitted application — timeline, documents, and officer decision.
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppState } from "../../../context/ApplicationContext";
import { BRAND } from "../../../config/theme";
import api from "../../../services/api";
import InfoBanner from "../../../components/apply/InfoBanner";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import ReceiptDocument from "../../../components/applicant/ReceiptDocument";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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
const DownloadIcon = (p) => <Ico {...p} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"]} />;

const TRANSACTION_LABELS = { RENEWAL: "Licence Renewal", REPLACEMENT: "Licence Replacement", AMENDMENT: "Licence Amendment" };

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
  passport_photo:         "Passport-Size Photo",
  national_id_front:      "National ID — Front",
  national_id_back:       "National ID — Back",
  existing_licence_front: "Current Licence — Front",
  existing_licence_back:  "Current Licence — Back",
  police_report:          "Police Report (Lost Licence)",
  proof_of_address:       "Proof of Address",
  trustee_letter:         "Authorisation Letter (Trustee)",
  licence_photo:          "Photo for New Licence",
  verification_photo:     "Identity Verification Photo",
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
  APPROVED:            { icon: CheckIcon,    bg: "#f0fdf4", color: "#16a34a" },
  REJECTED:            { icon: XIcon,        bg: "#fef2f2", color: "#dc2626" },
  SUPERVISOR_DECISION: { icon: ShieldIcon,   bg: "#f5f3ff", color: "#7c3aed" },
  STATUS_CHANGE:       { icon: ActivityIcon, bg: "#f8fafc", color: "#64748b" },
};

const DOC_ICON_STYLES = {
  passport_photo:         { bg: "#eff6ff", stroke: "#2563eb" },
  national_id_front:      { bg: "#f0fdf4", stroke: "#16a34a" },
  national_id_back:       { bg: "#f0fdf4", stroke: "#16a34a" },
  existing_licence_front: { bg: "#fdf4ff", stroke: "#9333ea" },
  existing_licence_back:  { bg: "#fdf4ff", stroke: "#9333ea" },
  police_report:          { bg: "#fef2f2", stroke: "#dc2626" },
  proof_of_address:       { bg: "#fff7ed", stroke: "#ea580c" },
  trustee_letter:         { bg: "#fefce8", stroke: "#ca8a04" },
  licence_photo:          { bg: "#f0fdf4", stroke: "#16a34a" },
  verification_photo:     { bg: "#eff6ff", stroke: "#2563eb" },
};

function DocRow({ doc, appId }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [blobUrl, setBlobUrl]     = useState(null);
  const [mimeType, setMimeType]   = useState(null);

  const open = async () => {
    setModalOpen(true);
    if (blobUrl) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/applicant/applications/${appId}/documents/${doc.id}/file`, { responseType: "blob" });
      setBlobUrl(URL.createObjectURL(res.data));
      setMimeType(res.data.type);
    } catch { alert("Could not load document."); setModalOpen(false); }
    finally { setLoading(false); }
  };

  const close = () => setModalOpen(false);

  const iconStyle = DOC_ICON_STYLES[doc.doc_type] || { bg: "#f1f5f9", stroke: "#6b7280" };
  const uploadedDate = doc.uploaded_at
    ? new Date(doc.uploaded_at.endsWith("Z") ? doc.uploaded_at : doc.uploaded_at + "Z")
        .toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Jamaica" })
    : null;

  return (
    <>
      <div
        onClick={open}
        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 14px", background: "#fafafa", border: "1px solid #f3f4f6", borderRadius: "10px", cursor: "pointer" }}
        onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
        onMouseLeave={e => e.currentTarget.style.background = "#fafafa"}
      >
        <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: iconStyle.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <FileIcon size={16} stroke={iconStyle.stroke} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b", margin: 0 }}>{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</p>
          {uploadedDate && <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0" }}>Uploaded {uploadedDate}</p>}
        </div>
        <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: "white", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
      </div>

      {modalOpen && (
        <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: "16px", overflow: "hidden", width: "100%", maxWidth: "780px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: "14px", fontWeight: "700", color: "#111827", margin: 0 }}>{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</p>
                {uploadedDate && <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0" }}>Uploaded {uploadedDate}</p>}
              </div>
              <button onClick={close} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <XIcon size={15} stroke="#6b7280" />
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Loading document…</p>
                </div>
              ) : mimeType?.startsWith("image/") ? (
                <img src={blobUrl} alt={doc.doc_type} style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", display: "block" }} />
              ) : (
                <iframe src={blobUrl} title={doc.doc_type} style={{ width: "100%", height: "75vh", border: "none" }} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function stageIndex(s) {
  return ({ DRAFT:0, SUBMITTED:1, UNDER_REVIEW:2, PENDING_ITA:2, ACTION_REQUIRED:2, RESUBMITTED:2, ESCALATED:2, APPROVED:3, REJECTED:3 })[s] ?? 1;
}
function parseUTC(iso) { if (!iso) return null; return new Date(iso.endsWith("Z") ? iso : iso + "Z"); }
function fmt(iso) { const d = parseUTC(iso); if (!d) return "—"; return d.toLocaleDateString("en-JM", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Jamaica" }); }
function fmtTime(iso) { const d = parseUTC(iso); if (!d) return "—"; return d.toLocaleString("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Jamaica" }); }

function SCard({ children, leftBorder, style, cardRef }) {
  return (
    <div ref={cardRef} style={{ background: "white", borderRadius: "14px", border: "1px solid #e9e8e7", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden", display: "flex", ...style }}>
      {leftBorder && <div style={{ width: "4px", background: leftBorder, flexShrink: 0 }} />}
      <div style={{ flex: 1, padding: "20px" }}>{children}</div>
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
  const navigate      = useNavigate();
  const { id }        = useParams();
  const { state, update } = useAppState();
  const appId         = id || state.applicationId;
  const licenceRecord = state.licenceRecord;

  const [app,          setApp]          = useState(null);
  const [licence,      setLicence]      = useState(licenceRecord || null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [showReceipt,  setShowReceipt]  = useState(false);
  const [downloading,  setDownloading]  = useState(false);
  const [detailsOpen,  setDetailsOpen]  = useState(true);
  const [docsOpen,      setDocsOpen]      = useState(false);
  const [paymentOpen,   setPaymentOpen]   = useState(false);
  const [decisionOpen,  setDecisionOpen]  = useState(true);
  const [activityOpen,  setActivityOpen]  = useState(true);
  const [docUploads,   setDocUploads]   = useState({}); // { doc_type: File }
  const [aiResults,    setAiResults]    = useState({}); // { doc_type: { quality, score, message, checking } }
  const [note,         setNote]         = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [submitError,  setSubmitError]  = useState("");

  const actionRef    = useRef(null);
  const receiptRef   = useRef(null);
  const printTime    = new Date().toLocaleString("en-JM", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

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

  const downloadAsPdf = async () => {
    if (!receiptRef.current) return;
    setDownloading(true);
    try {
      const el = receiptRef.current;
      const scrollParent = el.parentElement;

      // Expand scroll container so html2canvas sees the full height
      const prevOverflow = scrollParent.style.overflow;
      const prevHeight   = scrollParent.style.height;
      scrollParent.style.overflow = "visible";
      scrollParent.style.height   = "auto";

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });

      scrollParent.style.overflow = prevOverflow;
      scrollParent.style.height   = prevHeight;

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
      pdf.save(`DLRSJAM-Receipt-${app.application_number}.pdf`);
    } catch { alert("Could not generate PDF."); }
    finally { setDownloading(false); }
  };

  const runAiCheck = async (docType, file) => {
    setAiResults(p => ({ ...p, [docType]: { checking: true } }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", docType);
      const res = await api.post("/api/applicant/documents/quality-check", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setAiResults(p => ({ ...p, [docType]: { ...res.data, checking: false } }));
    } catch {
      setAiResults(p => ({ ...p, [docType]: { quality: "good", score: null, message: "Quality check unavailable.", checking: false } }));
    }
  };

  const handleResubmit = async () => {
    setSubmitting(true); setSubmitError("");
    try {
      for (const [docType, file] of Object.entries(docUploads)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("doc_type", docType);
        const uploadRes = await api.post(`/api/applicant/applications/${appId}/documents`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        // Save AI result to the newly created document
        const aiResult = aiResults[docType];
        if (aiResult && !aiResult.checking && uploadRes.data?.id) {
          try {
            await api.patch(`/api/applicant/applications/${appId}/documents/${uploadRes.data.id}/ai-result`, {
              ai_check_passed: aiResult.quality === "good",
              ai_check_score: aiResult.score,
              ai_check_comment: aiResult.message,
            });
          } catch { /* non-fatal */ }
        }
      }
      await api.post(`/api/applicant/applications/${appId}/submit`);
      setSubmitted(true);
      const r = await api.get(`/api/applicant/applications/${appId}`);
      setApp(r.data);
    } catch { setSubmitError("Failed to submit. Please try again."); }
    finally { setSubmitting(false); }
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
  const name       = licence ? [licence.firstname, licence.middlename, licence.lastname].filter(Boolean).join(" ") : "—";
  const cls        = licence?.licence_class || "—";

  return (
    <DashboardLayout>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Receipt modal */}
      {showReceipt && (
        <div
          onClick={() => setShowReceipt(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", borderRadius: "16px", overflow: "hidden", width: "100%", maxWidth: "700px", height: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}
          >
            {/* Toolbar */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: "14px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 1px" }}>Official Receipt</p>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>Save a copy for your records</p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={downloadAsPdf}
                  disabled={downloading}
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 12px", borderRadius: "8px", border: "none", background: BRAND.primary, fontSize: "12px", fontWeight: "700", color: "white", cursor: downloading ? "wait" : "pointer" }}
                >
                  <DownloadIcon size={12} stroke="white" />
                  {downloading ? "Generating…" : "Download PDF"}
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <XIcon size={15} stroke="#6b7280" />
                </button>
              </div>
            </div>

            {/* Receipt body */}
            <div style={{ overflowY: "auto" }}>
              <div style={{ padding: "20px" }}>
                <ReceiptDocument ref={receiptRef} app={app} licence={licence} printTime={printTime} />
              </div>
            </div>
        </div>
        </div>
      )}

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
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>My Applications</span>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px" }}>/</span>
                <span style={{ fontSize: "13px", color: "white", fontWeight: "600", fontFamily: "monospace" }}>{app.application_number}</span>
              </div>
              <button onClick={() => setShowReceipt(true)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "6px 14px", fontSize: "13px", fontWeight: "600", color: "white", cursor: "pointer" }}>
                <PrinterIcon size={14} stroke="white" /> View Receipt
              </button>
            </div>

            {/* Identity */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileIcon size={24} stroke="white" />
                </div>
                <div>
                  <p style={{ fontSize: "11px", fontWeight: "700", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 4px" }}>{app.transaction_type} APPLICATION</p>
                  <h1 style={{ fontSize: "24px", fontWeight: "800", color: "white", margin: "0 0 8px", letterSpacing: "-0.4px" }}>{txLabel}</h1>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    {[
                      app.submitted_at && `Submitted ${fmtTime(app.submitted_at)}`,
                      `Class ${cls}`,
                      app.fee_amount && `${fee} JMD paid`,
                      app.pickup_collectorate && app.pickup_collectorate.split("(")[0].trim(),
                    ].filter(Boolean).map((chip, i) => (
                      <span key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "999px", padding: "3px 10px", fontWeight: "500" }}>{chip}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "12px", padding: "8px 16px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: ss.dot }} />
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "white", letterSpacing: "0.04em" }}>{ss.label}</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ background: "white", borderRadius: "16px 16px 0 0", padding: "22px 28px 8px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <p style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Application Progress</p>
                <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>Step {stage + 1} of {TIMELINE_STAGES.length}</p>
              </div>
              <div style={{ position: "relative", paddingBottom: "20px" }}>
                <div style={{ position: "absolute", top: "19px", left: "19px", right: "19px", height: "3px", background: "#f1f5f9", borderRadius: "3px" }} />
                <div style={{ position: "absolute", top: "19px", left: "19px", width: `${(stage / (TIMELINE_STAGES.length - 1)) * 100}%`, height: "3px", borderRadius: "3px", background: `linear-gradient(90deg, ${BRAND.primaryDeep}, ${BRAND.primary})`, transition: "width 0.8s ease" }} />
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
                          {done    && <p style={{ fontSize: "10px", color: "#9ca3af", margin: "2px 0 0" }}>Done</p>}
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
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "24px", alignItems: "start" }}>

              {/* LEFT STICKY SIDEBAR */}
              <div style={{ position: "sticky", top: "80px", display: "flex", flexDirection: "column", gap: "16px", paddingTop: "20px", paddingBottom: "40px" }}>

                <SCard leftBorder={BRAND.primary}>
                  <SectionHead iconBg={`${BRAND.primary}12`} icon={<UserIcon size={16} stroke={BRAND.primary} />} title="Applicant Details" desc="Personal information and licence details on file." toggle={() => setDetailsOpen(v => !v)} open={detailsOpen} />
                  {detailsOpen && (
                    <div>
                      {[["Full Name", name], ["TRN", licence?.trn || "—"], ["Licence Class", `Class ${cls}`], ["Date of Birth", licence?.date_of_birth || "—"], ["Occupation", licence?.occupation || "—"]].map(([k, v]) => <InfoRow key={k} label={k} value={v} />)}
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
                      {app.payment_reference && <div style={{ paddingTop: "10px" }}><p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 3px" }}>Stripe Reference</p><p style={{ fontSize: "10px", color: "#6b7280", fontFamily: "monospace", margin: 0, wordBreak: "break-all" }}>{app.payment_reference}</p></div>}
                    </div>
                  )}
                </SCard>

                {(app.status === "PENDING_ITA" || (app.ita_correspondence && app.ita_correspondence.length > 0)) && (() => {
                  const itaCorr = app.ita_correspondence ?? [];
                  const outgoing = itaCorr.find(c => c.direction === "OUTGOING");
                  const incoming = itaCorr.find(c => c.direction === "INCOMING");
                  const cleared  = incoming?.outcome === "CLEARED";
                  const rejected = incoming?.outcome === "NOT_CLEARED";
                  const pending  = !incoming;
                  const borderColor = cleared ? "#86efac" : rejected ? "#fca5a5" : "#d8b4fe";
                  const bgColor     = cleared ? "#f0fdf4" : rejected ? "#fef2f2" : "#faf5ff";
                  const iconColor   = cleared ? "#16a34a" : rejected ? "#dc2626" : "#7e22ce";
                  const titleColor  = cleared ? "#15803d" : rejected ? "#991b1b" : "#6b21a8";
                  return (
                    <SCard leftBorder={iconColor}>
                      <SectionHead
                        iconBg={bgColor}
                        icon={<ShieldIcon size={16} stroke={iconColor} />}
                        title="ITA Clearance"
                        desc="Island Traffic Authority verification."
                        right={
                          <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "999px", background: bgColor, color: iconColor, border: `1px solid ${borderColor}`, whiteSpace: "nowrap" }}>
                            {cleared ? "CLEARED" : rejected ? "NOT CLEARED" : "PENDING"}
                          </span>
                        }
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {outgoing && (
                          <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "8px", padding: "10px 12px" }}>
                            <p style={{ fontSize: "11px", fontWeight: "700", color: "#7e22ce", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Request Sent</p>
                            {outgoing.ita_reference && <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 2px" }}>Ref: <span style={{ fontFamily: "monospace", color: "#374151" }}>{outgoing.ita_reference}</span></p>}
                            <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>{outgoing.sent_at ? new Date(outgoing.sent_at.endsWith("Z") ? outgoing.sent_at : outgoing.sent_at + "Z").toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
                          </div>
                        )}
                        {incoming ? (
                          <div style={{ background: cleared ? "#f0fdf4" : "#fef2f2", border: `1px solid ${cleared ? "#bbf7d0" : "#fecaca"}`, borderRadius: "8px", padding: "10px 12px" }}>
                            <p style={{ fontSize: "11px", fontWeight: "700", color: iconColor, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {cleared ? "Clearance Received" : "Clearance Denied"}
                            </p>
                            <p style={{ fontSize: "12px", color: titleColor, margin: 0, lineHeight: 1.5 }}>
                              {cleared ? "ITA has confirmed clearance. Your application is proceeding." : "ITA clearance was not granted. An officer will contact you."}
                            </p>
                          </div>
                        ) : (
                          <p style={{ fontSize: "12px", color: "#7e22ce", margin: 0, lineHeight: 1.5 }}>
                            Awaiting response from the Island Traffic Authority. This typically takes 3–5 business days.
                          </p>
                        )}
                      </div>
                    </SCard>
                  );
                })()}

                <button
                  onClick={() => setShowReceipt(true)}
                  style={{ width: "100%", height: "44px", borderRadius: "10px", border: `1.5px solid ${BRAND.primary}`, background: "white", color: BRAND.primary, fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                >
                  <PrinterIcon size={14} stroke={BRAND.primary} /> View Receipt
                </button>
              </div>

              {/* RIGHT CONTENT */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "20px", paddingBottom: "40px" }}>

                {/* Verification status card */}
                {app.verification_attempts > 0 && (
                  <div style={{ background: app.reverification_requested ? "#fef9c3" : app.verification_passed ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : app.needs_manual_review ? "#fff7ed" : "#f8fafc", border: `1.5px solid ${app.reverification_requested ? "#fde68a" : app.verification_passed ? "#86efac" : app.needs_manual_review ? "#fed7aa" : "#e2e8f0"}`, borderRadius: "14px", padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: app.reverification_requested ? "#fef3c7" : app.verification_passed ? "#dcfce7" : "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <ShieldIcon size={18} stroke={app.reverification_requested ? "#d97706" : app.verification_passed ? "#16a34a" : "#dc2626"} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "14px", fontWeight: "800", color: app.reverification_requested ? "#92400e" : app.verification_passed ? "#15803d" : "#991b1b", margin: "0 0 3px" }}>
                          {app.reverification_requested
                            ? "Re-verification Required"
                            : app.verification_passed
                            ? "Identity Verified"
                            : "Identity Pending Manual Review"}
                        </p>
                        <p style={{ fontSize: "12px", color: app.reverification_requested ? "#a16207" : app.verification_passed ? "#16a34a" : "#b45309", margin: 0, lineHeight: 1.5 }}>
                          {app.reverification_requested
                            ? "An officer has asked you to redo your identity verification. Click below to complete it."
                            : app.verification_passed
                            ? `Verified on ${new Date(app.verified_at.endsWith("Z") ? app.verified_at : app.verified_at + "Z").toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Jamaica" })}.`
                            : `Verification was not completed automatically. A licensing officer will review your identity.`}
                        </p>
                      </div>
                    </div>
                    {app.reverification_requested && (
                      <button
                        onClick={() => { update({ applicationId: app.id }); navigate("/apply/verification"); }}
                        style={{ marginTop: "12px", width: "100%", height: "40px", background: "#d97706", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}
                      >
                        Start Re-verification
                      </button>
                    )}
                  </div>
                )}

                {isAR && !submitted && (() => {
                  const resubmitDocs = (app.documents || []).filter(d => d.review_status === "RESUBMIT_REQUIRED");
                  const readyCount   = resubmitDocs.filter(d => docUploads[d.doc_type]).length;
                  const totalCount   = resubmitDocs.length;
                  return (
                    <div style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fef2f2 100%)", border: "2px solid #fb923c", borderRadius: "16px", overflow: "hidden" }}>
                      {/* Header strip */}
                      <div style={{ background: "linear-gradient(90deg, #ea580c, #dc2626)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <AlertIcon size={16} stroke="white" />
                          </div>
                          <div>
                            <p style={{ fontSize: "14px", fontWeight: "800", color: "white", margin: 0, letterSpacing: "-0.2px" }}>Action Required — Resubmission</p>
                            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)", margin: 0, marginTop: "2px" }}>An officer has reviewed your application and needs updated documents</p>
                          </div>
                        </div>
                        {totalCount > 0 && (
                          <div style={{ flexShrink: 0, background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: "999px", padding: "4px 12px", textAlign: "center" }}>
                            <p style={{ fontSize: "12px", fontWeight: "800", color: "white", margin: 0 }}>{readyCount}/{totalCount}</p>
                            <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.75)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>ready</p>
                          </div>
                        )}
                      </div>

                      <div style={{ padding: "18px 20px" }}>
                        {/* Officer message */}
                        {app.officer_comment && (
                          <div style={{ background: "white", border: "1px solid #fed7aa", borderRadius: "10px", padding: "12px 14px", marginBottom: "16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                            <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: "11px", fontWeight: "700", color: "#9a3412", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Officer&apos;s message</p>
                              <p style={{ fontSize: "13px", color: "#7c2d12", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>&ldquo;{app.officer_comment}&rdquo;</p>
                            </div>
                          </div>
                        )}

                        {/* What to do steps */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                          {[
                            { n: "1", text: "Review each document the officer flagged below" },
                            { n: "2", text: "Upload a clear, updated version of each file" },
                            { n: "3", text: "Click Submit to send your response" },
                          ].map(step => (
                            <div key={step.n} style={{ flex: 1, background: "white", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px", textAlign: "center" }}>
                              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#ea580c", color: "white", fontSize: "11px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>{step.n}</div>
                              <p style={{ fontSize: "11px", color: "#374151", lineHeight: 1.5, margin: 0 }}>{step.text}</p>
                            </div>
                          ))}
                        </div>

                        <button onClick={() => actionRef.current?.scrollIntoView({ behavior: "smooth" })} style={{ width: "100%", height: "40px", borderRadius: "8px", border: "none", background: "#ea580c", color: "white", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}>
                          <UploadIcon size={13} stroke="white" /> Go to Upload Section ↓
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {app.status === "PENDING_ITA" && (
                  <div style={{ background: "#faf5ff", border: "1.5px solid #d8b4fe", borderRadius: "14px", padding: "18px 20px", display: "flex", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ShieldIcon size={18} stroke="#7e22ce" /></div>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: "800", color: "#6b21a8", margin: "0 0 4px" }}>Pending ITA Clearance</p>
                      <p style={{ fontSize: "13px", color: "#7e22ce", margin: 0, lineHeight: 1.6 }}>Your application has been forwarded to the Island Traffic Authority for clearance. This typically takes 3–5 business days. No action required.</p>
                    </div>
                  </div>
                )}

                {app.status === "ESCALATED" && (
                  <div style={{ background: "#fdf4ff", border: "1.5px solid #f0abfc", borderRadius: "14px", padding: "18px 20px", display: "flex", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fae8ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ShieldIcon size={18} stroke="#a21caf" /></div>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: "800", color: "#86198f", margin: "0 0 4px" }}>Under Senior Review</p>
                      <p style={{ fontSize: "13px", color: "#a21caf", margin: 0, lineHeight: 1.6 }}>Your application has been escalated to a senior supervisor. You will be notified by email once a decision is made.</p>
                    </div>
                  </div>
                )}

                {isApproved && (
                  <div style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "1.5px solid #86efac", borderRadius: "14px", padding: "18px 20px", display: "flex", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CheckIcon size={18} stroke="white" /></div>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: "800", color: "#15803d", margin: "0 0 4px" }}>Application Approved</p>
                      <p style={{ fontSize: "13px", color: "#16a34a", margin: 0, lineHeight: 1.6 }}>Your licence is being prepared at <strong>{app.pickup_collectorate || "your selected TAJ office"}</strong>. Bring reference <strong>{app.application_number}</strong> when collecting.</p>
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

                {submitted && <InfoBanner type="success" message="Documents submitted. Your application is back under review." />}

                {/* Decision Record (completed apps) */}
                {(isApproved || isRejected) && (app.officer_decision || app.supervisor_decision) && (() => {
                  const od = app.officer_decision;
                  const sd = app.supervisor_decision;
                  const fmtDt = iso => iso ? new Date(iso.endsWith("Z") ? iso : iso + "Z").toLocaleString("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Jamaica" }) : "—";
                  const SigBox = ({ sig, name, ts }) => sig ? (
                    <div style={{ background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" }}>
                      <img src={sig} alt={`${name} signature`} style={{ display: "block", height: 40, objectFit: "contain", objectPosition: "left", maxWidth: "100%", marginBottom: 6 }} />
                      <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>{name} · {fmtDt(ts)}</p>
                    </div>
                  ) : null;
                  return (
                    <SCard leftBorder={isApproved ? "#22c55e" : "#ef4444"}>
                      <SectionHead
                        iconBg={isApproved ? "#f0fdf4" : "#fef2f2"}
                        icon={isApproved ? <CheckIcon size={16} stroke="#16a34a" /> : <XIcon size={16} stroke="#dc2626" />}
                        title="Decision Record"
                        desc={`Final decision details and authorising signatures`}
                        toggle={() => setDecisionOpen(v => !v)}
                        open={decisionOpen}
                      />
                      {decisionOpen && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "16px 20px" }}>

                          {/* Officer decision */}
                          {od && (
                            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px" }}>
                              <p style={{ fontSize: "10px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Officer Decision</p>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
                                <div>
                                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#111827", margin: "0 0 2px" }}>{od.officer_name}</p>
                                  {od.officer_staff_id && <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0, fontFamily: "monospace" }}>{od.officer_staff_id}</p>}
                                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: "3px 0 0" }}>{fmtDt(od.timestamp)}</p>
                                </div>
                                <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "999px", background: od.decision === "APPROVED" ? "#dcfce7" : "#fee2e2", color: od.decision === "APPROVED" ? "#15803d" : "#991b1b", flexShrink: 0 }}>
                                  {od.decision}
                                </span>
                              </div>
                              {od.notes && (
                                <div style={{ background: "white", border: "1px solid #f3f4f6", borderRadius: "8px", padding: "9px 12px", marginBottom: "10px" }}>
                                  <p style={{ fontSize: "12px", color: "#6b7280", margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>"{od.notes}"</p>
                                </div>
                              )}
                              <SigBox sig={od.officer_signature} name={od.officer_name} ts={od.timestamp} />
                            </div>
                          )}

                          {/* Supervisor override */}
                          {sd && (
                            <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "12px", padding: "14px 16px" }}>
                              <p style={{ fontSize: "10px", fontWeight: "700", color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Supervisor Override</p>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
                                <div>
                                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#111827", margin: "0 0 2px" }}>{sd.supervisor_name}</p>
                                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: "3px 0 0" }}>{fmtDt(sd.timestamp)}</p>
                                </div>
                                <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "999px", background: sd.decision === "APPROVED" ? "#dcfce7" : "#fee2e2", color: sd.decision === "APPROVED" ? "#15803d" : "#991b1b", flexShrink: 0 }}>
                                  {sd.decision}
                                </span>
                              </div>
                              {sd.notes && (
                                <div style={{ background: "white", border: "1px solid #ede9f7", borderRadius: "8px", padding: "9px 12px", marginBottom: "10px" }}>
                                  <p style={{ fontSize: "12px", color: "#6b7280", margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>"{sd.notes}"</p>
                                </div>
                              )}
                              <SigBox sig={sd.supervisor_signature} name={sd.supervisor_name} ts={sd.timestamp} />
                            </div>
                          )}
                        </div>
                      )}
                    </SCard>
                  );
                })()}

                <SCard leftBorder="#f59e0b">
                  <SectionHead iconBg="#fffbeb" icon={<GridIcon size={16} stroke="#d97706" />} title="Documents Submitted" desc={`${app.documents?.length || 0} document${app.documents?.length !== 1 ? "s" : ""} uploaded`} toggle={() => setDocsOpen(v => !v)} open={docsOpen} />
                  {docsOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      {app.documents && app.documents.length > 0 ? (() => {
                        const groups = [
                          { label: "Photo", keys: ["licence_photo", "passport_photo"] },
                          { label: "National ID", keys: ["national_id_front", "national_id_back"] },
                          { label: "Current Licence", keys: ["existing_licence_front", "existing_licence_back"] },
                          { label: "Supporting Documents", keys: ["police_report", "proof_of_address", "trustee_letter", "verification_photo"] },
                        ];
                        const docMap = Object.fromEntries(app.documents.map(d => [d.doc_type, d]));
                        return groups.map(group => {
                          const groupDocs = group.keys.map(k => docMap[k]).filter(Boolean);
                          if (!groupDocs.length) return null;
                          return (
                            <div key={group.label}>
                              <p style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>{group.label}</p>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                {groupDocs.map(doc => <DocRow key={doc.id} doc={doc} appId={app.id} />)}
                              </div>
                            </div>
                          );
                        });
                      })() : (
                        <div style={{ textAlign: "center", padding: "24px 16px" }}>
                          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                            <FileIcon size={20} stroke="#94a3b8" />
                          </div>
                          <p style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", margin: "0 0 4px" }}>No documents uploaded</p>
                          <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Documents you submit will appear here.</p>
                        </div>
                      )}
                    </div>
                  )}
                </SCard>

                {isAR && !submitted && (() => {
                  const resubmitDocs = (app.documents || []).filter(d => d.review_status === "RESUBMIT_REQUIRED");
                  const readyCount   = resubmitDocs.filter(d => docUploads[d.doc_type]).length;
                  const totalCount   = resubmitDocs.length;
                  const allProvided  = totalCount > 0 && readyCount === totalCount;
                  return (
                    <div ref={actionRef} style={{ background: "white", borderRadius: "16px", border: "1.5px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                      {/* Card header */}
                      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <UploadIcon size={17} stroke="#ea580c" />
                          </div>
                          <div>
                            <p style={{ fontSize: "14px", fontWeight: "800", color: "#111827", margin: 0 }}>Upload Requested Documents</p>
                            <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0, marginTop: "2px" }}>Replace only the documents flagged by the officer</p>
                          </div>
                        </div>
                        {totalCount > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: allProvided ? "#f0fdf4" : "#fff7ed", border: `1px solid ${allProvided ? "#86efac" : "#fed7aa"}`, borderRadius: "999px", padding: "5px 12px", flexShrink: 0 }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: allProvided ? "#22c55e" : "#f59e0b" }} />
                            <span style={{ fontSize: "12px", fontWeight: "700", color: allProvided ? "#15803d" : "#92400e" }}>{readyCount} of {totalCount} ready</span>
                          </div>
                        )}
                      </div>

                      <div style={{ padding: "20px" }}>
                        {resubmitDocs.length === 0 ? (
                          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "12px", padding: "14px 16px", display: "flex", gap: "10px" }}>
                            <AlertIcon size={16} stroke="#d97706" />
                            <p style={{ fontSize: "13px", color: "#92400e", margin: 0, lineHeight: 1.6 }}>{app.officer_comment || "The officer has requested additional information. Please contact your nearest TAJ office."}</p>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
                            {resubmitDocs.map((doc, idx) => {
                              const picked      = docUploads[doc.doc_type];
                              const fileInputId = `resubmit-${doc.doc_type}`;
                              return (
                                <div key={doc.id} style={{ borderRadius: "12px", border: `1.5px solid ${picked ? "#86efac" : "#e2e8f0"}`, background: picked ? "#f0fdf4" : "white", overflow: "hidden" }}>
                                  {/* Doc header row */}
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 14px", borderBottom: `1px solid ${picked ? "#bbf7d0" : "#f3f4f6"}` }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                      <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: picked ? "#dcfce7" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <span style={{ fontSize: "11px", fontWeight: "800", color: picked ? "#16a34a" : "#dc2626" }}>{idx + 1}</span>
                                      </div>
                                      <div>
                                        <p style={{ fontSize: "13px", fontWeight: "700", color: "#111827", margin: 0 }}>{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</p>
                                        {doc.review_comment && (
                                          <p style={{ fontSize: "11px", color: "#b45309", margin: "2px 0 0", lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: "4px" }}>
                                            <span style={{ flexShrink: 0 }}>⚠</span> {doc.review_comment}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "999px", background: picked ? "#dcfce7" : "#fef2f2", color: picked ? "#15803d" : "#dc2626", flexShrink: 0 }}>
                                      {picked ? "✓ Ready" : "Needed"}
                                    </span>
                                  </div>

                                  {/* Upload area */}
                                  <div style={{ padding: "12px 14px" }}>
                                    {picked ? (
                                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", background: "white", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                                          <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <FileIcon size={14} stroke="#16a34a" />
                                          </div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: "13px", fontWeight: "600", color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{picked.name}</p>
                                            <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>{(picked.size / 1024).toFixed(0)} KB · ready to send</p>
                                          </div>
                                          <button onClick={() => { setDocUploads(p => { const n = { ...p }; delete n[doc.doc_type]; return n; }); setAiResults(p => { const n = { ...p }; delete n[doc.doc_type]; return n; }); }}
                                            style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#dc2626", fontFamily: "inherit", flexShrink: 0 }}>
                                            <XIcon size={11} stroke="#dc2626" /> Remove
                                          </button>
                                        </div>
                                        {/* AI quality check result */}
                                        {(() => {
                                          const ai = aiResults[doc.doc_type];
                                          if (!ai) return null;
                                          if (ai.checking) return (
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                                              <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>Running AI quality check…</p>
                                            </div>
                                          );
                                          const isGood    = ai.quality === "good";
                                          const isWarning = ai.quality === "warning";
                                          const isPoor    = ai.quality === "poor";
                                          return (
                                            <div style={{ padding: "10px 12px", background: isPoor ? "#fef2f2" : isWarning ? "#fffbeb" : "#f0fdf4", border: `1px solid ${isPoor ? "#fca5a5" : isWarning ? "#fde68a" : "#86efac"}`, borderRadius: "8px" }}>
                                              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: ai.message ? "5px" : 0 }}>
                                                <span style={{ fontSize: "13px" }}>{isPoor ? "⚠" : isWarning ? "⚠" : "✓"}</span>
                                                <p style={{ fontSize: "12px", fontWeight: "700", color: isPoor ? "#991b1b" : isWarning ? "#92400e" : "#15803d", margin: 0 }}>
                                                  AI Check: {isPoor ? "Poor quality — officer may request resubmission again" : isWarning ? "Minor issue detected — you may still submit" : "Good quality"}
                                                  {ai.score != null && <span style={{ fontWeight: "400", marginLeft: "6px" }}>{ai.score}%</span>}
                                                </p>
                                              </div>
                                              {ai.message && <p style={{ fontSize: "11px", color: isPoor ? "#b91c1c" : isWarning ? "#78350f" : "#166534", margin: 0, lineHeight: 1.55 }}>{ai.message}</p>}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    ) : (
                                      <label htmlFor={fileInputId} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", padding: "20px 16px", background: "#fafafa", border: "2px dashed #e2e8f0", borderRadius: "10px", cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#ea580c"; e.currentTarget.style.background = "#fff7ed"; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#fafafa"; }}>
                                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                          <UploadIcon size={17} stroke="#ea580c" />
                                        </div>
                                        <div style={{ textAlign: "center" }}>
                                          <p style={{ fontSize: "13px", fontWeight: "700", color: "#374151", margin: "0 0 2px" }}>Click to choose file</p>
                                          <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>JPG, PNG, or PDF — max 5 MB</p>
                                        </div>
                                        <input id={fileInputId} type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: "none" }}
                                          onChange={e => { const f = e.target.files[0]; if (f) { setDocUploads(p => ({ ...p, [doc.doc_type]: f })); runAiCheck(doc.doc_type, f); } e.target.value = ""; }} />
                                      </label>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Progress bar */}
                        {totalCount > 0 && (
                          <div style={{ marginBottom: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                              <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>Upload progress</p>
                              <p style={{ fontSize: "11px", fontWeight: "700", color: allProvided ? "#15803d" : "#374151", margin: 0 }}>{readyCount}/{totalCount} documents ready</p>
                            </div>
                            <div style={{ height: "6px", borderRadius: "999px", background: "#f1f5f9", overflow: "hidden" }}>
                              <div style={{ height: "100%", borderRadius: "999px", background: allProvided ? "#22c55e" : "#f59e0b", width: `${totalCount > 0 ? (readyCount / totalCount) * 100 : 0}%`, transition: "width 0.4s ease" }} />
                            </div>
                          </div>
                        )}

                        {/* Note to officer */}
                        <div style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "12px", fontWeight: "700", color: "#374151", display: "block", marginBottom: "6px" }}>
                            Note to Officer <span style={{ fontWeight: "400", color: "#9ca3af" }}>(optional)</span>
                          </label>
                          <textarea value={note} onChange={(e) => setNote(e.target.value)}
                            placeholder="Let the officer know anything helpful about the updated documents…" rows={3}
                            style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", resize: "none", fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#374151" }}
                            onFocus={e => e.target.style.borderColor = "#ea580c"}
                            onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                          />
                        </div>

                        {submitError && <div style={{ marginBottom: "12px" }}><InfoBanner type="error" message={submitError} /></div>}

                        <button onClick={handleResubmit} disabled={submitting || !allProvided}
                          style={{ width: "100%", height: "50px", borderRadius: "10px", border: "none", background: submitting ? "#9ca3af" : allProvided ? "linear-gradient(90deg, #ea580c, #dc2626)" : "#e2e8f0", color: allProvided || submitting ? "white" : "#9ca3af", fontSize: "14px", fontWeight: "800", cursor: submitting || !allProvided ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "9px", letterSpacing: "-0.1px", transition: "opacity 0.15s" }}>
                          {submitting ? (
                            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>Submitting…</>
                          ) : allProvided ? (
                            <><SendIcon size={15} stroke="white" /> Send Response to Officer</>
                          ) : (
                            `Upload all ${totalCount} document${totalCount !== 1 ? "s" : ""} to continue`
                          )}
                        </button>
                        {!allProvided && totalCount > 0 && (
                          <p style={{ fontSize: "11px", color: "#9ca3af", textAlign: "center", margin: "8px 0 0" }}>
                            {totalCount - readyCount} document{totalCount - readyCount !== 1 ? "s" : ""} still needed
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <SCard leftBorder="#64748b">
                  <SectionHead iconBg="#f1f5f9" icon={<ActivityIcon size={16} stroke="#475569" />} title="Activity Log" desc="A complete timeline of every action on this application from creation through to a decision." toggle={() => setActivityOpen(v => !v)} open={activityOpen} />
                  {activityOpen && (
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: "17px", top: "18px", bottom: "18px", width: "1px", background: "#e5e7eb" }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {app.events && [...app.events].filter(ev => ![
                          "OFFICER_ASSIGNED", "DOCUMENT_REVIEW", "MANUAL_REVIEW_CLEARED",
                          "REVERIFICATION_REQUESTED",
                        ].includes(ev.event_type)).reverse().map((ev, i) => {
                          const evStyle = EVENT_ICONS[ev.event_type] || EVENT_ICONS.STATUS_CHANGE;
                          const EvIcon = evStyle.icon;
                          return (
                            <div key={ev.id} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                              <div style={{ width: "34px", height: "34px", borderRadius: "10px", flexShrink: 0, zIndex: 1, background: evStyle.bg, border: `1px solid ${evStyle.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <EvIcon size={15} stroke={evStyle.color} />
                              </div>
                              <div style={{ flex: 1, padding: "10px 14px", borderRadius: "10px", background: i === 0 ? "#f8faff" : "#fafafa", border: `1px solid ${i === 0 ? "#dbeafe" : "#f3f4f6"}` }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#111827", margin: 0 }}>{({
                                    CREATED:             "Application Created",
                                    SUBMITTED:           "Application Submitted",
                                    PAYMENT_CONFIRMED:   "Payment Confirmed",
                                    REVIEW_STARTED:      "Under Review",
                                    STATUS_CHANGE:       "Status Updated",
                                    ACTION_REQUIRED:     "Action Required",
                                    RESUBMITTED:         "Documents Resubmitted",
                                    ESCALATED:           "Escalated to Supervisor",
                                    ITA_REQUESTED:       "ITA Clearance Requested",
                                    APPROVED:            "Application Approved",
                                    REJECTED:            "Application Rejected",
                                    SUPERVISOR_DECISION: "Supervisor Decision",
                                  })[ev.event_type] ?? ev.event_type?.replace(/_/g, " ")}</p>
                                  <span style={{ fontSize: "11px", color: "#9ca3af", whiteSpace: "nowrap", flexShrink: 0 }}>{fmtTime(ev.created_at)}</span>
                                </div>
                                {ev.triggered_by && (
                                  <p style={{ fontSize: "11px", color: "#6b7280", margin: "4px 0 0", fontWeight: 500 }}>
                                    by <strong style={{ color: "#374151" }}>{ev.triggered_by}</strong>
                                  </p>
                                )}
                                {ev.comment && <p style={{ fontSize: "12px", color: "#6b7280", margin: "6px 0 0", padding: "8px 12px", background: "white", borderRadius: "8px", border: "1px solid #f3f4f6", lineHeight: 1.6, fontStyle: "italic" }}>"{ev.comment}"</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </SCard>

                <div style={{ display: "flex", gap: "12px", paddingTop: "8px" }}>
                  <button onClick={() => navigate("/apply")} style={{ flex: 1, height: "46px", borderRadius: "10px", border: "none", background: BRAND.primary, fontSize: "14px", fontWeight: "700", color: "white", cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = BRAND.primaryDark}
                    onMouseLeave={(e) => e.currentTarget.style.background = BRAND.primary}>
                    + New Application
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
// Supervisor review page — read-only view of all application steps plus the supervisor decision panel.
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import coatOfArms from "../../assets/coat-of-arms.png";

// Reuse the officer portal's layout CSS for the review body
import styles  from "../officer/OfficerReviewApplication.module.css";
import pStyles from "../../components/officer/review/reviewStyles.module.css";
import svStyles from "../../components/officer/review/SpecialView.module.css";
// Supervisor sidebar styles (dark purple theme)
import supStyles from "./supervisor.module.css";
import StepBar from "../../components/officer/review/StepBar";

const Ico = ({ d, size = 14, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const ArrowLeft   = p => <Ico {...p} d="M19 12H5M12 19l-7-7 7-7" />;
const ArrowRight  = p => <Ico {...p} d="M5 12h14M12 5l7 7-7 7" />;
const CheckIcon   = p => <Ico {...p} sw={2.5} d="M5 12l5 5L20 7" />;
const AlertIcon   = p => <Ico {...p} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"]} />;
const ShieldIcon  = p => <Ico {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const CheckCircle = p => <Ico {...p} d={["M22 11.08V12a10 10 0 1 1-5.93-9.14","M22 4L12 14.01l-3-3"]} />;
const XCircle     = p => <Ico {...p} d={["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M15 9l-6 6M9 9l6 6"]} />;
const PenIcon     = p => <Ico {...p} d={["M12 20h9","M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"]} />;
const TrashIcon   = p => <Ico {...p} d={["M3 6h18","M19 6l-1 14H6L5 6","M9 6V4h6v2"]} />;
const RotateIcon  = p => <Ico {...p} d={["M1 4v6h6","M3.51 15a9 9 0 1 0 .49-4.5"]} />;
const FileIcon    = p => <Ico {...p} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6"]} />;
const DownloadIcon= p => <Ico {...p} d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"]} />;
const XIcon       = p => <Ico {...p} d="M18 6L6 18M6 6l12 12" />;
const ChevLeft    = p => <Ico {...p} d="M15 18l-6-6 6-6" />;
const ChevRight   = p => <Ico {...p} d="M9 18l6-6-6-6" />;
const GridIcon    = p => <Ico {...p} size={15} d={["M3 3h7v7H3z","M14 3h7v7h-7z","M14 14h7v7h-7z","M3 14h7v7H3z"]} />;
const InboxIcon   = p => <Ico {...p} size={15} d={["M22 12h-6l-2 3H10l-2-3H2","M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"]} />;
const ArrowUpIcon = p => <Ico {...p} size={15} d="M12 19V5M5 12l7-7 7 7" />;
const InfoIcon    = p => <Ico {...p} d={["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z","M12 8h.01","M12 12v4"]} />;
const UserIcon    = p => <Ico {...p} d={["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2","M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"]} />;
const CameraIcon  = p => <Ico {...p} d={["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z","M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6"]} />;
const MailIcon    = p => <Ico {...p} d={["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z","M22 6l-10 7L2 6"]} />;
const CopyIcon    = p => <Ico {...p} d={["M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z","M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"]} />;
const ClockIcon   = p => <Ico {...p} d={["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M12 6v6l4 2"]} />;
const UsersIcon   = p => <Ico {...p} size={15} d={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2","M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z","M23 21v-2a4 4 0 0 0-3-3.87","M16 3.13a4 4 0 0 1 0 7.75"]} />;

const TX_LABEL = { RENEWAL: "Renewal", REPLACEMENT: "Replacement", AMENDMENT: "Amendment" };
const TX_COLOR = { RENEWAL: "#2563eb", REPLACEMENT: "#d97706", AMENDMENT: "#16a34a" };
const TX_BG    = { RENEWAL: "#eff6ff", REPLACEMENT: "#fff7ed", AMENDMENT: "#f0fdf4" };

const STATUS_META = {
  ESCALATED:                   { label: "Escalated",           color: "#be185d", bg: "#fdf4ff" },
  PENDING_SUPERVISOR_APPROVAL: { label: "Pending Approval",    color: "#7c3aed", bg: "#f5f3ff" },
  APPROVED:                    { label: "Approved",            color: "#15803d", bg: "#dcfce7" },
  REJECTED:                    { label: "Rejected",            color: "#991b1b", bg: "#fee2e2" },
  UNDER_REVIEW:                { label: "Under Review",        color: "#0369a1", bg: "#e0f2fe" },
  RESUBMITTED:                 { label: "Resubmitted",         color: "#854d0e", bg: "#fef9c3" },
  RETURNED_TO_OFFICER:         { label: "Returned to Officer", color: "#7c3aed", bg: "#f5f3ff" },
};

const DOC_STATUS_META = {
  APPROVED:          { label: "Approved", color: "#15803d", bg: "#dcfce7" },
  RESUBMIT_REQUIRED: { label: "Resubmit", color: "#92400e", bg: "#fef9c3" },
  REJECTED:          { label: "Rejected", color: "#991b1b", bg: "#fee2e2" },
};

const STEP_HINT = {
  overview:  "Review who escalated this case, the escalation reason, their signature, and next steps.",
  applicant: "Cross-check name, DOB, and address against the licence record.",
  documents: "Review each uploaded document and the officer's decisions.",
  checklist: "Confirm all mandatory items are complete before proceeding.",
  decision:  "Review your selected decision carefully — this overrides the officer's action.",
};

function fmt(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z") ? iso : iso + "Z";
  return new Date(s).toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Jamaica" });
}
function fmtTime(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z") ? iso : iso + "Z";
  return new Date(s).toLocaleString("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Jamaica" });
}

// Email popup (same as officer portal)
function EmailPopup({ email }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const copy = () => { navigator.clipboard.writeText(email).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  if (!email || email === "—") return <span style={{ fontSize: 12, color: "#374151" }}>—</span>;
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ fontSize: 12, fontWeight: 600, color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
        <MailIcon size={11} stroke="#2563eb" /> {email}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100, background: "white", border: "1.5px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 8, minWidth: 180 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", padding: "2px 6px 8px", borderBottom: "1px solid #f3f4f6", marginBottom: 6 }}>{email}</p>
          <button onClick={copy} style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "6px 8px", borderRadius: 6, border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: copied ? "#15803d" : "#374151", fontWeight: 600 }}>
            <CopyIcon size={13} stroke={copied ? "#15803d" : "#6b7280"} />{copied ? "Copied!" : "Copy address"}
          </button>
          <a href={`mailto:${email}`} style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "6px 8px", borderRadius: 6, textDecoration: "none", fontSize: 12, color: "#374151", fontWeight: 600 }} onClick={() => setOpen(false)}>
            <MailIcon size={13} stroke="#6b7280" /> Open in mail app
          </a>
        </div>
      )}
    </div>
  );
}

// Doc preview modal (supervisor paths)
function DocPreviewModal({ doc, appId, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const isPdf = doc.original_filename?.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    let url;
    api.get(`/api/supervisor/applications/${appId}/documents/${doc.id}/file`, { responseType: "blob" })
      .then(res => { url = URL.createObjectURL(res.data); setBlobUrl(url); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [appId, doc.id]);

  const download = () => { if (!blobUrl) return; const a = document.createElement("a"); a.href = blobUrl; a.download = doc.original_filename || "document"; a.click(); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 16, overflow: "hidden", width: "100%", maxWidth: 780, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{doc.doc_type?.replace(/_/g, " ")}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{doc.original_filename}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={download} disabled={!blobUrl} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "white", fontSize: 12, fontWeight: 600, cursor: blobUrl ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
              <DownloadIcon size={13} /> Download
            </button>
            <button onClick={onClose} style={{ padding: 6, borderRadius: 7, border: "1.5px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex" }}><XIcon size={16} /></button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
          {loading ? <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#6d28d9", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            : error || !blobUrl ? <div style={{ textAlign: "center", color: "#9ca3af" }}><FileIcon size={36} stroke="#d1d5db" /><p style={{ marginTop: 12, fontSize: 13 }}>Could not load preview</p></div>
            : isPdf ? <iframe src={blobUrl} style={{ width: "100%", height: "70vh", border: "none" }} title="Document preview" />
            : <img src={blobUrl} alt={doc.original_filename} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 8 }} />}
        </div>
      </div>
    </div>
  );
}

// Reference sidebar
function ReferenceSidebar({ app, applicant, licence, step, stepId, officer }) {
  const docs      = (app?.documents || []).filter(d => d.is_current && d.doc_type !== "licence_photo" && d.doc_type !== "verification_photo");
  const isExpired = licence?.expiry_date ? new Date(licence.expiry_date) < new Date() : false;

  const photoDoc = (app?.documents || []).find(d => d.doc_type === "licence_photo" && d.is_current);
  const photoApproved = photoDoc?.review_status === "APPROVED";
  const [photoBlobUrl, setPhotoBlobUrl] = useState(null);
  useEffect(() => {
    if (!photoDoc || !photoApproved) return;
    let url;
    api.get(`/api/supervisor/applications/${app.id}/documents/${photoDoc.id}/file`, { responseType: "blob" })
      .then(res => { url = URL.createObjectURL(res.data); setPhotoBlobUrl(url); })
      .catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [app?.id, photoDoc?.id, photoApproved]);

  const Divider = ({ label }) => (
    <div style={{ padding: "10px 16px 5px", borderTop: "1px solid #f3f4f6" }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
    </div>
  );
  const Row = ({ label, value, highlight, mono, warn }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, padding: "3px 16px" }}>
      <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0, lineHeight: 1.6 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, textAlign: "right", wordBreak: "break-word", lineHeight: 1.6, color: warn ? "#dc2626" : highlight ? "#1d4ed8" : "#374151", fontFamily: mono ? "monospace" : "inherit" }}>{value || "—"}</span>
    </div>
  );

  return (
    <div className={styles.refSidebar}>
      <div style={{ margin: "10px 10px 4px", padding: "9px 11px", background: "#f5f3ff", borderRadius: 8, border: "1px solid #ddd6fe" }}>
        <p style={{ fontSize: 11, color: "#6d28d9", lineHeight: 1.5 }}>
          <strong>Step {step + 1}:</strong> {STEP_HINT[stepId] || ""}
        </p>
      </div>

      {photoBlobUrl && (
        <div style={{ padding: "8px 10px 4px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Submitted Photo</p>
          <img src={photoBlobUrl} alt="Applicant"
            style={{ width: "100%", maxHeight: 160, objectFit: "cover", objectPosition: "top", borderRadius: 8, border: "2px solid #86efac", display: "block" }} />
          <p style={{ fontSize: 9, color: "#15803d", fontWeight: 700, marginTop: 4 }}>✓ Photo approved</p>
        </div>
      )}

      {app?.escalation_reason && (
        <>
          <Divider label="Escalation" />
          <div style={{ margin: "4px 10px 4px", padding: "9px 11px", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#be123c", marginBottom: 4 }}>{officer?.name || "Officer"} escalated</p>
            <p style={{ fontSize: 11, color: "#9f1239", lineHeight: 1.45, fontStyle: "italic" }}>"{app.escalation_reason}"</p>
          </div>
        </>
      )}

      <Divider label="Identity" />
      <Row label="Full Name"     value={`${applicant?.firstname || ""} ${applicant?.lastname || ""}`.trim()} highlight />
      <Row label="Date of Birth" value={fmt(applicant?.date_of_birth)} highlight />
      <Row label="Sex"           value={applicant?.sex} />
      <Row label="TRN"           value={licence?.trn} highlight mono />

      <Divider label="Licence Record" />
      <Row label="Control No."  value={licence?.control_number} highlight mono />
      <Row label="Class"        value={licence?.licence_class} />
      <Row label="Status"       value={licence?.status} />
      <Row label="First Issued" value={fmt(licence?.first_issue_date)} />
      <Row label="Last Issued"  value={fmt(licence?.issue_date)} />
      <Row label="Expiry"       value={fmt(licence?.expiry_date)} warn={isExpired} />
      <Row label="Collectorate" value={licence?.collectorate} />

      <Divider label="Address on File" />
      <Row label="Line 1" value={applicant?.address_line1} />
      {applicant?.address_line2 && <Row label="Line 2" value={applicant?.address_line2} />}
      <Row label="Parish" value={applicant?.parish} />

      <Divider label="Application" />
      <Row label="Type"      value={TX_LABEL[app?.transaction_type]} />
      <Row label="Submitted" value={fmt(app?.submitted_at)} />
      <Row label="Fee Paid"  value={app?.fee_amount ? `J$${parseFloat(app.fee_amount).toLocaleString()}` : "—"} />
      <Row label="Pickup"    value={app?.pickup_collectorate?.split("(")[0]?.trim()} />

      {docs.length > 0 && (
        <>
          <Divider label="Document Status" />
          <div style={{ padding: "4px 10px 8px" }}>
            {docs.map(doc => {
              const meta = doc.review_status ? DOC_STATUS_META[doc.review_status] : null;
              return (
                <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "capitalize" }}>{doc.doc_type?.replace(/_/g, " ")}</span>
                  {meta ? <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: meta.bg, borderRadius: 999, padding: "1px 8px", flexShrink: 0 }}>{meta.label}</span>
                    : <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>Pending</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Step: Overview
function StepOverview({ app, applicant, officer, licence }) {
  const initials = (officer?.name || "?").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0,2).toUpperCase();
  return (
    <div className={pStyles.stepContent}>
      <div className={pStyles.sectionHead}>
        <ShieldIcon size={18} stroke="#2563eb" />
        <h2 className={pStyles.sectionTitle}>Escalation Overview</h2>
        <span className={pStyles.sectionNote}>Review before proceeding</span>
      </div>

      <div className={pStyles.twoCol}>
        {/* Reviewing Officer */}
        <div className={pStyles.infoBlock}>
          <p className={pStyles.infoBlockTitle}>Reviewing Officer</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#6d28d9,#4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "white", flexShrink: 0 }}>{initials}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{officer?.name || "—"}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
                {officer?.staff_id && <span style={{ fontFamily: "monospace" }}>{officer.staff_id}</span>}
                {officer?.rank && <> · {officer.rank}</>}
              </div>
            </div>
          </div>
          {[
            ["Collectorate",  officer?.collectorate || "—"],
            ["Escalated At",  app?.escalated_at ? fmtTime(app.escalated_at) : "—"],
            ["Application",   app?.application_number || "—"],
          ].map(([l, v]) => (
            <div key={l} className={pStyles.infoRow}>
              <span className={pStyles.infoLabel}>{l}</span>
              <span className={pStyles.infoVal}>{v}</span>
            </div>
          ))}
        </div>

        {/* Escalation Reason */}
        <div className={pStyles.infoBlock}>
          <p className={pStyles.infoBlockTitle}>Escalation Reason</p>
          {app?.escalation_reason ? (
            <div style={{ background: "#fff1f2", border: "1.5px solid #fecdd3", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: "#9f1239", lineHeight: 1.55, fontStyle: "italic" }}>"{app.escalation_reason}"</div>
            </div>
          ) : (
            <p style={{ color: "#9ca3af", fontSize: 13 }}>No escalation reason provided.</p>
          )}
          {app?.officer_comment && (
            <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Officer's Note</p>
              <p style={{ fontSize: 13, color: "#78350f", lineHeight: 1.5 }}>{app.officer_comment}</p>
            </div>
          )}
        </div>

        {/* Officer Signature */}
        <div className={pStyles.infoBlock}>
          <p className={pStyles.infoBlockTitle}>Officer Signature</p>
          {app?.officer_signature ? (
            <div>
              <div style={{ background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "12px 16px", display: "inline-block", marginBottom: 8 }}>
                <img src={app.officer_signature} alt="Officer signature" style={{ height: 44, objectFit: "contain", display: "block" }} />
              </div>
              <p style={{ fontSize: 10, color: "#9ca3af" }}>{officer?.name} · {fmtTime(app.escalated_at || app.submitted_at)}</p>
            </div>
          ) : (
            <p style={{ color: "#9ca3af", fontSize: 13 }}>No signature on file for this officer.</p>
          )}
        </div>

        {/* Next Steps */}
        <div className={pStyles.infoBlock}>
          <p className={pStyles.infoBlockTitle}>Next Steps</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { n: "1", label: "Review the applicant details",  color: "#6d28d9" },
              { n: "2", label: "Check all submitted documents", color: "#0369a1" },
              { n: "3", label: "Complete the review checklist", color: "#374151" },
              { n: "4", label: "Make your final decision",      color: "#16a34a" },
            ].map(item => (
              <div key={item.n} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: item.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "white", flexShrink: 0 }}>{item.n}</div>
                <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// Step: Applicant
function StepApplicant({ app, appId, applicant, licence, onAppUpdate, supervisorName, readOnly }) {
  const photoDoc = (app?.documents || []).find(d => d.doc_type === "licence_photo" && d.is_current);
  const [photoBlobUrl,    setPhotoBlobUrl]    = useState(null);
  const [expanded,        setExpanded]        = useState(false);
  const [reviewingPhoto,  setReviewingPhoto]  = useState(false);
  const [localPhotoReview, setLocalPhotoReview] = useState(null);

  useEffect(() => {
    if (!photoDoc) return;
    let url;
    api.get(`/api/supervisor/applications/${app.id}/documents/${photoDoc.id}/file`, { responseType: "blob" })
      .then(res => { url = URL.createObjectURL(res.data); setPhotoBlobUrl(url); })
      .catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [app?.id, photoDoc?.id]);

  const photoStatus  = localPhotoReview?.status  ?? photoDoc?.review_status;
  const photoComment = localPhotoReview?.comment ?? photoDoc?.review_comment;
  const photoMeta    = photoStatus ? DOC_STATUS_META[photoStatus] : null;

  return (
    <div className={pStyles.stepContent}>
      {reviewingPhoto && photoDoc && (
        <SupDocReviewModal
          title="Review: Submitted Photo"
          subtitle="Supervisor decision — overrides officer"
          officerStatus={photoDoc.review_status}
          officerComment={photoDoc.review_comment}
          currentStatus={localPhotoReview?.status || photoDoc.review_status || ""}
          currentComment={localPhotoReview?.comment || photoDoc.review_comment || ""}
          appId={appId}
          docId={photoDoc.id}
          onDone={(s, c) => { setLocalPhotoReview({ status: s, comment: c }); onAppUpdate?.(); }}
          onClose={() => setReviewingPhoto(false)}
        />
      )}
      <div className={pStyles.sectionHead}>
        <UserIcon size={18} stroke="#2563eb" />
        <h2 className={pStyles.sectionTitle}>Applicant Summary</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 0, borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ padding: "20px", borderRight: "1px solid #f3f4f6", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, background: "#fafbff" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", alignSelf: "flex-start" }}>Submitted Photo</p>
          {photoBlobUrl ? (
            <div style={{ position: "relative", cursor: "zoom-in" }} onClick={() => setExpanded(true)}>
              <img src={photoBlobUrl} alt="Applicant photo"
                style={{ width: 110, height: 145, objectFit: "cover", borderRadius: 10, border: `2px solid ${photoMeta ? photoMeta.color + "60" : "#e2e8f0"}`, display: "block" }}
                onError={e => e.target.style.display = "none"} />
            </div>
          ) : (
            <div style={{ background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: 10, padding: "28px 20px", textAlign: "center", width: "100%" }}>
              <CameraIcon size={24} stroke="#d1d5db" />
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>No photo</p>
            </div>
          )}
          {photoMeta && (
            <span style={{ fontSize: 10, fontWeight: 700, color: photoMeta.color, background: photoMeta.bg, border: `1px solid ${photoMeta.color}30`, borderRadius: 6, padding: "2px 8px" }}>
              {photoMeta.label}
            </span>
          )}
          {photoComment && (
            <p style={{ fontSize: 10, color: "#6b7280", fontStyle: "italic", textAlign: "center", lineHeight: 1.4, margin: 0 }}>"{photoComment}"</p>
          )}
          {photoDoc && !readOnly && (
            <button onClick={() => setReviewingPhoto(true)}
              style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", border: "1.5px solid #ddd6fe", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
              <PenIcon size={11} stroke="#7c3aed" /> Override Decision
            </button>
          )}
          <p style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", lineHeight: 1.4 }}>Cross-check against identity documents</p>
        </div>
        {expanded && photoBlobUrl && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setExpanded(false)}>
            <img src={photoBlobUrl} alt="Applicant photo" style={{ maxHeight: "90vh", maxWidth: "90vw", borderRadius: 12, border: "3px solid white", objectFit: "contain" }} />
          </div>
        )}
        <div style={{ padding: "20px 24px", background: "#fafbff" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Signed Declaration</p>
          {app?.declaration ? (
            <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <CheckCircle size={18} stroke="#16a34a" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>Declaration Signed</span>
              </div>
              <div style={{ background: "white", border: "1px solid #bbf7d0", borderRadius: 8, padding: 14, marginBottom: 12 }}>
                <p style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Digital Signature</p>
                {app.signature_image
                  ? <img src={app.signature_image} alt="Applicant signature" style={{ display: "block", maxWidth: "100%", height: 72, objectFit: "contain", objectPosition: "left center", borderBottom: "2px solid #d1d5db", paddingBottom: 8, marginBottom: 8 }} />
                  : <p style={{ fontSize: 22, color: "#1e3a8a", fontFamily: "Georgia, serif", fontStyle: "italic", borderBottom: "2px solid #d1d5db", paddingBottom: 8, marginBottom: 8 }}>{applicant?.firstname} {applicant?.lastname}</p>
                }
                <p style={{ fontSize: 11, color: "#9ca3af" }}>Signed {fmtTime(app.declaration_signed_at || app.submitted_at)}</p>
              </div>
              <div style={{ background: "#dcfce7", borderRadius: 6, padding: "8px 12px" }}>
                <p style={{ fontSize: 11, color: "#15803d", lineHeight: 1.5 }}>"I hereby declare that all information provided in this application is true and correct to the best of my knowledge."</p>
              </div>
            </div>
          ) : (
            <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: 20, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>Declaration not signed</p>
            </div>
          )}
        </div>
      </div>

      <div className={pStyles.twoCol}>
        <div className={pStyles.infoBlock}>
          <p className={pStyles.infoBlockTitle}>Personal Information</p>
          {[
            ["Full Name",     `${applicant?.firstname || ""} ${applicant?.lastname || ""}`.trim() || "—"],
            ["Date of Birth", fmt(applicant?.date_of_birth)],
            ["Sex",           applicant?.sex || "—"],
            ["Phone",         applicant?.phone || "—"],
          ].map(([l, v]) => (
            <div key={l} className={pStyles.infoRow}>
              <span className={pStyles.infoLabel}>{l}</span>
              <span className={pStyles.infoVal}>{v}</span>
            </div>
          ))}
          <div className={pStyles.infoRow}>
            <span className={pStyles.infoLabel}>Email</span>
            <EmailPopup email={applicant?.email || "—"} />
          </div>
        </div>
        <div className={pStyles.infoBlock}>
          <p className={pStyles.infoBlockTitle}>Address</p>
          {[
            ["Address Line 1", applicant?.address_line1 || "—"],
            ["Address Line 2", applicant?.address_line2 || "—"],
            ["Parish",         applicant?.parish || "—"],
          ].map(([l, v]) => (
            <div key={l} className={pStyles.infoRow}>
              <span className={pStyles.infoLabel}>{l}</span>
              <span className={pStyles.infoVal}>{v}</span>
            </div>
          ))}
          {app?.address_change_requested && (
            <div className={pStyles.changeBanner}>
              <AlertIcon size={13} stroke="#c2410c" />
              <div>
                <p className={pStyles.changeBannerTitle} style={{ color: "#c2410c" }}>Address change requested</p>
                <p className={pStyles.changeBannerVal}>{app.new_address_line1}{app.new_address_line2 ? `, ${app.new_address_line2}` : ""}{app.new_parish ? `, ${app.new_parish}` : ""}</p>
              </div>
            </div>
          )}
        </div>
        <div className={pStyles.infoBlock}>
          <p className={pStyles.infoBlockTitle}>Licence Record</p>
          {[
            ["Control No.", licence?.control_number || "—"],
            ["TRN",         licence?.trn || "—"],
            ["Class",       licence?.licence_class || "—"],
            ["Status",      licence?.status || "—"],
            ["First Issued",fmt(licence?.first_issue_date)],
            ["Last Issued", fmt(licence?.issue_date)],
            ["Expiry Date", fmt(licence?.expiry_date)],
            ["Collectorate",licence?.collectorate || "—"],
          ].map(([l, v]) => (
            <div key={l} className={pStyles.infoRow}>
              <span className={pStyles.infoLabel}>{l}</span>
              <span className={pStyles.infoVal}>{v}</span>
            </div>
          ))}
        </div>
        <div className={pStyles.infoBlock}>
          <p className={pStyles.infoBlockTitle}>Application Details</p>
          {[
            ["Reference",       app?.application_number],
            ["Type",            TX_LABEL[app?.transaction_type] || app?.transaction_type],
            ["Submitted",       fmtTime(app?.submitted_at)],
            ["Fee",             app?.fee_amount ? `J$${parseFloat(app.fee_amount).toLocaleString()}` : "—"],
            ["Payment Ref",     app?.payment_reference || "—"],
            ["Pickup Location", app?.pickup_collectorate || "—"],
          ].map(([l, v]) => (
            <div key={l} className={pStyles.infoRow}>
              <span className={pStyles.infoLabel}>{l}</span>
              <span className={pStyles.infoVal}>{v || "—"}</span>
            </div>
          ))}
          {app?.trustee_collection && (
            <div className={pStyles.changeBanner} style={{ borderColor: "#ddd6fe", background: "#f5f3ff" }}>
              <div>
                <p className={pStyles.changeBannerTitle} style={{ color: "#7c3aed" }}>Trustee collection</p>
                <p className={pStyles.changeBannerVal} style={{ color: "#6d28d9" }}>{app.trustee_name} · {app.trustee_contact}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Score bar — replicates the officer portal's ScoreBar
function ScoreBar({ label, value, threshold = 50 }) {
  const pct  = Math.min(Math.max(value ?? 0, 0), 100);
  const good = pct >= threshold;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: "#6b7280" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: good ? "#15803d" : "#dc2626" }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: good ? "#22c55e" : "#ef4444", borderRadius: 999, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

// Verification history (collapsible)
function VerifHistory({ events }) {
  const [open, setOpen] = useState(false);
  if (!events.length) return null;
  return (
    <div style={{ margin: "0 18px 14px", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: "100%", padding: "10px 14px", background: "#f8fafc", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <ClockIcon size={13} stroke="#6b7280" />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Verification History</span>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>({events.length})</span>
        </div>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2.5} strokeLinecap="round">
          <path d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
        </svg>
      </button>
      {open && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, background: "white" }}>
          {events.map((ev, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                <ClockIcon size={11} stroke="#4338ca" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: 0 }}>{ev.event_type?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                {ev.comment && <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0", fontStyle: "italic" }}>"{ev.comment}"</p>}
              </div>
              <p style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0, marginTop: 2 }}>{fmtTime(ev.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Identity Verification Panel — full detail + supervisor override actions
function VerificationPanel({ app: initialApp, appId, onAppUpdate, supervisorName, readOnly }) {
  const [liveApp,        setLiveApp]        = useState(initialApp);
  const [photoExpanded,  setPhotoExpanded]  = useState(false);
  const [photoBlobUrl,   setPhotoBlobUrl]   = useState(null);
  const [clearing,       setClearing]       = useState(false);
  const [reverifying,    setReverifying]    = useState(false);
  const [decisionOpen,   setDecisionOpen]   = useState(null); // "pass" | "fail" | "reverify" | "clear-manual" | null
  const [decisionReason, setDecisionReason] = useState("");
  const [deciding,       setDeciding]       = useState(false);
  const [decisionErr,    setDecisionErr]    = useState("");
  const [sig,            setSig]            = useState(null);
  const [showSigPad,     setShowSigPad]     = useState(false);
  const [loadingSig,     setLoadingSig]     = useState(false);
  const [confirmed,      setConfirmed]      = useState(false);
  const [confirmedAt,    setConfirmedAt]    = useState(null);

  useEffect(() => { setLiveApp(initialApp); }, [initialApp]);

  useEffect(() => {
    if (!decisionOpen || sig) return;
    setLoadingSig(true);
    api.get("/api/supervisor/profile/signature")
      .then(r => { if (r.data.signature_image) setSig(r.data.signature_image); })
      .catch(() => {})
      .finally(() => setLoadingSig(false));
  }, [decisionOpen]);

  const app       = liveApp;
  const verifyDoc = (app?.documents || []).find(d => d.is_current && d.doc_type === "verification_photo");
  const vr        = app?.verification_result;

  useEffect(() => {
    if (!verifyDoc) return;
    let url;
    api.get(`/api/supervisor/applications/${appId}/documents/${verifyDoc.id}/file`, { responseType: "blob" })
      .then(res => { url = URL.createObjectURL(res.data); setPhotoBlobUrl(url); })
      .catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [appId, verifyDoc?.id]);

  if (!app?.verification_attempts && !vr && app?.liveness_score == null && app?.face_match_score == null) return null;

  const passed   = app.verification_passed;
  const manual   = app.needs_manual_review;
  const reverify = app.reverification_requested;

  const autoPass    = passed && !manual && !reverify;
  const statusLabel = reverify ? "Re-verification Requested" : manual ? "Manual Review Required" : autoPass ? "Passed" : "Failed";
  const statusColor = autoPass ? "#15803d" : manual ? "#92400e" : reverify ? "#a16207" : "#991b1b";
  const statusBg    = autoPass ? "#dcfce7"  : manual ? "#fef9c3"  : reverify ? "#fef9c3"  : "#fee2e2";
  const headerBg    = autoPass ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : manual ? "linear-gradient(135deg,#fffbeb,#fef9c3)" : reverify ? "linear-gradient(135deg,#fffbeb,#fef9c3)" : "linear-gradient(135deg,#fef2f2,#fee2e2)";
  const borderColor = autoPass ? "#86efac" : manual ? "#fde68a" : "#fca5a5";

  // Parse sub-scores from verification event comment (same format as officer portal)
  const verifEvent  = (app.events || []).slice().reverse().find(e =>
    e.event_type === "VERIFICATION_PASSED" || e.event_type === "VERIFICATION_ATTEMPT_FAILED"
  );
  const evComment   = verifEvent?.comment || "";
  const extract     = key => { const m = evComment.match(new RegExp(`${key}:\\s*(\\d+)`)); return m ? parseInt(m[1], 10) : null; };
  const extractFrac = key => { const m = evComment.match(new RegExp(`${key}:\\s*(\\d+)/(\\d+)`)); return m ? Math.round(parseInt(m[1],10)/parseInt(m[2],10)*100) : null; };
  const chalScore   = extractFrac("Challenges");
  const depthScore  = extract("Face depth");
  const texScore    = extract("Texture");
  const indepScore  = extract("Eye independence");
  const rppgBpm     = extract("BPM");
  const sharpness   = extract("Sharpness");
  const usedMatch   = evComment.match(/Used:\s*([a-z_+]+)/i);
  const chalLabels  = usedMatch ? usedMatch[1].split("+").map(c => c.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())).join(", ") : null;
  const sharpLabel  = sharpness == null ? null : sharpness > 300 ? "High" : sharpness > 80 ? "Medium" : "Low";
  const sharpColor  = sharpLabel === "High" ? "#15803d" : sharpLabel === "Medium" ? "#d97706" : "#dc2626";
  const sharpBg     = sharpLabel === "High" ? "#dcfce7" : sharpLabel === "Medium" ? "#fef9c3" : "#fee2e2";

  const verifyEvents = (app.events || [])
    .filter(e => ["SUBMITTED","RESUBMITTED","REVERIFICATION_REQUESTED","MANUAL_REVIEW_CLEARED","VERIFICATION_PASSED","VERIFICATION_ATTEMPT_FAILED"].includes(e.event_type))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const closeDecisionModal = () => {
    setDecisionOpen(null); setDecisionReason(""); setDecisionErr("");
    setConfirmed(false); setConfirmedAt(null); setShowSigPad(false);
  };

  const handleDecision = async () => {
    if (!confirmed) return;
    setDeciding(true); setDecisionErr("");
    try {
      if (decisionOpen === "pass" || decisionOpen === "fail") {
        await api.post(`/api/supervisor/applications/${appId}/override-verification`, { result: decisionOpen, reason: decisionReason });
        setLiveApp(prev => ({ ...prev, verification_passed: decisionOpen === "pass", needs_manual_review: false, manual_review_reason: null }));
      } else if (decisionOpen === "reverify") {
        await api.post(`/api/supervisor/applications/${appId}/request-reverification`);
        setLiveApp(prev => ({ ...prev, reverification_requested: true, needs_manual_review: true }));
      } else if (decisionOpen === "clear-manual") {
        await api.post(`/api/supervisor/applications/${appId}/clear-manual-review`);
        setLiveApp(prev => ({ ...prev, needs_manual_review: false, manual_review_reason: null }));
      }
      closeDecisionModal();
      onAppUpdate?.();
    } catch (e) {
      console.error("handleDecision error:", e.response?.status, e.response?.data, e.message);
      setDecisionErr(e.response?.data?.error || e.response?.data?.message || e.message || "Request failed — check your connection and try again.");
    }
    setDeciding(false);
  };

  return (
    <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: 12, overflow: "hidden", background: "white" }}>

      {/* Header */}
      <div style={{ padding: "14px 18px", background: headerBg, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: autoPass ? "#dcfce7" : manual ? "#fef9c3" : "#fecaca", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ShieldIcon size={17} stroke={statusColor} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: "#111827", margin: "0 0 2px" }}>Live Identity Verification</p>
          <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
            {app.verification_attempts ?? 0} attempt{(app.verification_attempts ?? 0) !== 1 ? "s" : ""}
            {app.verified_at ? ` · completed ${fmtTime(app.verified_at)}` : ""}
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: statusBg, color: statusColor, flexShrink: 0 }}>
          {statusLabel}
        </span>
      </div>

      {/* Body — photo left, scores right */}
      <div style={{ padding: "16px 18px", display: "flex", gap: 18 }}>

        {/* Captured photo */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Captured Frame</p>
          {photoBlobUrl ? (
            <>
              <div style={{ position: "relative", cursor: "zoom-in" }} onClick={() => setPhotoExpanded(true)}>
                <img src={photoBlobUrl} alt="Verification capture"
                  style={{ width: 100, height: 130, objectFit: "cover", objectPosition: "top", borderRadius: 8, border: `2px solid ${autoPass ? "#86efac" : "#fca5a5"}`, display: "block" }} />
                <div style={{ position: "absolute", bottom: 5, right: 5, background: "rgba(0,0,0,0.5)", borderRadius: 5, padding: "2px 5px" }}>
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
              </div>
              {sharpLabel && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: sharpBg, color: sharpColor, textAlign: "center" }}>
                  Sharpness: {sharpLabel}
                </span>
              )}
              <p style={{ fontSize: 9, color: "#9ca3af", margin: 0, textAlign: "center" }}>Click to enlarge</p>
            </>
          ) : (
            <div style={{ width: 100, height: 130, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: 8, border: "1.5px dashed #e2e8f0" }}>
              <ShieldIcon size={20} stroke="#d1d5db" />
              <p style={{ fontSize: 9, color: "#9ca3af", margin: "4px 0 0", textAlign: "center" }}>No capture</p>
            </div>
          )}
        </div>

        {/* Score breakdown */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Score Breakdown</p>
          <ScoreBar label="Liveness Score"      value={app.liveness_score}   threshold={50} />
          <ScoreBar label="Face Match"          value={app.face_match_score} threshold={40} />
          {chalScore  != null && <ScoreBar label="Challenge Response" value={chalScore}  threshold={55} />}
          {depthScore != null && <ScoreBar label="3D Face Depth"      value={depthScore} threshold={55} />}
          {texScore   != null && <ScoreBar label="Texture (LBP)"      value={texScore}   threshold={55} />}
          {indepScore != null && <ScoreBar label="Iris Independence"  value={indepScore} threshold={40} />}
          {chalLabels && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "#6b7280" }}>Challenges used</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", textAlign: "right", maxWidth: "55%" }}>{chalLabels}</span>
            </div>
          )}
          {rppgBpm != null && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 11, color: "#6b7280" }}>❤️ Est. Heart Rate <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700 }}>rPPG</span></span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#15803d" }}>{rppgBpm} <span style={{ fontSize: 10, fontWeight: 500, color: "#6b7280" }}>BPM</span></span>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
            {[
              ["Attempts",  app.verification_attempts ?? "—"],
              ["Completed", app.verified_at ? fmtTime(app.verified_at) : "—"],
              ["Liveness",  app.liveness_score   != null ? `${app.liveness_score}%`   : "—"],
              ["Face Match",app.face_match_score  != null ? `${app.face_match_score}%` : "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
                <p style={{ fontSize: 10, color: "#9ca3af", margin: "0 0 2px" }}>{label}</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0 }}>{val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manual review callout */}
      {manual && (
        <div style={{ margin: "0 18px 14px", padding: "10px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
          <div style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
            <AlertIcon size={13} stroke="#d97706" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#92400e", margin: "0 0 2px" }}>Manual Review Flagged</p>
              {app.manual_review_reason && <p style={{ fontSize: 11, color: "#78350f", margin: 0, lineHeight: 1.5 }}>{app.manual_review_reason}</p>}
              {reverify && <p style={{ fontSize: 11, color: "#a16207", margin: "4px 0 0", fontStyle: "italic" }}>Re-verification requested — awaiting applicant response.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Verification quick actions — hidden in read-only (officer possession) mode */}
      {!readOnly && (
        <div style={{ margin: "0 18px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {manual && (
            <button onClick={() => { setDecisionOpen("clear-manual"); setDecisionReason(""); setDecisionErr(""); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <CheckIcon size={12} sw={2.5} />
              Clear Manual Review Flag
            </button>
          )}
          {!reverify && (
            <button onClick={() => { setDecisionOpen("reverify"); setDecisionReason(""); setDecisionErr(""); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1.5px solid #fde68a", background: "#fffbeb", color: "#92400e", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <RotateIcon size={12} stroke="#92400e" />
              Request Re-verification
            </button>
          )}
          <button onClick={() => { setDecisionOpen("pass"); setDecisionReason(""); setDecisionErr(""); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1.5px solid #86efac", background: "#f0fdf4", color: "#15803d", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <CheckCircle size={12} stroke="#15803d" />
            Pass Verification
          </button>
          <button onClick={() => { setDecisionOpen("fail"); setDecisionReason(""); setDecisionErr(""); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1.5px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <XCircle size={12} stroke="#dc2626" />
            Fail Verification
          </button>
        </div>
      )}

      {/* Action modal — pass / fail / reverify / clear-manual */}
      {decisionOpen && (() => {
        const META = {
          "pass":         { title: "Pass Verification",         icon: <CheckCircle size={20} stroke="#16a34a" />, headerBg: "#f0fdf4", headerBorder: "#86efac", label: "Pass",                  color: "#16a34a", reasonRequired: true,  reasonPlaceholder: "Explain why verification is being manually passed…" },
          "fail":         { title: "Fail Verification",         icon: <XCircle     size={20} stroke="#dc2626" />, headerBg: "#fef2f2", headerBorder: "#fca5a5", label: "Fail",                  color: "#dc2626", reasonRequired: true,  reasonPlaceholder: "Explain why verification is being failed…" },
          "reverify":     { title: "Request Re-verification",   icon: <RotateIcon  size={20} stroke="#92400e" />, headerBg: "#fffbeb", headerBorder: "#fde68a", label: "Request Re-verification",color: "#d97706", reasonRequired: false, reasonPlaceholder: "Optional note for the audit log…" },
          "clear-manual": { title: "Clear Manual Review Flag",  icon: <CheckIcon   size={20} stroke="#15803d" sw={2.5} />, headerBg: "#f0fdf4", headerBorder: "#86efac", label: "Clear Flag", color: "#16a34a", reasonRequired: false, reasonPlaceholder: "Optional note for the audit log…" },
        };
        const m = META[decisionOpen];
        return (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) closeDecisionModal(); }}>
          <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.25)", overflow: "hidden" }}>

            {/* Modal header */}
            <div style={{ padding: "18px 22px", background: m.headerBg, borderBottom: `1.5px solid ${m.headerBorder}`, display: "flex", alignItems: "center", gap: 10 }}>
              {m.icon}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#111827", margin: 0 }}>{m.title}</p>
                <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Supervisor action — recorded in audit log</p>
              </div>
              <button onClick={closeDecisionModal} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <XIcon size={16} stroke="#6b7280" />
              </button>
            </div>

            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Reason */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                  {m.reasonRequired ? <> Reason <span style={{ color: "#ef4444" }}>*</span> — recorded in audit log</> : "Note (optional) — recorded in audit log"}
                </label>
                <textarea value={decisionReason}
                  onChange={e => { setDecisionReason(e.target.value); setConfirmed(false); setConfirmedAt(null); setDecisionErr(""); }}
                  placeholder={m.reasonPlaceholder}
                  rows={3}
                  style={{ width: "100%", fontSize: 13, border: `1.5px solid ${decisionErr ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 8, padding: "9px 12px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                />
                {decisionErr && <p style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{decisionErr}</p>}
              </div>

              {/* Signature */}
              <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <PenIcon size={14} stroke="#374151" />
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0 }}>Supervisor Signature &amp; Confirmation</p>
                </div>
                {loadingSig ? (
                  <p style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</p>
                ) : sig && !showSigPad ? (
                  <div>
                    <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Supervisor Signature</p>
                      <img src={sig} alt="Supervisor signature" style={{ display: "block", height: 48, objectFit: "contain", objectPosition: "left", maxWidth: "100%" }} />
                      <button onClick={() => { setShowSigPad(true); setConfirmed(false); setConfirmedAt(null); }}
                        style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                        <PenIcon size={10} /> Draw a different signature
                      </button>
                    </div>
                    {!confirmed ? (
                      <div style={{ background: "white", border: `1.5px solid ${m.color}22`, borderRadius: 8, padding: "12px 14px" }}>
                        <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, marginBottom: 10 }}>
                          By confirming, I <strong>{supervisorName || "Supervisor"}</strong> certify that the action <strong style={{ color: m.color }}>{m.label}</strong> is accurate and made in accordance with DLRSJAM policy.
                        </p>
                        <button
                          disabled={m.reasonRequired && !decisionReason.trim()}
                          onClick={() => { setConfirmed(true); setConfirmedAt(new Date().toISOString()); }}
                          style={{ width: "100%", padding: "9px 0", borderRadius: 7, border: "none", background: (m.reasonRequired && !decisionReason.trim()) ? "#e2e8f0" : m.color, color: (m.reasonRequired && !decisionReason.trim()) ? "#9ca3af" : "white", fontSize: 13, fontWeight: 700, cursor: (m.reasonRequired && !decisionReason.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                          Confirm — {m.label}
                        </button>
                      </div>
                    ) : (
                      <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                        <CheckCircle size={16} stroke="#16a34a" />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: "#15803d", margin: 0 }}>Decision confirmed</p>
                          <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{fmtTime(confirmedAt)}</p>
                        </div>
                        <button onClick={() => { setConfirmed(false); setConfirmedAt(null); }} style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Undo</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <SupervisorSigPad
                    existingSig={sig}
                    onSave={s => { setSig(s); setShowSigPad(false); setConfirmed(false); setConfirmedAt(null); }}
                    onUseExisting={() => { setShowSigPad(false); setConfirmed(false); setConfirmedAt(null); }}
                  />
                )}
              </div>

            </div>

            <div style={{ padding: "14px 22px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8 }}>
              <button onClick={closeDecisionModal}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button disabled={(!confirmed) || (m.reasonRequired && !decisionReason.trim()) || deciding}
                onClick={handleDecision}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: (confirmed && (!m.reasonRequired || decisionReason.trim()) && !deciding) ? m.color : "#94a3b8", color: "white", fontSize: 13, fontWeight: 700, cursor: (confirmed && (!m.reasonRequired || decisionReason.trim()) && !deciding) ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                {deciding ? "Submitting…" : `Confirm — ${m.label}`}
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

function buildDocReviews(documents) {
  const init = {};
  const NON_PHOTO = ["licence_photo", "verification_photo"];
  (documents || []).forEach(function(doc) {
    if (doc.is_current && !NON_PHOTO.includes(doc.doc_type) && doc.review_status) {
      init[doc.id] = { status: doc.review_status, comment: doc.review_comment || "" };
    }
  });
  return init;
}

function ActivityLog({ events }) {
  const [open, setOpen] = useState(false);
  if (!events?.length) return null;
  return (
    <div style={{ margin: "0 0 4px", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: "100%", padding: "10px 14px", background: "#f8fafc", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <ClockIcon size={13} stroke="#6b7280" />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Activity Log</span>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>({events.length})</span>
        </div>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2.5} strokeLinecap="round">
          <path d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
        </svg>
      </button>
      {open && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, background: "white" }}>
          {events.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: i < events.length - 1 ? "1px solid #f8fafc" : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? "#6d28d9" : "#e2e8f0", flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#111827", margin: 0 }}>
                  {EV_LABEL_SUP[e.event_type] || e.event_type?.replace(/_/g, " ") || "Event"}
                  {e.from_status && e.to_status && <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 400, marginLeft: 6 }}>{e.from_status.replace(/_/g," ")} → {e.to_status.replace(/_/g," ")}</span>}
                </p>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>{e.actor || "System"} · {fmtTime(e.created_at)}</p>
                {e.comment && <p style={{ fontSize: 11, color: "#6b7280", fontStyle: "italic", margin: "3px 0 0" }}>"{e.comment}"</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SupDocReviewModal({ title, subtitle, officerStatus, officerComment, currentStatus, currentComment, appId, docId, onDone, onClose }) {
  const [status,      setStatus]      = useState(currentStatus || "");
  const [comment,     setComment]     = useState(currentComment || "");
  const [submitting,  setSubmitting]  = useState(false);
  const [err,         setErr]         = useState("");
  const [sig,         setSig]         = useState(null);
  const [showSigPad,  setShowSigPad]  = useState(false);
  const [loadingSig,  setLoadingSig]  = useState(true);
  const [confirmed,   setConfirmed]   = useState(false);
  const [confirmedAt, setConfirmedAt] = useState(null);

  useEffect(() => {
    api.get("/api/supervisor/profile/signature")
      .then(r => { if (r.data.signature_image) setSig(r.data.signature_image); })
      .catch(() => {})
      .finally(() => setLoadingSig(false));
  }, []);

  const officerMeta   = officerStatus ? DOC_STATUS_META[officerStatus] : null;
  const decisionColor = { APPROVED: "#15803d", RESUBMIT_REQUIRED: "#d97706", REJECTED: "#dc2626" }[status] || "#6d28d9";
  const decisionLabel = { APPROVED: "Approve", RESUBMIT_REQUIRED: "Resubmit", REJECTED: "Reject" }[status] || "Decision";
  const commentRequired = status === "RESUBMIT_REQUIRED" || status === "REJECTED";
  const canConfirm    = !!status && !!sig && (!commentRequired || comment.trim().length > 0);
  const canSubmit     = canConfirm && confirmed;

  const handleSave = async () => {
    if (!canSubmit) return;
    setSubmitting(true); setErr("");
    try {
      await api.post(`/api/supervisor/applications/${appId}/documents/${docId}/review`, { status, comment });
      onDone(status, comment);
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to save.");
    }
    setSubmitting(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "white", borderRadius: 14, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{title}</p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{subtitle}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><XIcon size={16} stroke="#6b7280" /></button>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {officerMeta && (
            <div style={{ padding: "10px 12px", background: officerMeta.bg, borderRadius: 8, border: `1px solid ${officerMeta.color}30` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: officerMeta.color, margin: "0 0 2px" }}>Officer decision: {officerMeta.label}</p>
              {officerComment && <p style={{ fontSize: 11, color: "#6b7280", margin: 0, fontStyle: "italic" }}>"{officerComment}"</p>}
            </div>
          )}

          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Your Decision</p>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { v: "APPROVED",          label: "Approve",  color: "#15803d", bg: "#f0fdf4", border: "#86efac" },
                { v: "RESUBMIT_REQUIRED", label: "Resubmit", color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
                { v: "REJECTED",          label: "Reject",   color: "#991b1b", bg: "#fef2f2", border: "#fca5a5" },
              ].map(opt => (
                <button key={opt.v} onClick={() => { setStatus(opt.v); setConfirmed(false); setConfirmedAt(null); }}
                  style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${status === opt.v ? opt.border : "#e2e8f0"}`, background: status === opt.v ? opt.bg : "white", color: status === opt.v ? opt.color : "#6b7280", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Comment {commentRequired ? <span style={{ color: "#ef4444" }}>*</span> : <span style={{ color: "#9ca3af", fontWeight: 400, textTransform: "none" }}>(optional)</span>}
            </p>
            <textarea value={comment} onChange={e => { setComment(e.target.value); setConfirmed(false); setConfirmedAt(null); }} rows={3}
              placeholder={status === "RESUBMIT_REQUIRED" ? "Explain what needs to be fixed or resubmitted…" : status === "REJECTED" ? "Explain the reason for rejection…" : "Add a note for the record (optional)…"}
              style={{ width: "100%", fontSize: 12, border: `1.5px solid ${commentRequired && !comment.trim() ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 8, padding: "8px 10px", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
            {commentRequired && !comment.trim() && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>A comment is required for this decision.</p>}
          </div>

          {/* Signature + Confirm */}
          {status && (
            <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <PenIcon size={14} stroke="#374151" />
                <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0 }}>Supervisor Signature &amp; Confirmation</p>
              </div>
              {loadingSig ? (
                <p style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</p>
              ) : sig && !showSigPad ? (
                <div>
                  <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Supervisor Signature</p>
                    <img src={sig} alt="Supervisor signature" style={{ display: "block", height: 48, objectFit: "contain", objectPosition: "left", maxWidth: "100%" }} />
                    <button onClick={() => { setShowSigPad(true); setConfirmed(false); setConfirmedAt(null); }}
                      style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                      <PenIcon size={10} /> Draw a different signature
                    </button>
                  </div>
                  {!confirmed ? (
                    <div style={{ background: "white", border: `1.5px solid ${decisionColor}22`, borderRadius: 8, padding: "12px 14px" }}>
                      <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, marginBottom: 10 }}>
                        By confirming, I certify this <strong style={{ color: decisionColor }}>{decisionLabel}</strong> decision is accurate and in accordance with DLRSJAM policy.
                      </p>
                      <button disabled={!canConfirm}
                        onClick={() => { setConfirmed(true); setConfirmedAt(new Date().toISOString()); }}
                        style={{ width: "100%", padding: "9px 0", borderRadius: 7, border: "none", background: canConfirm ? decisionColor : "#e2e8f0", color: canConfirm ? "white" : "#9ca3af", fontSize: 13, fontWeight: 700, cursor: canConfirm ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                        Confirm {decisionLabel}
                      </button>
                    </div>
                  ) : (
                    <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle size={16} stroke="#16a34a" />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#15803d", margin: 0 }}>Decision confirmed</p>
                        <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{fmtTime(confirmedAt)}</p>
                      </div>
                      <button onClick={() => { setConfirmed(false); setConfirmedAt(null); }} style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Undo</button>
                    </div>
                  )}
                </div>
              ) : (
                <SupervisorSigPad
                  existingSig={sig}
                  onSave={s => { setSig(s); setShowSigPad(false); setConfirmed(false); setConfirmedAt(null); }}
                  onUseExisting={() => { setShowSigPad(false); setConfirmed(false); setConfirmedAt(null); }}
                />
              )}
            </div>
          )}

          {err && <p style={{ fontSize: 11, color: "#dc2626" }}>{err}</p>}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8, position: "sticky", bottom: 0, background: "white" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={handleSave} disabled={!canSubmit || submitting}
            style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: canSubmit ? decisionColor : "#94a3b8", color: "white", fontSize: 13, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            {submitting ? "Saving…" : `Submit — ${decisionLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const SUP_DOC_LABELS = {
  national_id_front:      "National ID (Front)",
  national_id_back:       "National ID (Back)",
  existing_licence_front: "Driver's Licence (Front)",
  existing_licence_back:  "Driver's Licence (Back)",
  police_report:          "Police Report",
  proof_of_address:       "Proof of Address",
  trustee_letter:         "Authorisation Letter",
};

// Step: Documents — supporting docs + verification panel
function StepDocuments({ app, appId, onPreview, onAppUpdate, supervisorName, readOnly }) {
  const DOC_ORDER = [
    "trustee_letter",
    "national_id_front", "national_id_back",
    "existing_licence_front", "existing_licence_back",
    "police_report", "proof_of_address",
  ];

  const GROUP_LABELS = {
    trustee_letter:    "Authorisation Letter",
    national_id:       "National ID",
    existing_licence:  "Driver's Licence",
  };

  const docs = (app?.documents || [])
    .filter(d => d.is_current && d.doc_type !== "licence_photo" && d.doc_type !== "verification_photo")
    .sort((a, b) => {
      const ai = DOC_ORDER.indexOf(a.doc_type);
      const bi = DOC_ORDER.indexOf(b.doc_type);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const [reviewingDoc,  setReviewingDoc]  = useState(null);
  const [localReviews,  setLocalReviews]  = useState({});

  useEffect(() => {
    const init = {};
    const NON_PHOTO = ["licence_photo", "verification_photo"];
    const allDocs = app?.documents || [];
    for (let i = 0; i < allDocs.length; i++) {
      const doc = allDocs[i];
      if (doc.is_current && !NON_PHOTO.includes(doc.doc_type) && doc.review_status) {
        init[doc.id] = { status: doc.review_status, comment: doc.review_comment || "" };
      }
    }
    setLocalReviews(init);
  }, [app?.documents]);

  return (
    <>
      {reviewingDoc && (
        <SupDocReviewModal
          title={`Review: ${SUP_DOC_LABELS[reviewingDoc.doc_type] || reviewingDoc.doc_type?.replace(/_/g, " ")}`}
          subtitle="Supervisor decision — overrides officer"
          previewUrl={null}
          officerStatus={reviewingDoc.review_status}
          officerComment={reviewingDoc.review_comment}
          currentStatus={localReviews[reviewingDoc.id]?.status || reviewingDoc.review_status || ""}
          currentComment={localReviews[reviewingDoc.id]?.comment || reviewingDoc.review_comment || ""}
          appId={appId}
          docId={reviewingDoc.id}
          onDone={(s, c) => {
            setLocalReviews(prev => ({ ...prev, [reviewingDoc.id]: { status: s, comment: c } }));
            onAppUpdate?.();
          }}
          onClose={() => setReviewingDoc(null)}
        />
      )}
      <div className={pStyles.stepContent}>
        <div className={pStyles.sectionHead}>
          <FileIcon size={18} stroke="#2563eb" />
          <h2 className={pStyles.sectionTitle}>Verification &amp; Documents</h2>
          <span className={pStyles.sectionNote}>{docs.length} supporting doc{docs.length !== 1 ? "s" : ""}</span>
        </div>

        {/* ── Identity Verification Panel ── */}
        {(app?.verification_attempts || app?.verification_result || app?.liveness_score != null || app?.face_match_score != null) && (
          <div style={{ padding: "0 22px 18px", borderBottom: "1px solid #f3f4f6" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Identity Verification</p>
            <VerificationPanel app={app} appId={appId} onAppUpdate={onAppUpdate} supervisorName={supervisorName} readOnly={readOnly} />
          </div>
        )}

        {/* ── Supporting documents ── */}
        {docs.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "#9ca3af", fontSize: 13 }}>
            <FileIcon size={36} stroke="#d1d5db" />
            No supporting documents uploaded
          </div>
        ) : (
          <>
            <div style={{ padding: "14px 22px 6px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>Supporting Documents</p>
            </div>
            <div style={{ padding: "0 22px 18px", display: "flex", flexDirection: "column", gap: 20 }}>
              {(() => {
                const baseType = dt => dt?.replace(/_(front|back)$/i, "") ?? dt;
                const groups = [];
                const seen = new Map();
                docs.forEach(doc => {
                  const key = baseType(doc.doc_type);
                  if (!seen.has(key)) { seen.set(key, []); groups.push({ key, items: seen.get(key) }); }
                  seen.get(key).push(doc);
                });
                return groups.map(({ key, items }) => (
                  <div key={key}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                      {GROUP_LABELS[key] || key.replace(/_/g, " ")}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                      {items.map(doc => {
                        const meta = doc.review_status ? DOC_STATUS_META[doc.review_status] : null;
                        return (
                          <div key={doc.id} className={`${pStyles.docCard} ${doc.review_status === "APPROVED" ? pStyles.docCardApproved : doc.review_status === "RESUBMIT_REQUIRED" ? pStyles.docCardResubmit : doc.review_status === "REJECTED" ? pStyles.docCardRejected : ""}`}>
                            <div className={pStyles.docCardHeader}>
                              <div>
                                <p className={pStyles.docCardType}>{SUP_DOC_LABELS[doc.doc_type] || doc.doc_type?.replace(/_/g, " ")}</p>
                                <p className={pStyles.docCardSub}>{doc.original_filename || "—"}</p>
                              </div>
                              {meta && (
                                <span className={pStyles.docCardBadge} style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                              )}
                            </div>
                            <div className={pStyles.docCardBody}>
                              {doc.review_comment && <p style={{ fontSize: 11, color: "#6b7280", fontStyle: "italic", marginBottom: 8 }}>"{doc.review_comment}"</p>}
                              <div className={pStyles.docActions}>
                                <button className={`${pStyles.docBtn} ${pStyles.docBtnPreview}`} onClick={() => onPreview(doc)}>
                                  <FileIcon size={12} /> View
                                </button>
                                {!readOnly && (
                                  <>
                                    <button className={`${pStyles.docBtn} ${doc.review_status === "APPROVED" ? pStyles.docBtnApproveActive : pStyles.docBtnApprove}`}
                                      onClick={() => setReviewingDoc(doc)}>
                                      <CheckIcon size={11} stroke="currentColor" sw={2.5} /> Approve
                                    </button>
                                    <button className={`${pStyles.docBtn} ${doc.review_status === "RESUBMIT_REQUIRED" ? pStyles.docBtnResubmitActive : pStyles.docBtnResubmit}`}
                                      onClick={() => setReviewingDoc(doc)}>
                                      <RotateIcon size={11} stroke="currentColor" /> Resubmit
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </>
        )}

        {/* Activity log — collapsible */}
        {(app?.events || []).length > 0 && <ActivityLog events={app.events} />}
      </div>
    </>
  );
}

// Step: Checklist
const CHECKLIST_ITEMS = [
  "Applicant identity verified against licence record",
  "All submitted documents reviewed",
  "Face match and liveness scores reviewed",
  "Escalation reason assessed and understood",
  "Payment and fee confirmation checked",
  "No outstanding compliance flags",
  "Decision is consistent with DLRSJAM policy",
];

function StepChecklist({ checklist, setChecklist, readOnly }) {
  return (
    <div className={pStyles.stepContent}>
      <div className={pStyles.sectionHead}>
        <CheckCircle size={18} stroke="#2563eb" />
        <h2 className={pStyles.sectionTitle}>Supervisor Checklist</h2>
        <span className={pStyles.sectionNote}>{Object.values(checklist).filter(Boolean).length}/{CHECKLIST_ITEMS.length} complete</span>
      </div>
      <div className={pStyles.checklistList}>
        {CHECKLIST_ITEMS.map((item, i) => {
          const checked = !!checklist[i];
          return (
            <div key={i}
              className={`${pStyles.checklistItem} ${checked ? pStyles.checklistItemChecked : ""}`}
              onClick={readOnly ? undefined : () => setChecklist(prev => ({ ...prev, [i]: !prev[i] }))}
              style={readOnly ? { cursor: "default", opacity: 0.6 } : undefined}>
              <div className={`${pStyles.checkBox} ${checked ? pStyles.checkBoxChecked : ""}`}>
                {checked && <CheckIcon size={12} stroke="white" sw={2.5} />}
              </div>
              <span className={`${pStyles.checkLabel} ${checked ? pStyles.checkLabelChecked : ""}`}>{item}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Step: Supervisor Decision
const SUP_DECISIONS = [
  { id: "approve",  label: "Approve Application", desc: "Override or confirm officer — issue the digital licence.",  iconColor: "#16a34a", iconBg: "#f0fdf4", activeClass: pStyles.decisionCardApproveActive,  commentRequired: false },
  { id: "reject",   label: "Reject Application",  desc: "Application does not meet requirements.",                   iconColor: "#dc2626", iconBg: "#fef2f2", activeClass: pStyles.decisionCardRejectActive,   commentRequired: true  },
  { id: "resubmit", label: "Request Resubmission",desc: "Ask the applicant to re-upload one or more docs.",         iconColor: "#d97706", iconBg: "#fffbeb", activeClass: pStyles.decisionCardResubmitActive, commentRequired: true  },
  { id: "return",   label: "Return to Officer",   desc: "Send back to officer queue with instructions.",            iconColor: "#7c3aed", iconBg: "#f5f3ff", activeClass: pStyles.decisionCardEscalateActive, commentRequired: true  },
];

function StepDecision({ appId, supervisorName, supervisorId, onDecisionMade }) {
  const [decision,    setDecision]    = useState("");
  const [comment,     setComment]     = useState("");
  const [sig,         setSig]         = useState(null);
  const [showSigPad,  setShowSigPad]  = useState(false);
  const [loadingSig,  setLoadingSig]  = useState(true);
  const [confirmed,   setConfirmed]   = useState(false);
  const [confirmedAt, setConfirmedAt] = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");

  useEffect(() => {
    api.get("/api/supervisor/profile/signature")
      .then(r => { if (r.data.signature_image) setSig(r.data.signature_image); })
      .catch(() => {})
      .finally(() => setLoadingSig(false));
  }, []);

  const selected      = SUP_DECISIONS.find(d => d.id === decision);
  const commentOk     = !selected?.commentRequired || comment.trim().length > 0;
  const canConfirm    = !!decision && commentOk && !!sig;
  const canSubmit     = canConfirm && confirmed;
  const decisionColor = { approve: "#16a34a", reject: "#dc2626", resubmit: "#d97706", return: "#7c3aed" }[decision] || "#374151";
  const decisionLabel = { approve: "Approval", reject: "Rejection", resubmit: "Resubmission Request", return: "Return to Officer" }[decision] || "Decision";

  const DecisionIcon = ({ id, ...p }) => {
    if (id === "approve")  return <CheckCircle {...p} />;
    if (id === "reject")   return <XCircle {...p} />;
    if (id === "resubmit") return <RotateIcon {...p} />;
    return <ArrowLeft {...p} />;
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      if (decision === "approve")  await api.post(`/api/supervisor/applications/${appId}/approve`,           { notes: comment });
      if (decision === "reject")   await api.post(`/api/supervisor/applications/${appId}/reject`,            { notes: comment });
      if (decision === "resubmit") await api.post(`/api/supervisor/applications/${appId}/request-resubmit`,  { items: [], comments: comment });
      if (decision === "return")   await api.post(`/api/supervisor/applications/${appId}/return-to-officer`, { reason: comment });
      onDecisionMade();
    } catch (e) {
      setError(e.response?.data?.error || "An error occurred. Please try again.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className={pStyles.stepContent}>
      <div className={pStyles.sectionHead}>
        <AlertIcon size={18} stroke="#2563eb" />
        <h2 className={pStyles.sectionTitle}>Supervisor Decision</h2>
        <span className={pStyles.sectionNote}>This action cannot be undone</span>
      </div>

      <div className={pStyles.decisionGrid}>
        {SUP_DECISIONS.map(d => (
          <div key={d.id}
            className={`${pStyles.decisionCard} ${decision === d.id ? d.activeClass : ""}`}
            onClick={() => { setDecision(d.id); setConfirmed(false); setConfirmedAt(null); if (!d.commentRequired) setComment(""); }}>
            <div className={pStyles.decisionIcon} style={{ background: d.iconBg }}>
              <DecisionIcon id={d.id} size={20} stroke={d.iconColor} />
            </div>
            <p className={pStyles.decisionLabel}>{d.label}</p>
            <p className={pStyles.decisionDesc}>{d.desc}</p>
          </div>
        ))}
      </div>

      {decision && (
        <div className={pStyles.commentBox}>
          <label className={pStyles.commentLabel}>
            {selected?.commentRequired
              ? <>Supervisor Comment <span className={pStyles.commentRequired}>*</span> — visible to officer and applicant</>
              : "Supervisor Comment (optional)"}
          </label>
          <textarea className={pStyles.commentTextarea} value={comment}
            onChange={e => { setComment(e.target.value); setConfirmed(false); setConfirmedAt(null); }}
            placeholder={
              decision === "approve"  ? "Add any notes for the record (optional)…" :
              decision === "reject"   ? "Explain the reason for rejection…" :
              decision === "resubmit" ? "Explain exactly what needs to be fixed or resubmitted…" :
              "Explain why this is being returned to the officer…"
            } rows={4} />
          {selected?.commentRequired && !comment.trim() && (
            <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>A comment is required for this decision.</p>
          )}
        </div>
      )}

      {decision && (
        <div style={{ margin: "0 22px 24px", padding: 20, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <PenIcon size={16} stroke="#374151" />
            <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Supervisor Signature &amp; Confirmation</p>
          </div>
          {loadingSig ? (
            <p style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</p>
          ) : sig && !showSigPad ? (
            <div>
              <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Supervisor Signature</p>
                <img src={sig} alt="Supervisor signature" style={{ display: "block", height: 56, objectFit: "contain", objectPosition: "left", maxWidth: "100%" }} />
                <button onClick={() => { setShowSigPad(true); setConfirmed(false); setConfirmedAt(null); }}
                  style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <PenIcon size={10} /> Draw a different signature
                </button>
              </div>
              {!confirmed ? (
                <div style={{ background: "white", border: `1.5px solid ${decisionColor}22`, borderRadius: 10, padding: "14px 16px" }}>
                  <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, marginBottom: 12 }}>
                    By confirming, I <strong>{supervisorName || "Supervisor"}</strong> certify that this <strong style={{ color: decisionColor }}>{decisionLabel}</strong> decision is accurate and made in accordance with DLRSJAM policy.
                  </p>
                  <button disabled={!commentOk} onClick={() => { setConfirmed(true); setConfirmedAt(new Date().toISOString()); }}
                    style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "none", background: commentOk ? decisionColor : "#e2e8f0", color: commentOk ? "white" : "#9ca3af", fontSize: 13, fontWeight: 700, cursor: commentOk ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                    Confirm {decisionLabel}
                  </button>
                </div>
              ) : (
                <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle size={18} stroke="#16a34a" />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#15803d" }}>Decision confirmed</p>
                    <p style={{ fontSize: 11, color: "#6b7280" }}>{fmtTime(confirmedAt)}</p>
                  </div>
                  <button onClick={() => { setConfirmed(false); setConfirmedAt(null); }}
                    style={{ marginLeft: "auto", fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Undo</button>
                </div>
              )}
            </div>
          ) : (
            <SupervisorSigPad existingSig={sig} onSave={s => { setSig(s); setShowSigPad(false); }} onUseExisting={() => setShowSigPad(false)} />
          )}
        </div>
      )}

      {error && (
        <div style={{ margin: "0 22px 16px", padding: "10px 14px", background: "#fff1f2", border: "1.5px solid #fecdd3", borderRadius: 9, fontSize: 13, color: "#be123c", fontWeight: 600 }}>{error}</div>
      )}

      <div style={{ margin: "0 22px 24px" }}>
        <button disabled={!canSubmit || submitting} onClick={handleSubmit}
          style={{ width: "100%", padding: 13, borderRadius: 10, border: "none", background: canSubmit && !submitting ? decisionColor : "#e2e8f0", color: canSubmit && !submitting ? "white" : "#9ca3af", fontSize: 14, fontWeight: 800, cursor: canSubmit && !submitting ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {submitting
            ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Processing…</>
            : !decision ? "Select a decision above" : `Confirm & Submit — ${decisionLabel}`}
        </button>
      </div>

      <div style={{ padding: "8px 22px 16px", fontSize: 11, color: "#9ca3af", borderTop: "1px solid #f3f4f6" }}>
        Acting as: {supervisorName || "Supervisor"} · {supervisorId || ""}
      </div>
    </div>
  );
}

function SupervisorSigPad({ existingSig, onSave, onUseExisting }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const getPos = (e, c) => { const r = c.getBoundingClientRect(); const s = e.touches ? e.touches[0] : e; return { x: s.clientX - r.left, y: s.clientY - r.top }; };
  const startDraw = useCallback(e => { e.preventDefault(); drawing.current = true; const c = canvasRef.current; const ctx = c.getContext("2d"); const p = getPos(e, c); ctx.beginPath(); ctx.moveTo(p.x, p.y); }, []);
  const draw = useCallback(e => { e.preventDefault(); if (!drawing.current) return; const c = canvasRef.current; const ctx = c.getContext("2d"); const p = getPos(e, c); ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#2D0A42"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); setIsEmpty(false); }, []);
  const stopDraw = useCallback(() => { drawing.current = false; }, []);
  const clear = () => { canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); setIsEmpty(true); };
  const save = async () => {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    setSaving(true);
    try { await api.post("/api/supervisor/profile/signature", { signature_image: dataUrl }); } catch {}
    setSaving(false);
    onSave(dataUrl);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {existingSig && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 8 }}>
          <img src={existingSig} alt="Saved sig" style={{ height: 32, objectFit: "contain" }} />
          <div style={{ flex: 1 }}><p style={{ fontSize: 10, fontWeight: 700, color: "#15803d" }}>Saved signature on file</p></div>
          <button onClick={onUseExisting} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#16a34a", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Use saved</button>
        </div>
      )}
      <div style={{ position: "relative" }}>
        <canvas ref={canvasRef} width={420} height={90}
          style={{ width: "100%", height: 90, border: "1.5px solid #cbd5e1", borderRadius: 8, background: "#fafbff", cursor: "crosshair", display: "block", touchAction: "none" }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
        {isEmpty && <p style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 11, color: "#cbd5e1", pointerEvents: "none" }}>Draw your signature here</p>}
        {!isEmpty && <button onClick={clear} style={{ position: "absolute", top: 5, right: 5, background: "white", border: "1px solid #e2e8f0", borderRadius: 5, padding: "2px 6px", cursor: "pointer", fontSize: 10, color: "#6b7280", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}><TrashIcon size={9} /> Clear</button>}
      </div>
      <button onClick={save} disabled={isEmpty || saving}
        style={{ padding: "8px 0", borderRadius: 7, border: "none", background: isEmpty ? "#e2e8f0" : "#2D0A42", color: "white", fontSize: 12, fontWeight: 700, cursor: isEmpty ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
        {saving ? "Saving…" : "Save & Use This Signature"}
      </button>
    </div>
  );
}

// Completed Application Summary View
const EV_LABEL_SUP = {
  STATUS_CHANGE:             "Status Changed",
  DOCUMENT_REVIEW:           "Document Reviewed",
  ESCALATION:                "Case Escalated",
  OFFICER_ASSIGNED:          "Officer Assigned",
  ASSIGNMENT:                "Officer Assigned",
  REVERIFICATION_REQUESTED:  "Re-verification Requested",
  REVERIFICATION_CANCELLED:  "Re-verification Cancelled",
  MANUAL_REVIEW_CLEARED:     "Manual Review Cleared",
  VERIFICATION_OVERRIDE:     "Verification Overridden",
  VERIFICATION_PASSED:       "Verification Passed",
  VERIFICATION_ATTEMPT_FAILED: "Verification Attempt Failed",
  ITA_CLEARED:               "ITA Clearance Received",
  ITA_REQUEST:               "ITA Request Sent",
  ITA_REQUESTED:             "ITA Clearance Requested",
  SUPERVISOR_DECISION:       "Supervisor Decision",
  CREATED:                   "Application Created",
  SUBMITTED:                 "Application Submitted",
  PAYMENT_CONFIRMED:         "Payment Confirmed",
  REVIEW_STARTED:            "Under Review",
  ACTION_REQUIRED:           "Action Required",
  RESUBMITTED:               "Documents Resubmitted",
  ESCALATED:                 "Escalated to Supervisor",
  APPROVED:                  "Application Approved",
  REJECTED:                  "Application Rejected",
  DIGITAL_LICENCE_GENERATED: "Digital Licence Generated",
  WAITING_ON_APPLICANT:      "Waiting on Applicant",
};

const ACTOR_ROLE_COLOR_SUP = {
  officer:    { color: "#1d4ed8", bg: "#dbeafe" },
  supervisor: { color: "#7c3aed", bg: "#f5f3ff" },
  applicant:  { color: "#15803d", bg: "#dcfce7" },
  system:     { color: "#6b7280", bg: "#f1f5f9" },
  user:       { color: "#6b7280", bg: "#f1f5f9" },
};

const TX_LABEL_DONE = { RENEWAL: "Licence Renewal", REPLACEMENT: "Licence Replacement", AMENDMENT: "Licence Amendment" };

const OUTCOME_SUP = {
  APPROVED: { label: "APPROVED", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", strip: "#dcfce7" },
  REJECTED: { label: "REJECTED", color: "#991b1b", bg: "#fef2f2", border: "#fecaca", strip: "#fee2e2" },
};

function fmtDTSup(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z") ? iso : iso + "Z";
  return new Date(s).toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Jamaica" });
}
function fmtDSup(raw) {
  if (!raw) return "—";
  const s = String(raw);
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, day] = s.split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric" });
  }
  return fmtDTSup(s);
}

function CFSup({ label, value, mono, span2 }) {
  return (
    <div style={{ gridColumn: span2 ? "1/-1" : undefined }}>
      <p style={{ fontSize: 7, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 2px" }}>{label}</p>
      <p style={{ fontSize: 10, fontWeight: 600, color: "#111827", fontFamily: mono ? "monospace" : "inherit", margin: 0, lineHeight: 1.45, letterSpacing: mono ? "0.05em" : 0, wordBreak: "break-all" }}>{value || "—"}</p>
    </div>
  );
}

const DOC_META_SUP = {
  APPROVED:          { label: "Approved",          color: "#15803d", bg: "#dcfce7", dot: "#22c55e" },
  RESUBMIT_REQUIRED: { label: "Resubmit Required", color: "#92400e", bg: "#fef9c3", dot: "#f59e0b" },
  REJECTED:          { label: "Rejected",          color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
};

function OverrideModal({ app, supervisorName, onClose, onDone }) {
  const [reason,     setReason]     = useState("");
  const [sig,        setSig]        = useState(null);
  const [showPad,    setShowPad]    = useState(false);
  const [loadingSig, setLoadingSig] = useState(true);

  useEffect(() => {
    api.get("/api/supervisor/profile/signature")
      .then(r => { if (r.data.signature_image) setSig(r.data.signature_image); })
      .catch(() => {})
      .finally(() => setLoadingSig(false));
  }, []);

  const canProceed = reason.trim().length > 0 && !!sig;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 480, padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "#f5f3ff", border: "1.5px solid #ddd6fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0 }}>Override Decision</p>
            <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
              You will review the documents and make a new decision for this application.
            </p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <XIcon size={15} />
          </button>
        </div>

        {/* Reason */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
            Reason for review <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Why are you overriding this decision for review?…"
            rows={3}
            style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = "#7c3aed"}
            onBlur={e  => e.target.style.borderColor = "#e2e8f0"} />
          {reason.trim().length === 0 && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>A reason is required.</p>}
        </div>

        {/* Signature */}
        <div style={{ padding: "14px 16px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <PenIcon size={13} stroke="#374151" /> Confirm with Signature <span style={{ color: "#dc2626" }}>*</span>
          </p>
          {loadingSig ? (
            <p style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</p>
          ) : sig && !showPad ? (
            <div>
              <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                <img src={sig} alt="Supervisor signature" style={{ display: "block", height: 48, objectFit: "contain", objectPosition: "left", maxWidth: "100%" }} />
              </div>
              <button onClick={() => setShowPad(true)}
                style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                <PenIcon size={10} /> Draw a different signature
              </button>
            </div>
          ) : (
            <SupervisorSigPad existingSig={sig} onSave={s => { setSig(s); setShowPad(false); }} onUseExisting={() => setShowPad(false)} />
          )}
        </div>

        <p style={{ fontSize: 11, color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
          I, <strong>{supervisorName || "Supervisor"}</strong>, am overriding this decision to conduct a full review of the documents and application.
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button disabled={!canProceed} onClick={() => canProceed && onDone()}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: canProceed ? "#7c3aed" : "#e2e8f0", color: canProceed ? "white" : "#9ca3af", fontSize: 13, fontWeight: 700, cursor: canProceed ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            Proceed to Review
          </button>
        </div>
      </div>
    </div>
  );
}

function CompletedSummaryView({ app, applicant, licence, officer, onOverride, supervisorName, supervisorId }) {
  const isApproved = app?.status === "APPROVED";
  const o = isApproved ? OUTCOME_SUP.APPROVED : OUTCOME_SUP.REJECTED;
  const od = app?.officer_decision;
  const sd = app?.supervisor_decision;

  const [photoBlobUrl,     setPhotoBlobUrl]     = useState(null);
  const [verifyBlobUrl,    setVerifyBlobUrl]    = useState(null);
  const [previewDocC,      setPreviewDocC]      = useState(null);
  const [showHistory,      setShowHistory]      = useState(false);
  const [showVerify,       setShowVerify]       = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  const docs      = (app?.documents || []).filter(d => d.is_current && d.doc_type !== "licence_photo" && d.doc_type !== "verification_photo");
  const photoDoc  = (app?.documents || []).find(d => d.doc_type === "licence_photo"      && d.is_current);
  const verifyDoc = (app?.documents || []).find(d => d.doc_type === "verification_photo" && d.is_current);
  const events    = app?.events || [];
  const decidedAt = events.filter(e => e.to_status === app?.status).slice(-1)[0]?.created_at;
  const fullName  = [applicant?.firstname, applicant?.lastname].filter(Boolean).join(" ").toUpperCase();
  const address   = [applicant?.address_line1, applicant?.address_line2, applicant?.parish].filter(Boolean).join(", ");
  const verifyCode = `${app?.application_number || ""}·${(licence?.trn || "").slice(-4)}·TAJ`;

  useEffect(() => {
    if (!photoDoc || !app?.id) return;
    let url;
    api.get(`/api/supervisor/applications/${app.id}/documents/${photoDoc.id}/file`, { responseType: "blob" })
      .then(r => { url = URL.createObjectURL(r.data); setPhotoBlobUrl(url); })
      .catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [app?.id, photoDoc?.id]);

  useEffect(() => {
    if (!verifyDoc || !app?.id) return;
    let url;
    api.get(`/api/supervisor/applications/${app.id}/documents/${verifyDoc.id}/file`, { responseType: "blob" })
      .then(r => { url = URL.createObjectURL(r.data); setVerifyBlobUrl(url); })
      .catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [app?.id, verifyDoc?.id]);

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {previewDocC && (
        <DocPreviewModal doc={previewDocC} appId={app?.id} onClose={() => setPreviewDocC(null)} />
      )}
      {showOverrideModal && (
        <OverrideModal
          app={app}
          supervisorName={supervisorName}
          onClose={() => setShowOverrideModal(false)}
          onDone={() => { setShowOverrideModal(false); onOverride(); }}
        />
      )}

      {/* ══ Decision banner ══ */}
      <div style={{ margin: "16px 24px 0", borderRadius: 14, border: `2px solid ${o.border}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: o.strip, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: o.bg, border: `2px solid ${o.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {isApproved
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={o.color} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={o.color} strokeWidth="2" strokeLinecap="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M15 9l-6 6M9 9l6 6"/></svg>}
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.2px", margin: "0 0 3px", color: o.color }}>
              {isApproved ? "Application Approved" : "Application Rejected"}
            </p>
            <p style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5, margin: 0 }}>
              {sd
                ? `Supervisor override · ${sd.supervisor_name} · ${fmtDTSup(sd.timestamp)}`
                : od
                  ? `Decided by ${od.officer_name} · ${fmtDTSup(od.timestamp)}`
                  : `Decided ${fmtDTSup(decidedAt)}`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 600, color: o.color }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={o.color} strokeWidth="2" strokeLinecap="round"><path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Read-only record · All events logged
          </div>
          <button onClick={() => setShowOverrideModal(true)}
            style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid #ddd6fe", background: "white", color: "#6d28d9", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Override Decision
          </button>
        </div>
      </div>

      <div style={{ padding: "0 24px 24px" }}>

        {/* ══ LICENCE RECORD ══ */}
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>

          {/* Slim section label */}
          <div style={{ padding: "10px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Licence Record</p>
            <p style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace", margin: 0 }}>{app?.application_number}</p>
          </div>

          {/* Two-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 0, borderBottom: "1px solid #e2e8f0" }}>

            {/* LEFT: licence summary */}
            <div style={{ padding: "20px", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Photo + name + class */}
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 72, height: 88, borderRadius: 8, overflow: "hidden", border: "1.5px solid #e2e8f0", flexShrink: 0, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {photoBlobUrl
                    ? <img src={photoBlobUrl} alt="Applicant" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <div>
                      <p style={{ fontSize: 7, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 2px" }}>Full Name</p>
                      <p style={{ fontSize: 13, fontWeight: 800, color: "#111827", margin: 0 }}>{fullName || "—"}</p>
                    </div>
                    <div style={{ background: "#1e3a8a", borderRadius: 6, padding: "4px 10px", textAlign: "center", flexShrink: 0 }}>
                      <p style={{ fontSize: 7, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 1px" }}>Class</p>
                      <p style={{ fontSize: 20, fontWeight: 900, color: "white", margin: 0, lineHeight: 1 }}>{licence?.licence_class || "—"}</p>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px" }}>
                    <CFSup label="Date of Birth" value={fmtDSup(applicant?.date_of_birth)} />
                    <CFSup label="Sex"           value={applicant?.sex} />
                  </div>
                </div>
              </div>

              {/* Core licence fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                <CFSup label="TRN"              value={licence?.trn}            mono />
                <CFSup label="Control Number"   value={licence?.control_number} mono />
                <CFSup label="First Issue Date" value={fmtDSup(licence?.first_issue_date)} />
                <CFSup label="Issue Date"       value={fmtDSup(licence?.issue_date)} />
                <CFSup label="Expiry Date"      value={fmtDSup(licence?.expiry_date)} />
                <CFSup label="Status"           value={licence?.status} />
                <CFSup label="Collectorate"     value={licence?.collectorate} span2 />
                <CFSup label="Occupation"       value={applicant?.occupation} />
                <CFSup label="Nationality"      value={licence?.nationality} />
                <CFSup label="Address"          value={address} span2 />
              </div>

              {/* Officer sign-off block */}
              <div style={{ padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Signing Officer</p>
                {od ? (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", marginBottom: od.officer_signature ? 10 : 0 }}>
                      <CFSup label="Name"       value={od.officer_name} />
                      <CFSup label="Staff ID"   value={od.officer_staff_id} mono />
                      <CFSup label="Decision"   value={od.decision} />
                      <CFSup label="Decided At" value={fmtDTSup(od.timestamp)} />
                    </div>
                    {od.officer_signature && (
                      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 10px", display: "inline-block" }}>
                        <img src={od.officer_signature} alt="Officer signature" style={{ maxHeight: 40, maxWidth: 160, display: "block" }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: "#d1d5db", fontStyle: "italic", margin: 0 }}>No officer signature recorded</p>
                )}
              </div>

              {/* Supervisor sign-off block */}
              <div style={{ padding: "12px 14px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Supervisor</p>
                {sd ? (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", marginBottom: sd.supervisor_signature ? 10 : 0 }}>
                      <CFSup label="Name"        value={sd.supervisor_name} />
                      <CFSup label="Decision"    value={sd.decision?.replace(/_/g, " ")} />
                      <CFSup label="Signed Off"  value={fmtDTSup(sd.timestamp)} />
                    </div>
                    {sd.supervisor_signature && (
                      <div style={{ background: "white", border: "1px solid #ddd6fe", borderRadius: 7, padding: "6px 10px", display: "inline-block" }}>
                        <img src={sd.supervisor_signature} alt="Supervisor signature" style={{ maxHeight: 40, maxWidth: 160, display: "block" }} />
                      </div>
                    )}
                    {sd.notes && (
                      <p style={{ fontSize: 11, color: "#6b7280", margin: "8px 0 0", fontStyle: "italic" }}>"{sd.notes}"</p>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: "#c4b5fd", fontStyle: "italic", margin: 0 }}>No supervisor action recorded</p>
                )}
              </div>
            </div>

            {/* RIGHT: details */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Contact info */}
              <div style={{ padding: "14px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Contact Information</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                  <CFSup label="Phone"     value={applicant?.phone} />
                  <CFSup label="Parish"    value={applicant?.parish} />
                  <CFSup label="Email"     value={applicant?.email} span2 />
                  <CFSup label="Address"   value={address}          span2 />
                  <CFSup label="Occupation" value={applicant?.occupation} />
                </div>
              </div>

              {/* Application + Payment */}
              <div style={{ padding: "14px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Application & Payment</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                  <CFSup label="Transaction"         value={TX_LABEL_DONE[app?.transaction_type]} />
                  <CFSup label="Reference"           value={app?.application_number} mono />
                  <CFSup label="Submitted"           value={fmtDSup(app?.submitted_at)} />
                  <CFSup label="Decided"             value={fmtDTSup(decidedAt)} />
                  <CFSup label="Fee Paid"            value={app?.fee_amount ? `J$${parseFloat(app.fee_amount).toLocaleString()} JMD` : "—"} />
                  <CFSup label="Payment Ref"         value={app?.payment_reference} mono />
                  <CFSup label="Payment Confirmed"   value={fmtDTSup(app?.payment_confirmed_at)} />
                  <CFSup label="Pickup Collectorate" value={app?.pickup_collectorate} span2 />
                </div>
                {(od?.notes || app?.officer_comment) && (
                  <div style={{ marginTop: 10, padding: "8px 11px", background: "white", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 3px" }}>Officer Comment</p>
                    <p style={{ fontSize: 11, color: "#374151", margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>"{od?.notes || app?.officer_comment}"</p>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div style={{ padding: "14px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Document Review</p>
                {docs.length === 0
                  ? <p style={{ fontSize: 11, color: "#9ca3af" }}>No documents submitted.</p>
                  : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {docs.map(doc => {
                        const meta = DOC_META_SUP[doc.review_status];
                        return (
                          <div key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "white", border: "1px solid #e2e8f0", borderRadius: 7 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta?.dot || "#d1d5db", flexShrink: 0 }} />
                              <span style={{ fontSize: 11, color: "#374151", fontWeight: 500 }}>{doc.doc_type?.replace(/_/g, " ")}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {meta
                                ? <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: meta.color, background: meta.bg }}>{meta.label}</span>
                                : <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: "#9ca3af", background: "#f3f4f6" }}>PENDING</span>}
                              <button onClick={() => setPreviewDocC(doc)}
                                style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>}
              </div>

              {/* Identity verification */}
              {(app?.verification_passed != null || verifyBlobUrl) && (
                <div style={{ padding: "14px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Identity Verification</p>
                    <button onClick={() => setShowVerify(v => !v)}
                      style={{ fontSize: 11, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 6, padding: "3px 9px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      {showVerify ? "Hide" : "View"} Photo
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                    <CFSup label="Result" value={
                      app.verification_passed && !app.needs_manual_review ? "PASSED"
                      : app.needs_manual_review ? "MANUAL REVIEW" : "FAILED / FLAGGED"
                    } />
                    {app.face_match_score != null && <CFSup label="Face Match" value={`${app.face_match_score}%`} />}
                    {app.liveness_score   != null && <CFSup label="Liveness"   value={`${app.liveness_score}%`} />}
                  </div>
                  {showVerify && verifyBlobUrl && (
                    <div style={{ marginTop: 10, borderRadius: 8, overflow: "hidden", border: "1px solid #ddd6fe" }}>
                      <img src={verifyBlobUrl} alt="Verification" style={{ width: "100%", display: "block", maxHeight: 180, objectFit: "cover" }} />
                      <p style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", padding: "4px 0", margin: 0 }}>Live verification capture</p>
                    </div>
                  )}
                  {showVerify && !verifyBlobUrl && (
                    <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>No verification photo available.</p>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Updated details — full-width standalone card */}
          {(app?.address_change_requested && app?.new_address_line1 || app?.new_occupation) && (
            <div style={{ margin: "0 20px 16px", padding: "14px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Updated Details</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                {app?.address_change_requested && app?.new_address_line1 && (
                  <CFSup label="Updated Address" span2
                    value={[app.new_address_line1, app.new_address_line2, app.new_parish].filter(Boolean).join(", ")} />
                )}
                {app?.new_occupation && <CFSup label="Updated Occupation" value={app.new_occupation} />}
              </div>
            </div>
          )}

          {/* ══ VERIFICATION STRIP ══ */}
          <div style={{ padding: "14px 24px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 28 }}>
                {[3,1,2,1,3,2,1,3,1,2,1,3,2,1,2,1,3,1,2,3].map((w, i) => (
                  <div key={i} style={{ width: w, background: i % 3 === 0 ? "#1e3a8a" : "#94a3b8", borderRadius: 1, height: "100%" }} />
                ))}
              </div>
              <div>
                <p style={{ fontSize: 9, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>Document Verification Code</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a", fontFamily: "monospace", margin: 0 }}>{verifyCode}</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>Issued by</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#1e3a8a", margin: "0 0 1px" }}>TAJ Licensing Division</p>
              <p style={{ fontSize: 9, color: "#9ca3af", margin: 0 }}>Road Traffic Act, Jamaica</p>
            </div>
          </div>

          {/* ══ PROCESSING HISTORY ══ */}
          <div style={{ borderTop: "1px solid #e2e8f0" }}>
            <button onClick={() => setShowHistory(v => !v)}
              style={{ width: "100%", padding: "12px 24px", background: "#1e293b", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Processing History ({events.length} event{events.length !== 1 ? "s" : ""})
              </span>
              {showHistory
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>}
            </button>
            {showHistory && (
              <div style={{ overflowX: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "150px 180px 140px 150px 1fr", padding: "8px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  <span>Date / Time</span><span>Event</span><span>Status</span><span>Actor</span><span>Details</span>
                </div>
                {events.map((ev, i) => {
                  const evColor   = "#2563eb";
                  const roleStyle = ACTOR_ROLE_COLOR_SUP[ev.actor_role] || ACTOR_ROLE_COLOR_SUP.system;
                  const evLabel   = EV_LABEL_SUP[ev.event_type] || ev.event_type?.replace(/_/g, " ");
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "150px 180px 140px 150px 1fr", padding: "8px 24px", background: i % 2 === 0 ? "#fafafa" : "white", borderBottom: "1px solid #f3f4f6", fontSize: 11, alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "#6b7280", fontFamily: "monospace" }}>{fmtDTSup(ev.created_at)}</span>
                      <span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: evColor, background: evColor + "18" }}>
                          {evLabel}
                        </span>
                      </span>
                      <span>
                        {ev.to_status
                          ? <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: "#f1f5f9", color: "#475569" }}>{ev.to_status.replace(/_/g, " ")}</span>
                          : <span style={{ color: "#d1d5db", fontSize: 9 }}>—</span>}
                      </span>
                      <span>
                        {ev.actor
                          ? <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: roleStyle.color, background: roleStyle.bg }}>{ev.actor}</span>
                          : <span style={{ color: "#d1d5db", fontSize: 9 }}>—</span>}
                      </span>
                      <span style={{ fontSize: 10, color: "#6b7280" }}>{ev.comment || "—"}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "14px 24px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", margin: "0 0 2px" }}>Tax Administration Jamaica — DLRSJAM</p>
              <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>support@dlrsjam.gov.jm · 1-876-XXX-XXXX · Mon–Fri 8AM–4PM</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 9, color: "#9ca3af", margin: 0 }}>Official processing record · Digitally generated · Valid without physical signature</p>
            </div>
          </div>

        </div>{/* /record card */}

      </div>
    </div>
  );
}

// Main component
const CAN_ACT = new Set(["ESCALATED","PENDING_SUPERVISOR_APPROVAL","UNDER_REVIEW","SUBMITTED","RESUBMITTED"]);
const OFFICER_POSSESSION = new Set(["UNDER_REVIEW","SUBMITTED","RESUBMITTED"]);

export default function SupervisorReviewApplication() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user, hasRole } = useAuth();
  const contentRef = useRef(null);

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [step,       setStep]       = useState(0);
  const [collapsed,  setCollapsed]  = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [checklist,  setChecklist]  = useState({});
  const [forceAct,   setForceAct]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/supervisor/applications/${id}`);
      setData(res.data);
    } catch (e) {
      if (e.response?.status === 404) setNotFound(true);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    if (!hasRole("supervisor")) { navigate("/staff/login"); return; }
    load();
  }, [hasRole, navigate, load]);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.get("/api/notifications/supervisor");
        const notifs = res.data.notifications || [];
        setUnreadCount(notifs.filter(n => !n.is_read).length);
      } catch {}
    };
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [step]);

  if (loading) return (
    <div className={styles.centerState}>
      <div className={styles.spinner} />
      <p className={styles.centerText}>Loading application…</p>
    </div>
  );

  if (notFound) return (
    <div className={styles.centerState}>
      <p className={styles.errorText}>Application not found</p>
      <button onClick={() => navigate("/supervisor")} style={{ fontSize: 13, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}>← Back to Dashboard</button>
    </div>
  );

  const { application: app, applicant, licence, officer } = data || {};

  if (app?.status === "WAITING_ON_APPLICANT") {
    return (
      <div className={svStyles.root}>
        <div className={svStyles.card}>
          <div className={svStyles.iconWrap} style={{ background: "#fff7ed", borderColor: "#fed7aa" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round">
              <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 .49-4.5" />
            </svg>
          </div>
          <h2 className={svStyles.title} style={{ color: "#c2410c" }}>Waiting on Applicant</h2>
          <p className={svStyles.sub}>The reviewing officer has requested resubmission. This application will return to the queue automatically once the applicant responds.</p>
          {app.officer_comment && (
            <div className={svStyles.commentBox}>
              <p className={svStyles.commentLabel}>Officer's request to applicant</p>
              <p className={svStyles.commentVal}>"{app.officer_comment}"</p>
            </div>
          )}
          <button className={svStyles.backBtn} onClick={() => navigate("/supervisor")}>← Return to Dashboard</button>
        </div>
      </div>
    );
  }

  const canAct              = CAN_ACT.has(app?.status || "");
  const alreadyDecided      = app?.supervisor_decision || ["APPROVED","REJECTED"].includes(app?.status);
  const officerHasPossession = OFFICER_POSSESSION.has(app?.status || "");

  const isEscalated = app?.status === "ESCALATED" || !!app?.escalation_reason;
  const STEPS = [
    ...(isEscalated ? [{ id: "overview",  label: "Overview"  }] : []),
    { id: "applicant", label: "Applicant" },
    { id: "documents", label: "Documents" },
    { id: "checklist", label: "Checklist" },
    { id: "decision",  label: "Decision"  },
  ];

  const allChecked  = Object.keys(checklist).length >= CHECKLIST_ITEMS.length && Object.values(checklist).every(Boolean);
  const currentStep = STEPS[step]?.id;

  const canGoNext = () => {
    if (currentStep === "checklist") return allChecked;
    return true;
  };
  const blockMsg = () => {
    if (currentStep === "checklist" && !allChecked) return `${CHECKLIST_ITEMS.length - Object.values(checklist).filter(Boolean).length} checklist item(s) remaining.`;
    return null;
  };

  const sm       = STATUS_META[app?.status] || { label: app?.status, color: "#374151", bg: "#f1f5f9" };
  const initials = `${applicant?.firstname?.[0] || ""}${applicant?.lastname?.[0] || ""}`.toUpperCase();

  const NAV = [
    { id: "dashboard",     label: "Dashboard",        Icon: GridIcon,    group: null           },
    { id: "escalated",     label: "Escalated Cases",  Icon: ArrowUpIcon, group: "Needs Action" },
    { id: "resubmissions", label: "Resubmissions",    Icon: RotateIcon,  group: null           },
    { id: "pending",       label: "Active Queue",     Icon: ClockIcon,   group: "Monitor"      },
    { id: "all",           label: "All Applications", Icon: InboxIcon,   group: null           },
    { id: "officers",      label: "My Officers",      Icon: UsersIcon,   group: "Overview"     },
    { id: "completed",     label: "Completed",        Icon: CheckCircle, group: null           },
  ];

  const block = blockMsg();

  return (
    <div className={styles.root}>
      {previewDoc && <DocPreviewModal doc={previewDoc} appId={app?.id} onClose={() => setPreviewDoc(null)} />}

      {/* Left nav sidebar (dark purple — matches dashboard) */}
      <aside className={`${supStyles.sidebar} ${collapsed ? supStyles.collapsed : supStyles.expanded}`}>
        <div className={`${supStyles.sidebarHeader} ${collapsed ? supStyles.collapsed : supStyles.expanded}`}>
          {!collapsed && (
            <div className={supStyles.logoText}>
              <div className={supStyles.logoMark}>
                <img src={coatOfArms} alt="" style={{ width: "18px", height: "18px", objectFit: "contain" }} />
              </div>
              <div>
                <p className={supStyles.logoTitle}>DLRSJAM</p>
                <p className={supStyles.logoSub}>Supervisor Portal</p>
              </div>
            </div>
          )}
          {collapsed && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          )}
          <button className={supStyles.collapseBtn} onClick={() => setCollapsed(v => !v)}>
            {collapsed ? <ChevRight size={14} /> : <ChevLeft size={14} />}
          </button>
        </div>

        <nav className={supStyles.nav}>
          {NAV.map(({ id, label, Icon, group }, idx) => {
            const showGroup = !collapsed && group && (idx === 0 || NAV[idx - 1].group !== group);
            return (
              <React.Fragment key={id}>
                {showGroup && <div className={supStyles.navSectionLabel}>{group}</div>}
                <button
                  className={`${supStyles.navBtn} ${collapsed ? supStyles.collapsed : supStyles.expanded}`}
                  onClick={() => navigate(`/supervisor?page=${id}`)}
                  title={collapsed ? label : undefined}
                >
                  <span className={supStyles.navBtnInner}>
                    <Icon size={15} stroke="currentColor" />
                    {!collapsed && <span className={supStyles.navLabel}>{label}</span>}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        <div className={`${supStyles.sidebarFooter} ${collapsed ? supStyles.collapsed : ""}`}>
          {!collapsed && (
            <span className={supStyles.refreshTime}>{user?.name || "Supervisor"}</span>
          )}
        </div>
      </aside>

      {/* Right main */}
      <div className={styles.main}>

        {/* Topbar — purple-tinted to match supervisor theme */}
        <div className={styles.topbar} style={{ background: "white", borderBottom: "1px solid #ede9f7", boxShadow: "0 1px 0 #ede9f7" }}>
          <div>
            <p className={styles.pageTitle} style={{ color: "#1e0533" }}>Application Review</p>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
              {alreadyDecided && !forceAct
                ? `${app?.status === "APPROVED" ? "Approved" : "Rejected"} · View Summary`
                : `Step ${step + 1} of ${STEPS.length} · ${STEPS[step]?.label}`}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: sm.bg, color: sm.color }}>{sm.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: TX_BG[app?.transaction_type] || "#f1f5f9", color: TX_COLOR[app?.transaction_type] || "#374151" }}>
              {TX_LABEL[app?.transaction_type] || app?.transaction_type}
            </span>
            <button onClick={() => navigate("/supervisor")} title="Notifications"
              style={{ position: "relative", width: 32, height: 32, borderRadius: 8, border: "1px solid #ede9f7", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "#dc2626", border: "1.5px solid white" }} />
              )}
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className={styles.scrollArea}>

          {/* Hero card */}
          <div className={styles.heroCard} style={{ background: "linear-gradient(135deg, #2D0A42 0%, #4c1d95 55%, #7c3aed 100%)" }}>
            <div className={styles.heroOrb1} />
            <div className={styles.heroOrb2} />
            <div className={styles.heroGrid} />
            <div className={styles.heroInner}>
              <div className={styles.heroLeft}>
                <div className={styles.heroAvatar}>{initials}</div>
                <div>
                  <p className={styles.heroLabel}>Supervisor Portal · Application Review</p>
                  <h2 className={styles.heroName}>{applicant?.firstname} {applicant?.lastname}</h2>
                  <div className={styles.heroMeta}>
                    {[
                      ["TRN",         licence?.trn,            true ],
                      ["Control No.", licence?.control_number, true ],
                      ["Class",       licence?.licence_class,  false],
                      ["Submitted",   fmt(app?.submitted_at),  false],
                    ].filter(([, val]) => val).map(([label, val, mono]) => (
                      <span key={label} className={styles.heroMetaItem}>
                        {label} <strong style={{ fontFamily: mono ? "monospace" : "inherit" }}>{val}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.heroRight}>
                <p className={styles.heroRefLabel}>Reference</p>
                <p className={styles.heroRef}>{app?.application_number}</p>
                {app?.status === "ESCALATED" && (
                  <span className={styles.heroBadge} style={{ background: "rgba(190,24,93,0.25)", color: "#f9a8d4", borderColor: "rgba(190,24,93,0.4)" }}>Escalated</span>
                )}
              </div>
            </div>
          </div>

          {/* Completed app: full summary view (no step wizard until override) */}
          {alreadyDecided && !forceAct ? (
            <CompletedSummaryView
              app={app}
              applicant={applicant}
              licence={licence}
              officer={officer}
              supervisorName={user?.name}
              supervisorId={user?.staff_id}
              onOverride={() => { setForceAct(true); setStep(STEPS.length - 1); }}
            />
          ) : (
            <>
              {/* Returned banner */}
              {app?.status === "RETURNED_TO_OFFICER" && (
                <div className={styles.returnedBanner}>
                  <p className={styles.returnedTitle}>Returned to officer</p>
                  <p className={styles.returnedSub}>{app?.officer_comment || "Application returned for further review."}</p>
                </div>
              )}

              {/* Officer possession banner — view only */}
              {officerHasPossession && (
                <div style={{ margin: "12px 24px 0", padding: "12px 18px", background: "#fefce8", border: "1px solid #fde68a", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span style={{ fontSize: 13, color: "#92400e" }}>
                    This application is currently <strong>with the officer</strong> (status: {app?.status?.replace(/_/g," ")}) — view only.
                  </span>
                </div>
              )}

              {/* No-action banner */}
              {!canAct && !officerHasPossession && (
                <div style={{ margin: "12px 24px 0", padding: "12px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <InfoIcon size={16} stroke="#9ca3af" />
                  <span style={{ fontSize: 13, color: "#6b7280" }}>
                    This application is in <strong>{app?.status}</strong> — no supervisor action required.
                  </span>
                </div>
              )}

              {/* StepBar */}
              <StepBar steps={STEPS} current={step} onStepClick={idx => { if (idx < step) setStep(idx); }} />

              {/* Two-panel layout */}
              <div className={styles.reviewLayout}>
                <ReferenceSidebar app={app} applicant={applicant} licence={licence} step={step} stepId={currentStep} officer={officer} />

            <div className={styles.reviewMain}>
              <div className={styles.content} ref={contentRef}>

                {currentStep === "overview" && (
                  <StepOverview app={app} applicant={applicant} officer={officer} licence={licence} />
                )}

                {currentStep === "applicant" && (
                  <StepApplicant app={app} appId={app?.id} applicant={applicant} licence={licence} onAppUpdate={load} supervisorName={user?.name} readOnly={officerHasPossession} />
                )}

                {currentStep === "documents" && (
                  <StepDocuments app={app} appId={app?.id} onPreview={setPreviewDoc} onAppUpdate={load} supervisorName={user?.name} readOnly={officerHasPossession} />
                )}

                {currentStep === "checklist" && (
                  <StepChecklist checklist={checklist} setChecklist={setChecklist} readOnly={officerHasPossession} />
                )}

                {currentStep === "decision" && (
                  officerHasPossession ? (
                    <div className={pStyles.stepContent}>
                      <div className={pStyles.sectionHead}>
                        <ShieldIcon size={18} stroke="#d97706" />
                        <h2 className={pStyles.sectionTitle}>Decision</h2>
                      </div>
                      <div style={{ padding: "48px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: 0 }}>Officer is reviewing this application</p>
                        <p style={{ fontSize: 13, color: "#6b7280", margin: 0, maxWidth: 340 }}>
                          This application is currently in the officer's queue (status: <strong>{app?.status?.replace(/_/g," ")}</strong>). Supervisor decisions are locked while the officer has possession.
                        </p>
                      </div>
                    </div>
                  ) : (canAct || forceAct) ? (
                    <StepDecision
                      appId={app?.id}
                      supervisorName={user?.name}
                      supervisorId={user?.staff_id}
                      onDecisionMade={() => { setForceAct(false); load(); }}
                    />
                  ) : (
                    <div className={pStyles.stepContent}>
                      <div className={pStyles.sectionHead}>
                        <ShieldIcon size={18} stroke="#2563eb" />
                        <h2 className={pStyles.sectionTitle}>Decision</h2>
                      </div>
                      <div style={{ padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        {alreadyDecided ? (
                          <>
                            <CheckCircle size={40} stroke="#16a34a" />
                            <p style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>This application has already been decided.</p>
                            <button style={{ padding: "8px 20px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                              onClick={() => setForceAct(true)}>Override Decision</button>
                          </>
                        ) : (
                          <>
                            <InfoIcon size={40} stroke="#d1d5db" />
                            <p style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>No action required — status: <strong>{app?.status}</strong></p>
                          </>
                        )}
                      </div>
                    </div>
                  )
                )}

              </div>

              {/* Step nav footer */}
              <div className={styles.stepNav}>
                <div className={styles.stepNavLeft}>
                  {step > 0 && (
                    <button className={styles.prevBtn} onClick={() => setStep(s => s - 1)}>
                      <ArrowLeft size={13} /> Previous
                    </button>
                  )}
                </div>
                <div className={styles.stepNavCenter}>
                  {block && <p className={styles.blockReason}>{block}</p>}
                  <span className={styles.stepCount}>Step {step + 1} of {STEPS.length}</span>
                </div>
                <div className={styles.stepNavRight}>
                  {step < STEPS.length - 1 && (
                    <button className={styles.nextBtn} disabled={!canGoNext()} onClick={() => setStep(s => s + 1)}>
                      Next <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

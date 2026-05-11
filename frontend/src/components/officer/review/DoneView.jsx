// Read-only summary shown after the officer has already submitted a decision.
import { useState, useEffect } from "react";
import api from "../../../services/api";
import styles from "../../../pages/officer/OfficerReviewApplication.module.css";
import d from "./DoneView.module.css";

/* ── tiny SVG icon factory ── */
const Ico = ({ path, size = 16, stroke = "currentColor", sw = 2, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(path) ? path : [path]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const ChevLeft   = p => <Ico {...p} path="M15 18l-6-6 6-6" />;
const ChevRight  = p => <Ico {...p} path="M9 18l6-6-6-6" />;
const ChevDown   = p => <Ico {...p} path="M6 9l6 6 6-6" />;
const ChevUp2    = p => <Ico {...p} path="M18 15l-6-6-6 6" />;
const GridIcon   = p => <Ico {...p} size={15} path={["M3 3h7v7H3z","M14 3h7v7h-7z","M14 14h7v7h-7z","M3 14h7v7H3z"]} />;
const InboxIcon  = p => <Ico {...p} size={15} path={["M22 12h-6l-2 3H10l-2-3H2","M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"]} />;
const RotateIcon = p => <Ico {...p} size={15} path={["M1 4v6h6","M3.51 15a9 9 0 1 0 .49-4.5"]} />;
const UpIcon     = p => <Ico {...p} size={15} path="M12 19V5M5 12l7-7 7 7" />;
const EyeIcon    = p => <Ico {...p} path={["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"]} />;
const XIcon      = p => <Ico {...p} path="M18 6L6 18M6 6l12 12" />;
const LockIcon   = p => <Ico {...p} path={["M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z","M7 11V7a5 5 0 0 1 10 0v4"]} />;
const ShieldIcon = p => <Ico {...p} path="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;

const TX_LABEL = { RENEWAL: "Licence Renewal", REPLACEMENT: "Licence Replacement", AMENDMENT: "Licence Amendment" };

const OUTCOME = {
  approve:  { label: "APPROVED",              color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", strip: "#dcfce7" },
  resubmit: { label: "WAITING ON APPLICANT",  color: "#92400e", bg: "#fff7ed", border: "#fed7aa", strip: "#fef9c3" },
  escalate: { label: "ESCALATED",             color: "#6d28d9", bg: "#f5f3ff", border: "#ddd6fe", strip: "#ede9fe" },
  reject:   { label: "REJECTED",              color: "#991b1b", bg: "#fef2f2", border: "#fecaca", strip: "#fee2e2" },
};

const DOC_META = {
  APPROVED:          { label: "Approved",          color: "#15803d", bg: "#dcfce7", dot: "#22c55e" },
  RESUBMIT_REQUIRED: { label: "Resubmit Required", color: "#92400e", bg: "#fef9c3", dot: "#f59e0b" },
  REJECTED:          { label: "Rejected",          color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
};

const EV_COLOR = {
  STATUS_CHANGE: "#2563eb", DOCUMENT_REVIEW: "#0369a1", ESCALATION: "#7c3aed",
  OFFICER_ASSIGNED: "#16a34a", REVERIFICATION_REQUESTED: "#d97706",
  REVERIFICATION_CANCELLED: "#6b7280", MANUAL_REVIEW_CLEARED: "#16a34a",
};

function fmtDT(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z") ? iso : iso + "Z";
  return new Date(s).toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Jamaica" });
}
function fmtD(raw) {
  if (!raw) return "—";
  const s = String(raw);
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, day] = s.split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric" });
  }
  return fmtDT(s);
}

/* A small field on the card */
function CF({ label, value, mono, span2 }) {
  return (
    <div style={{ gridColumn: span2 ? "1/-1" : undefined }}>
      <p style={{ fontSize: 7, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 2px" }}>{label}</p>
      <p style={{ fontSize: 10, fontWeight: 600, color: "#111827", fontFamily: mono ? "monospace" : "inherit", margin: 0, lineHeight: 1.45, letterSpacing: mono ? "0.05em" : 0, wordBreak: "break-all" }}>{value || "—"}</p>
    </div>
  );
}

/* Document preview inline (loads blob) */
function DocViewer({ doc, appId, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const isPdf = doc.original_filename?.toLowerCase().endsWith(".pdf");
  useEffect(() => {
    let url;
    api.get(`/api/officer/applications/${appId}/documents/${doc.id}/file`, { responseType: "blob" })
      .then(r => { url = URL.createObjectURL(r.data); setBlobUrl(url); })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [appId, doc.id]);
  return (
    <div className={d.viewerOverlay} onClick={onClose}>
      <div className={d.viewerModal} onClick={e => e.stopPropagation()}>
        <div className={d.viewerHeader}>
          <div>
            <p className={d.viewerTitle}>{doc.doc_type?.replace(/_/g, " ")}</p>
            <p className={d.viewerSub}>{doc.original_filename}</p>
          </div>
          <button className={d.viewerClose} onClick={onClose}><XIcon size={16} /></button>
        </div>
        <div className={d.viewerBody}>
          {loading ? <div className={d.viewerSpinner} /> :
           !blobUrl ? <p className={d.viewerErr}>Could not load file</p> :
           isPdf ? <iframe src={blobUrl} className={d.viewerFrame} title="doc" /> :
           <img src={blobUrl} alt="doc" className={d.viewerImg} />}
        </div>
      </div>
    </div>
  );
}

const ACTOR_ROLE_COLOR = {
  officer:    { color: "#1d4ed8", bg: "#dbeafe" },
  supervisor: { color: "#7c3aed", bg: "#f5f3ff" },
  applicant:  { color: "#15803d", bg: "#dcfce7" },
  system:     { color: "#6b7280", bg: "#f1f5f9" },
  user:       { color: "#6b7280", bg: "#f1f5f9" },
};

const EV_LABEL = {
  STATUS_CHANGE:             "Status Changed",
  DOCUMENT_REVIEW:           "Document Reviewed",
  ESCALATION:                "Case Escalated",
  OFFICER_ASSIGNED:          "Officer Assigned",
  ASSIGNMENT:                "Officer Assigned",
  REVERIFICATION_REQUESTED:  "Re-verification Requested",
  REVERIFICATION_CANCELLED:  "Re-verification Cancelled",
  MANUAL_REVIEW_CLEARED:     "Manual Review Cleared",
  ITA_CLEARED:               "ITA Clearance Received",
  ITA_REQUEST:               "ITA Request Sent",
  SUPERVISOR_DECISION:       "Supervisor Decision",
};

export default function DoneView({
  decision, comment, app, applicant, licence, docReviews,
  officerProfile, collapsed, setCollapsed, user, navigate,
}) {
  const o = OUTCOME[decision] || OUTCOME.approve;

  const [photoBlobUrl,    setPhotoBlobUrl]    = useState(null);
  const [verifyBlobUrl,   setVerifyBlobUrl]   = useState(null);
  const [previewDoc,      setPreviewDoc]      = useState(null);
  const [showHistory,     setShowHistory]     = useState(false);
  const [showVerify,      setShowVerify]      = useState(false);
  const [unreadCount,     setUnreadCount]     = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/api/notifications/");
        setUnreadCount((res.data.notifications || []).filter(n => !n.is_read).length);
      } catch {}
    };
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, []);

  const docs      = (app?.documents || []).filter(d2 => d2.is_current && d2.doc_type !== "licence_photo" && d2.doc_type !== "verification_photo");
  const photoDoc  = (app?.documents || []).find(d2 => d2.doc_type === "licence_photo"      && d2.is_current);
  const verifyDoc = (app?.documents || []).find(d2 => d2.doc_type === "verification_photo" && d2.is_current);
  const events    = app?.events || [];
  const decidedAt = app?.officer_decision_at || events.filter(e => e.to_status === app?.status).slice(-1)[0]?.created_at;
  const fullName  = [applicant?.firstname, applicant?.lastname].filter(Boolean).join(" ").toUpperCase();
  const address   = [applicant?.address_line1, applicant?.address_line2, applicant?.parish].filter(Boolean).join(", ");
  const verifyCode = `${app?.application_number || ""}·${(licence?.trn || "").slice(-4)}·TAJ`;

  /* load photo blobs */
  useEffect(() => {
    if (!photoDoc || !app?.id) return;
    let url;
    api.get(`/api/officer/applications/${app.id}/documents/${photoDoc.id}/file`, { responseType: "blob" })
      .then(r => { url = URL.createObjectURL(r.data); setPhotoBlobUrl(url); })
      .catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [app?.id, photoDoc?.id]);

  useEffect(() => {
    if (!verifyDoc || !app?.id) return;
    let url;
    api.get(`/api/officer/applications/${app.id}/documents/${verifyDoc.id}/file`, { responseType: "blob" })
      .then(r => { url = URL.createObjectURL(r.data); setVerifyBlobUrl(url); })
      .catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [app?.id, verifyDoc?.id]);

  const NAV = [
    { id: "overview",  label: "Overview",            Icon: GridIcon   },
    { id: "active",    label: "Active Reviews",       Icon: InboxIcon  },
    { id: "waiting",   label: "Waiting on Applicant", Icon: RotateIcon },
    { id: "escalated", label: "Escalated",            Icon: UpIcon     },
    { id: "approved",  label: "Approved by Me",       Icon: p => <Ico {...p} size={15} sw={2.5} path="M5 12l5 5L20 7" /> },
  ];

  return (
    <div className={styles.root}>
      {previewDoc && <DocViewer doc={previewDoc} appId={app?.id} onClose={() => setPreviewDoc(null)} />}

      {/* Left nav */}
      <aside className={`${styles.navSidebar} ${collapsed ? styles.navCollapsed : styles.navExpanded}`}>
        <div className={`${styles.navSidebarHeader} ${collapsed ? styles.navCollapsed : styles.navExpanded}`}>
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, background: "#111827", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#111827", letterSpacing: "-0.2px" }}>DLRSJAM</p>
                <p style={{ fontSize: 9, color: "#9ca3af", letterSpacing: "0.06em", textTransform: "uppercase" }}>Officer Portal</p>
              </div>
            </div>
          )}
          <button className={styles.collapseBtn} onClick={() => setCollapsed(v => !v)}>
            {collapsed ? <ChevRight size={14} /> : <ChevLeft size={14} />}
          </button>
        </div>
        <nav className={styles.navItems}>
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} className={`${styles.navItem} ${collapsed ? styles.navCollapsed : styles.navExpanded}`}
              onClick={() => navigate(`/officer?page=${id}`)} title={collapsed ? label : undefined}>
              <span style={{ display: "flex", alignItems: "center", gap: collapsed ? 0 : 9 }}>
                <Icon stroke="#6b7280" />
                {!collapsed && <span className={styles.navLabel}>{label}</span>}
              </span>
            </button>
          ))}
        </nav>
        {!collapsed && (
          <div style={{ padding: "12px 14px", borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{user?.name || "Officer"}</p>
            <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{user?.staff_id || ""}</p>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className={styles.main}>

        {/* Topbar */}
        <div className={styles.topbar}>
          <div>
            <p className={styles.pageTitle}>Application Record</p>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
              {app?.application_number} · {TX_LABEL[app?.transaction_type] || app?.transaction_type}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={d.decisionChip} style={{ color: o.color, background: o.strip, border: `1px solid ${o.border}` }}>
              {o.label}
            </span>
            <button onClick={() => navigate("/officer")} title="Notifications"
              style={{ position: "relative", width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ico path={["M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 0 1-3.46 0"]} size={15} stroke="#6b7280" />
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "#dc2626", border: "1.5px solid white" }} />
              )}
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className={styles.scrollArea}>

          {/* ══ Decision banner at top ══ */}
          <div className={d.decisionBanner} style={{ background: o.strip, borderBottomColor: o.border }}>
            <div className={d.decisionBannerLeft}>
              <div className={d.decisionIconWrap} style={{ background: o.bg, border: `2px solid ${o.border}` }}>
                {decision === "approve"  && <Ico path="M20 6L9 17l-5-5"  size={20} stroke={o.color} sw={2.5} />}
                {decision === "reject"   && <Ico path={["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M15 9l-6 6","M9 9l6 6"]} size={20} stroke={o.color} sw={2} />}
                {decision === "resubmit" && <Ico path={["M1 4v6h6","M3.51 15a9 9 0 1 0 .49-4.5"]} size={20} stroke={o.color} sw={2} />}
                {decision === "escalate" && <Ico path="M12 19V5M5 12l7-7 7 7" size={20} stroke={o.color} sw={2} />}
              </div>
              <div>
                <p className={d.decisionBannerTitle} style={{ color: o.color }}>
                  {decision === "approve"  && "Application Approved"}
                  {decision === "reject"   && "Application Rejected"}
                  {decision === "resubmit" && "Resubmission Requested"}
                  {decision === "escalate" && "Case Escalated"}
                </p>
                <p className={d.decisionBannerSub}>
                  Decided {fmtDT(decidedAt)}
                  {comment && <> · <em>"{comment}"</em></>}
                </p>
              </div>
            </div>
            <div className={d.decisionBannerRight}>
              <LockIcon size={13} stroke={o.color} />
              <span style={{ color: o.color }}>Read-only record · All events logged</span>
            </div>
          </div>

          {/* ══ LICENCE RECORD ══ */}
          <div className={d.recordWrap}>

            {/* Heading bar */}
            <div style={{ padding: "10px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Licence Record</p>
              <p style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace", margin: 0 }}>{app?.application_number}</p>
            </div>

            {/* Two-column layout */}
            <div className={d.cardGrid}>

              {/* LEFT: licence summary */}
              <div className={d.cardFaces} style={{ background: "white", padding: 20, gap: 16, display: "flex", flexDirection: "column" }}>

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
                      <CF label="Date of Birth" value={fmtD(applicant?.date_of_birth)} />
                      <CF label="Sex"           value={applicant?.sex} />
                    </div>
                  </div>
                </div>

                {/* Core licence fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                  <CF label="TRN"              value={licence?.trn}            mono />
                  <CF label="Control Number"   value={licence?.control_number} mono />
                  <CF label="First Issue Date" value={fmtD(licence?.first_issue_date)} />
                  <CF label="Issue Date"       value={fmtD(licence?.issue_date)} />
                  <CF label="Expiry Date"      value={fmtD(licence?.expiry_date)} />
                  <CF label="Status"           value={licence?.status} />
                  <CF label="Collectorate"     value={licence?.collectorate} span2 />
                  <CF label="Nationality"      value={licence?.nationality} />
                  <CF label="Occupation"       value={applicant?.occupation} />
                  <CF label="Address"          value={address} span2 />
                </div>

                {/* Officer sign-off */}
                <div style={{ padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Signing Officer</p>
                  {(() => {
                    const od2      = app?.officer_decision || officerProfile;
                    const name2    = od2?.officer_name     || officerProfile?.name;
                    const staffId2 = od2?.officer_staff_id || officerProfile?.staff_id;
                    const sig2     = od2?.officer_signature || officerProfile?.signature;
                    const ts2      = od2?.timestamp         || decidedAt;
                    if (!name2 && !staffId2) return <p style={{ fontSize: 11, color: "#d1d5db", fontStyle: "italic", margin: 0 }}>No officer signature recorded</p>;
                    return (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", marginBottom: 10 }}>
                          <CF label="Name"       value={name2} />
                          <CF label="Staff ID"   value={staffId2} mono />
                          <CF label="Decision"   value={od2?.decision || (decision === "approve" ? "APPROVED" : decision?.toUpperCase())} />
                          <CF label="Decided At" value={fmtDT(ts2)} />
                        </div>
                        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 10px", display: "inline-block" }}>
                          {sig2
                            ? <img src={sig2} alt="Officer signature" style={{ maxHeight: 40, maxWidth: 160, display: "block" }} />
                            : <p style={{ fontSize: 10, color: "#9ca3af", fontStyle: "italic", margin: 0, padding: "4px 0" }}>Signature on file</p>}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Supervisor sign-off */}
                {app?.supervisor_decision && (() => {
                  const sd = app.supervisor_decision;
                  return (
                    <div style={{ padding: "12px 14px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10 }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Supervisor</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", marginBottom: sd.supervisor_signature ? 10 : 0 }}>
                        <CF label="Name"       value={sd.supervisor_name} />
                        <CF label="Decision"   value={sd.decision?.replace(/_/g, " ")} />
                        <CF label="Signed Off" value={fmtDT(sd.timestamp)} />
                      </div>
                      {sd.supervisor_signature && (
                        <div style={{ background: "white", border: "1px solid #ddd6fe", borderRadius: 7, padding: "6px 10px", display: "inline-block" }}>
                          <img src={sd.supervisor_signature} alt="Supervisor signature" style={{ maxHeight: 40, maxWidth: 160, display: "block" }} />
                        </div>
                      )}
                      {sd.notes && <p style={{ fontSize: 11, color: "#6b7280", margin: "8px 0 0", fontStyle: "italic" }}>"{sd.notes}"</p>}
                    </div>
                  );
                })()}
              </div>

              {/* RIGHT: application + documents */}
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Contact info */}
                <div style={{ padding: "14px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Contact Information</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                    <CF label="Phone"      value={applicant?.phone} />
                    <CF label="Parish"     value={applicant?.parish} />
                    <CF label="Email"      value={applicant?.email} span2 />
                    <CF label="Address"    value={address}           span2 />
                    <CF label="Occupation" value={applicant?.occupation} />
                  </div>
                </div>

                {/* Application + Payment */}
                <div style={{ padding: "14px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Application &amp; Payment</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                    <CF label="Transaction"         value={TX_LABEL[app?.transaction_type]} />
                    <CF label="Reference"           value={app?.application_number} mono />
                    <CF label="Submitted"           value={fmtD(app?.submitted_at)} />
                    <CF label="Decided"             value={fmtDT(decidedAt)} />
                    <CF label="Fee Paid"            value={app?.fee_amount ? `J$${parseFloat(app.fee_amount).toLocaleString()} JMD` : "—"} />
                    <CF label="Payment Ref"         value={app?.payment_reference} mono />
                    <CF label="Payment Confirmed"   value={fmtDT(app?.payment_confirmed_at)} />
                    <CF label="Pickup Collectorate" value={app?.pickup_collectorate} span2 />
                  </div>
                  {comment && (
                    <div style={{ marginTop: 10, padding: "9px 12px", background: "white", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                      <p style={{ fontSize: 8, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>Officer Comment</p>
                      <p style={{ fontSize: 11, color: "#374151", fontStyle: "italic", margin: 0, lineHeight: 1.5 }}>"{comment}"</p>
                    </div>
                  )}
                </div>

                {/* Document review */}
                <div style={{ padding: "14px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>Document Review</p>
                  {docs.length === 0
                    ? <p style={{ fontSize: 11, color: "#9ca3af" }}>No documents submitted.</p>
                    : <div className={d.docRows}>
                        {docs.map(doc => {
                          const rev  = docReviews?.[doc.id];
                          const meta = rev ? DOC_META[rev.status] : null;
                          return (
                            <div key={doc.id} className={d.docRow}>
                              <div className={d.docRowLeft}>
                                <span className={d.docDot} style={{ background: meta?.dot || "#d1d5db" }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p className={d.docName}>{doc.doc_type?.replace(/_/g, " ")}</p>
                                  {rev?.comment && <p className={d.docNote}>{rev.comment}</p>}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                {meta
                                  ? <span className={d.docBadge} style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                                  : <span className={d.docBadge} style={{ color: "#9ca3af", background: "#f3f4f6" }}>PENDING</span>
                                }
                                <button className={d.docViewBtn} onClick={() => setPreviewDoc(doc)} title="View document">
                                  <EyeIcon size={13} stroke="#6b7280" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                  }
                </div>

                {/* Identity verification */}
                {(app?.verification_attempts > 0 || verifyBlobUrl) && (
                  <div style={{ padding: "14px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Identity Verification</p>
                      <button className={d.toggleBtn} onClick={() => setShowVerify(v => !v)}>
                        <ShieldIcon size={13} stroke="#7c3aed" />
                        {showVerify ? "Hide" : "View"} Photo
                        {showVerify ? <ChevUp2 size={12} stroke="#7c3aed" /> : <ChevDown size={12} stroke="#7c3aed" />}
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                      <CF label="Result" value={
                        app.verification_passed && !app.needs_manual_review ? "PASSED"
                        : app.needs_manual_review ? "MANUAL REVIEW" : "FAILED / FLAGGED"
                      } />
                      {app.face_match_score != null && <CF label="Face Match" value={`${app.face_match_score}%`} />}
                      {app.liveness_score   != null && <CF label="Liveness"   value={`${app.liveness_score}%`} />}
                    </div>
                    {showVerify && verifyBlobUrl && (
                      <div className={d.verifyPhotoWrap}>
                        <img src={verifyBlobUrl} alt="Verification" className={d.verifyPhoto} />
                        <p className={d.verifyPhotoCaption}>Live verification capture</p>
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
                    <CF label="Updated Address" span2
                      value={[app.new_address_line1, app.new_address_line2, app.new_parish].filter(Boolean).join(", ")} />
                  )}
                  {app?.new_occupation && (
                    <CF label="Updated Occupation" value={app.new_occupation} />
                  )}
                </div>
              </div>
            )}

            {/* ══ VERIFICATION STRIP ══ */}
            <div className={d.verifyStrip}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div className={d.barcode}>
                  {[3,1,2,1,3,2,1,3,1,2,1,3,2,1,2,1,3,1,2,3].map((w, i) => (
                    <div key={i} style={{ width: w, background: i % 3 === 0 ? "#1e3a8a" : "#94a3b8", borderRadius: 1, alignSelf: "stretch" }} />
                  ))}
                </div>
                <div>
                  <p className={d.verifyLabel}>Document Verification Code</p>
                  <p className={d.verifyCode}>{verifyCode}</p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p className={d.verifyLabel}>Issued by</p>
                <p className={d.verifyIssuer}>TAJ Licensing Division</p>
                <p className={d.verifyLabel}>Road Traffic Act, Jamaica</p>
              </div>
            </div>

            {/* ══ PROCESSING HISTORY (collapsible) ══ */}
            <div className={d.historySection}>
              <button className={d.historyToggle} onClick={() => setShowHistory(v => !v)}>
                <span className={d.historyToggleLabel}>Processing History ({events.length} event{events.length !== 1 ? "s" : ""})</span>
                {showHistory ? <ChevUp2 size={14} stroke="white" /> : <ChevDown size={14} stroke="white" />}
              </button>
              {showHistory && (
                <div className={d.historyTableWrap}>
                  <div className={d.historyHead} style={{ gridTemplateColumns: "150px 180px 140px 150px 1fr" }}>
                    <span>Date / Time</span><span>Event</span><span>Status</span><span>Actor</span><span>Details</span>
                  </div>
                  {events.map((ev, i) => {
                    const evColor  = EV_COLOR[ev.event_type] || "#6b7280";
                    const roleStyle = ACTOR_ROLE_COLOR[ev.actor_role] || ACTOR_ROLE_COLOR.system;
                    const evLabel  = EV_LABEL[ev.event_type] || ev.event_type?.replace(/_/g, " ");
                    return (
                      <div key={i} className={d.historyRow}
                        style={{ background: i % 2 === 0 ? "#fafafa" : "white", gridTemplateColumns: "150px 180px 140px 150px 1fr" }}>
                        <span className={d.historyDate}>{fmtDT(ev.created_at)}</span>
                        <span>
                          <span className={d.historyTypePill} style={{ color: evColor, background: evColor + "18" }}>
                            {evLabel}
                          </span>
                        </span>
                        <span>
                          {ev.to_status
                            ? <span className={d.historyStatusPill}>{ev.to_status.replace(/_/g, " ")}</span>
                            : <span style={{ color: "#d1d5db", fontSize: 9 }}>—</span>
                          }
                        </span>
                        <span>
                          {ev.actor
                            ? <span className={d.historyTypePill} style={{ color: roleStyle.color, background: roleStyle.bg }}>
                                {ev.actor}
                              </span>
                            : <span style={{ color: "#d1d5db", fontSize: 9 }}>—</span>
                          }
                        </span>
                        <span className={d.historyComment}>{ev.comment || "—"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ══ FOOTER ══ */}
            <div className={d.recordFooter}>
              <div>
                <p className={d.footerOrg}>Tax Administration Jamaica — DLRSJAM</p>
                <p className={d.footerContact}>support@dlrsjam.gov.jm · 1-876-XXX-XXXX · Mon–Fri 8AM–4PM</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p className={d.footerLegal}>Official processing record · Digitally generated · Valid without physical signature</p>
              </div>
            </div>

          </div>{/* /recordWrap */}
        </div>{/* /scrollArea */}
      </div>{/* /main */}
    </div>
  );
}

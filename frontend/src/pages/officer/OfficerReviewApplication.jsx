// Full application review page for officers — multi-step layout with documents, checklist, verification, and decision.
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import styles from "./OfficerReviewApplication.module.css";

import StepBar         from "../../components/officer/review/StepBar";
import EscalatedView   from "../../components/officer/review/EscalatedView";
import WaitingView     from "../../components/officer/review/WaitingView";
import DoneView        from "../../components/officer/review/DoneView";
import DocPreviewModal from "../../components/officer/review/DocPreviewModal";

import StepSummary          from "../../components/officer/review/steps/StepSummary";
import StepITA              from "../../components/officer/review/steps/StepITA";
import StepRequestedChanges from "../../components/officer/review/steps/StepRequestedChanges";
import StepDocuments        from "../../components/officer/review/steps/StepDocuments";
import StepChecklist        from "../../components/officer/review/steps/StepChecklist";
import StepReviewSummary    from "../../components/officer/review/steps/StepReviewSummary";
import StepDecision         from "../../components/officer/review/steps/StepDecision";

const ALL_STEPS = [
  { id: "summary",   label: "Applicant"           },
  { id: "ita",       label: "ITA Clearance"        },
  { id: "changes",   label: "Changes"              },
  { id: "documents", label: "Verification & Docs"  },
  { id: "checklist", label: "Checklist"            },
  { id: "review",    label: "Review Summary"       },
  { id: "decision",  label: "Decision"             },
];

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
const GridIcon    = p => <Ico {...p} size={15} d={["M3 3h7v7H3z","M14 3h7v7h-7z","M14 14h7v7h-7z","M3 14h7v7H3z"]} />;
const InboxIcon   = p => <Ico {...p} size={15} d={["M22 12h-6l-2 3H10l-2-3H2","M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"]} />;
const RotateIcon  = p => <Ico {...p} size={15} d={["M1 4v6h6","M3.51 15a9 9 0 1 0 .49-4.5"]} />;
const ArrowUpIcon = p => <Ico {...p} size={15} d="M12 19V5M5 12l7-7 7 7" />;
const ChevLeft    = p => <Ico {...p} d="M15 18l-6-6 6-6" />;
const ChevRight   = p => <Ico {...p} d="M9 18l6-6-6-6" />;
const BellIcon    = p => <Ico {...p} d={["M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 0 1-3.46 0"]} />;

const TX_LABEL = { RENEWAL: "Renewal", REPLACEMENT: "Replacement", AMENDMENT: "Amendment" };
const TX_COLOR = { RENEWAL: "#2563eb", REPLACEMENT: "#d97706", AMENDMENT: "#16a34a" };
const TX_BG    = { RENEWAL: "#eff6ff", REPLACEMENT: "#fff7ed", AMENDMENT: "#f0fdf4" };

const STATUS_META = {
  SUBMITTED:           { label: "New",             color: "#1d4ed8", bg: "#dbeafe" },
  UNDER_REVIEW:        { label: "In Review",       color: "#0369a1", bg: "#e0f2fe" },
  RESUBMITTED:         { label: "Resubmitted",     color: "#854d0e", bg: "#fef9c3" },
  RETURNED_TO_OFFICER: { label: "Returned to You", color: "#7c3aed", bg: "#f5f3ff" },
};

function fmt(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z") ? iso : iso + "Z";
  return new Date(s).toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Jamaica" });
}

const DOC_META = {
  APPROVED:          { label: "Approved", color: "#15803d", bg: "#dcfce7" },
  RESUBMIT_REQUIRED: { label: "Resubmit", color: "#92400e", bg: "#fef9c3" },
  REJECTED:          { label: "Rejected", color: "#991b1b", bg: "#fee2e2" },
};

const STEP_HINT = [
  "Cross-check name, DOB, and address against the licence record.",
  "Verify TRN, licence class, and expiry match the system record.",
  "Compare the requested address change against the address on file.",
  "Check each document matches the applicant's name and date of birth.",
  "Confirm all mandatory items are complete before proceeding.",
  "Confirm all decisions are correct before the final step.",
  "Review your selected decision carefully — this cannot be undone.",
];

function ReferenceSidebar({ app, applicant, licence, step, docReviews, systemFlags }) {
  const docs       = (app?.documents || []).filter(d => d.is_current && d.doc_type !== "licence_photo" && d.doc_type !== "verification_photo");
  const hasChanges = app?.address_change_requested;
  const flagCount  = Object.keys(systemFlags || {}).length;
  const isExpired  = licence?.expiry_date ? new Date(licence.expiry_date) < new Date() : false;

  const [photoBlobUrl, setPhotoBlobUrl] = useState(null);
  const photoDoc = (app?.documents || []).find(d => d.doc_type === "licence_photo" && d.is_current);
  useEffect(() => {
    if (!photoDoc) return;
    let url;
    api.get(`/api/officer/applications/${app.id}/documents/${photoDoc.id}/file`, { responseType: "blob" })
      .then(res => { url = URL.createObjectURL(res.data); setPhotoBlobUrl(url); })
      .catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [app?.id, photoDoc?.id]);

  const Divider = ({ label }) => (
    <div style={{ padding: "10px 16px 5px", borderTop: "1px solid #f3f4f6" }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
    </div>
  );

  const Row = ({ label, value, highlight, mono, warn }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, padding: "3px 16px" }}>
      <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0, lineHeight: 1.6 }}>{label}</span>
      <span style={{
        fontSize: 11, fontWeight: 600, textAlign: "right", wordBreak: "break-word", lineHeight: 1.6,
        color: warn ? "#dc2626" : highlight ? "#1d4ed8" : "#374151",
        fontFamily: mono ? "monospace" : "inherit",
      }}>{value || "—"}</span>
    </div>
  );

  return (
    <div className={styles.refSidebar}>
      <div style={{ margin: "10px 10px 4px", padding: "9px 11px", background: "#eff6ff", borderRadius: 8, border: "1px solid #dbeafe" }}>
        <p style={{ fontSize: 11, color: "#1d4ed8", lineHeight: 1.5 }}>
          <strong>Step {step + 1}:</strong> {STEP_HINT[step]}
        </p>
      </div>

      {photoBlobUrl && docReviews[photoDoc?.id]?.status === "APPROVED" && (
        <div style={{ padding: "8px 10px 4px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Submitted Photo</p>
          <img src={photoBlobUrl} alt="Applicant"
            style={{ width: "100%", maxHeight: 160, objectFit: "cover", objectPosition: "top", borderRadius: 8, border: "2px solid #86efac", display: "block" }} />
          <p style={{ fontSize: 9, color: "#15803d", fontWeight: 700, marginTop: 4 }}>✓ Photo approved</p>
        </div>
      )}

      <Divider label="Identity" />
      <Row label="Full Name"     value={`${applicant?.firstname || ""} ${applicant?.lastname || ""}`.trim()} highlight />
      <Row label="Date of Birth" value={fmt(applicant?.date_of_birth)} highlight />
      <Row label="Sex"           value={applicant?.sex} />
      <Row label="TRN"           value={licence?.trn} highlight mono />

      <Divider label="Licence Record" />
      <Row label="Current Control No." value={licence?.control_number} highlight mono />
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
      {hasChanges && (
        <div style={{ margin: "5px 10px 2px", padding: "7px 10px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 7 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#c2410c", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Change requested</p>
          <p style={{ fontSize: 11, color: "#92400e", lineHeight: 1.5 }}>
            {app.new_address_line1}{app.new_address_line2 ? `, ${app.new_address_line2}` : ""}{app.new_parish ? `, ${app.new_parish}` : ""}
          </p>
        </div>
      )}

      <Divider label="Application" />
      <Row label="Type"      value={TX_LABEL[app?.transaction_type]} />
      <Row label="Submitted" value={fmt(app?.submitted_at)} />
      <Row label="Fee Paid"  value={app?.fee_amount ? `J$${parseFloat(app.fee_amount).toLocaleString()}` : "—"} />
      <Row label="Pickup"    value={app?.pickup_collectorate?.split("(")[0]?.trim()} />

      {docs.length > 0 && (
        <>
          <Divider label="Document Decisions" />
          <div style={{ padding: "4px 10px 8px" }}>
            {docs.map(doc => {
              const review = docReviews[doc.id];
              const meta   = review ? DOC_META[review.status] : null;
              return (
                <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "capitalize" }}>
                    {doc.doc_type?.replace(/_/g, " ")}
                  </span>
                  {meta ? (
                    <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: meta.bg, borderRadius: 999, padding: "1px 8px", flexShrink: 0 }}>
                      {meta.label}
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>Pending</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {flagCount > 0 && (
        <>
          <Divider label="Flags" />
          <div style={{ padding: "4px 10px 8px" }}>
            {Object.entries(systemFlags).map(([checkId, flag]) => (
              <div key={checkId} style={{ display: "flex", gap: 6, alignItems: "flex-start", padding: "6px 8px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 7, marginBottom: 5 }}>
                <AlertIcon size={12} stroke="#d97706" />
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#92400e" }}>{checkId.replace(/_/g, " ")}</p>
                  <p style={{ fontSize: 10, color: "#78350f", marginTop: 1 }}>{flag.issue}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OfficerReviewApplication() {
  const navigate   = useNavigate();
  const { id }     = useParams();
  const { user }   = useAuth();
  const contentRef = useRef(null);

  const PROGRESS_KEY = `officer_review_${id}`;

  const loadProgress = () => {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}"); } catch { return {}; }
  };

  const saved = loadProgress();

  const [data,                setData]                = useState(null);
  const [loading,             setLoading]             = useState(true);
  const [error,               setError]               = useState(null);
  const [step,                setStep]                = useState(saved.step ?? 0);
  const [collapsed,           setCollapsed]           = useState(false);
  const [docReviews,          setDocReviews]          = useState(saved.docReviews ?? {});
  const [docFlags,            setDocFlags]            = useState(saved.docFlags ?? {});
  const [verificationFlag,      setVerificationFlag]      = useState(saved.verificationFlag ?? null);
  const [verificationOverridden, setVerificationOverridden] = useState(saved.verificationOverridden ?? false);
  const [checklist,           setChecklist]           = useState(saved.checklist ?? {});
  const [decision,            setDecision]            = useState(null);
  const [comment,             setComment]             = useState("");
  const [submitting,          setSubmitting]          = useState(false);
  const [done,                setDone]                = useState(false);
  const [officerSignature,    setOfficerSignature]    = useState(null);
  const [decisionConfirmed,   setDecisionConfirmed]   = useState(false);
  const [previewDoc,          setPreviewDoc]          = useState(null);
  const [systemFlags]         = useState({});
  const [addressChangeStatus, setAddressChangeStatus] = useState(saved.addressChangeStatus ?? "pending");
  const [isResubmission,      setIsResubmission]      = useState(saved.resubmissionProcessed ?? false);
  const [itaCleared,          setItaCleared]          = useState(saved.itaCleared ?? null);
  const [itaReference,        setItaReference]        = useState(saved.itaReference ?? null);
  const [unreadCount,         setUnreadCount]         = useState(0);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.get("/api/notifications/");
        const notifs = res.data.notifications || [];
        setUnreadCount(notifs.filter(n => !n.is_read).length);
      } catch {}
    };
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30000);
    return () => clearInterval(t);
  }, []);

  const fetchApp = useCallback(async () => {
    try {
      const res = await api.get(`/api/officer/applications/${id}`);
      setData(res.data);

      const freshDocs      = res.data.application?.documents || [];
      const events         = res.data.application?.events    || [];
      const wasResubmitted = events.some(e => e.to_status === "RESUBMITTED");
      const priorProgress  = loadProgress();

      // Seed docReviews from DB
      // The DB is the authoritative record of officer decisions. Build a base map
      // from whatever review_status the backend has stored on each document.
      const dbReviews = {};
      for (const d of freshDocs) {
        if (d.review_status && d.review_status !== "PENDING") {
          dbReviews[d.id] = {
            status:    d.review_status,
            comment:   d.review_comment || "",
            decidedAt: d.reviewed_at || null,
            docType:   d.doc_type,
          };
        }
      }

      // Merge: localStorage overrides DB for any doc the officer has touched this
      // session — but DB fills in anything that's missing (e.g. after cache clear).
      const savedReviews = priorProgress.docReviews ?? {};
      const mergedReviews = { ...dbReviews, ...savedReviews };

      if (wasResubmitted && !priorProgress.resubmissionProcessed) {
        setIsResubmission(true);

        // When a doc is resubmitted it gets a NEW id (old row becomes is_current=false).
        // Prior docReviews are keyed by old ids. Re-key them onto new current doc ids
        // using doc_type as the bridge — carrying over approvals for unchanged docs,
        // but NOT for re-uploaded docs (version > 1) which need a fresh review.
        const typeToNewId   = Object.fromEntries(freshDocs.map(d => [d.doc_type, d.id]));
        const typeToVersion = Object.fromEntries(freshDocs.map(d => [d.doc_type, d.version]));

        // Build a doc_type -> prior review map (from DB + saved, keyed by docType)
        const typeToReview = {};
        for (const [, review] of Object.entries(mergedReviews)) {
          if (review.docType) typeToReview[review.docType] = review;
        }
        // Also grab docType from DB reviews we just built
        for (const [docId, review] of Object.entries(dbReviews)) {
          const doc = freshDocs.find(d => String(d.id) === String(docId));
          if (doc) typeToReview[doc.doc_type] = review;
        }

        // Re-key: carry forward only reviews for docs that were NOT re-uploaded
        const remapped = {};
        for (const [docType, review] of Object.entries(typeToReview)) {
          const newId = typeToNewId[docType];
          if (newId && (typeToVersion[docType] ?? 1) === 1) {
            remapped[newId] = review;
          }
          // version > 1 = resubmitted doc → no prior review carried forward
        }
        setDocReviews(remapped);
        setChecklist({});
        setStep(2); // jump straight to Documents step
      } else {
        // Normal load — use merged reviews (DB + any unsaved localStorage work)
        if (Object.keys(mergedReviews).length > 0) {
          setDocReviews(mergedReviews);
        }
      }
    } catch (e) {
      setError(e.response?.data?.error || "Application not found");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchApp(); }, [fetchApp]);
  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [step]);

  // Persist review progress so the officer can resume after leaving
  useEffect(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ step, docReviews, docFlags, verificationFlag, verificationOverridden, checklist, addressChangeStatus, resubmissionProcessed: isResubmission, itaCleared, itaReference }));
  }, [step, docReviews, docFlags, verificationFlag, verificationOverridden, checklist, addressChangeStatus, isResubmission, PROGRESS_KEY]);

  const handleToggleFlag = (docId, flagData) => {
    setDocFlags(prev => {
      const next = { ...prev };
      if (flagData === null) { delete next[docId]; } else { next[docId] = flagData; }
      return next;
    });
  };

  const handleDocReview = async (docId, status, docComment = "", decidedAt = null, docType = null) => {
    try {
      await api.post(`/api/officer/applications/${id}/documents/${docId}/review`, { status, comment: docComment });
    } catch { }
    setDocReviews(prev => ({ ...prev, [docId]: { status, comment: docComment, decidedAt: decidedAt || new Date().toISOString(), docType } }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const endpoints = {
        approve:  `/api/officer/applications/${id}/approve`,
        resubmit: `/api/officer/applications/${id}/request-resubmission`,
        escalate: `/api/officer/applications/${id}/escalate`,
        reject:   `/api/officer/applications/${id}/reject`,
      };
      await api.post(endpoints[decision], { comment });
      localStorage.removeItem(PROGRESS_KEY);
      setDone(true);
    } catch (e) {
      alert(e.response?.data?.error || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className={styles.centerState}>
      <div className={styles.spinner} />
      <p className={styles.centerText}>Loading application…</p>
    </div>
  );

  if (error) return (
    <div className={styles.centerState}>
      <p className={styles.errorText}>{error}</p>
      <button onClick={() => navigate("/officer")} style={{ fontSize: 13, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}>← Back to Dashboard</button>
    </div>
  );

  const { application: app, applicant, licence, officer: officerProfile } = data;
  const docs = (app.documents || []).filter(d => d.is_current);

  const hasChanges     = !!(app.address_change_requested || app.new_occupation);
  const isReplacement  = app.transaction_type === "REPLACEMENT";

  // Seed ITA state from DB on first load (handles page refresh after ITA sent)
  const appItaCleared = app.ita_outcome ? app.ita_outcome === "CLEARED" : null;
  const resolvedItaCleared   = itaCleared   ?? appItaCleared;
  const resolvedItaReference = itaReference ?? app.ita_reference ?? null;

  // Build the step list dynamically
  const STEPS = ALL_STEPS.filter(s => {
    if (s.id === "ita")     return isReplacement;
    if (s.id === "changes") return hasChanges;
    return true;
  });

  // licence_photo is reviewed in StepSummary; verification_photo is shown in LivenessPanel — both excluded from doc-step gate
  const nonPhotoDocs     = docs.filter(d => d.doc_type !== "licence_photo" && d.doc_type !== "verification_photo");
  const allDocsApproved  = nonPhotoDocs.length > 0 && nonPhotoDocs.every(d => docReviews[d.id]?.status === "APPROVED");
  const allDocsReviewed  = nonPhotoDocs.every(d => docReviews[d.id]);
  const resubmitDocs     = nonPhotoDocs.filter(d => docReviews[d.id]?.status === "RESUBMIT_REQUIRED");
  const hasResubmit      = resubmitDocs.length > 0;
  const photoDoc         = docs.find(d => d.doc_type === "licence_photo");
  const photoRejected    = photoDoc && docReviews[photoDoc.id]?.status === "REJECTED";
  const allChecked       = Object.keys(checklist).length > 0 && Object.values(checklist).every(Boolean);
  const changeDone       = !hasChanges || addressChangeStatus === "approved";
  const commentOk        = decision && (decision === "approve" ? true : comment.trim().length > 0);
  const canSubmit        = commentOk && decisionConfirmed;
  const approveEnabled   = allDocsApproved && changeDone;

  const currentStepId = STEPS[step]?.id;

  const itaDone = !isReplacement || resolvedItaCleared !== null;

  const canGoNext = () => {
    if (currentStepId === "ita")       return itaDone;
    if (currentStepId === "changes")   return changeDone;
    if (currentStepId === "documents") return allDocsReviewed;
    if (currentStepId === "checklist") return allChecked;
    if (currentStepId === "decision")  return canSubmit;
    return true;
  };

  const nextBlockReason = () => {
    if (currentStepId === "ita"       && !itaDone)          return "Send the ITA request and wait for the response before continuing.";
    if (currentStepId === "changes"   && !changeDone)       return "Approve or handle the requested changes before continuing.";
    if (currentStepId === "documents" && !allDocsReviewed)  return `${nonPhotoDocs.filter(d => !docReviews[d.id]).length} document(s) still need a decision.`;
    if (currentStepId === "checklist" && !allChecked)       return "Complete all checklist items before continuing.";
    if (currentStepId === "decision"  && !commentOk)        return "Select a decision and add a comment if required.";
    if (currentStepId === "decision"  && !decisionConfirmed) return "Sign and confirm your decision before submitting.";
    return null;
  };

  if (app.status === "ESCALATED")            return <EscalatedView app={app} onBack={() => navigate("/officer")} />;
  if (app.status === "WAITING_ON_APPLICANT") return <WaitingView   app={app} onBack={() => navigate("/officer")} />;

  const TERMINAL = ["APPROVED", "REJECTED"];
  const terminalDecision = app.status === "APPROVED" ? "approve" : app.status === "REJECTED" ? "reject" : null;

  if (done || TERMINAL.includes(app.status)) {
    return (
      <DoneView
        decision={done ? decision : terminalDecision}
        comment={done ? comment : (app.officer_comment || "")}
        app={app}
        applicant={applicant}
        licence={licence}
        docReviews={docReviews}
        officerProfile={officerProfile}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        user={user}
        navigate={navigate}
      />
    );
  }

  const blockReason = nextBlockReason();
  const sm          = STATUS_META[app.status] || { label: app.status, color: "#374151", bg: "#f1f5f9" };
  const initials    = `${applicant?.firstname?.[0] || ""}${applicant?.lastname?.[0] || ""}`.toUpperCase();

  const NAV = [
    { id: "overview",  label: "Overview",            Icon: GridIcon    },
    { id: "active",    label: "Active Reviews",       Icon: InboxIcon   },
    { id: "waiting",   label: "Waiting on Applicant", Icon: RotateIcon  },
    { id: "escalated", label: "Escalated",            Icon: ArrowUpIcon },
    { id: "approved",  label: "Approved by Me",       Icon: p => <Ico {...p} size={15} sw={2.5} d="M5 12l5 5L20 7" /> },
  ];

  return (
    <div className={styles.root}>
      {previewDoc && <DocPreviewModal doc={previewDoc} appId={id} onClose={() => setPreviewDoc(null)} />}

      {/* Left nav sidebar */}
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
            <button key={id}
              className={`${styles.navItem} ${collapsed ? styles.navCollapsed : styles.navExpanded}`}
              onClick={() => navigate(`/officer?page=${id}`)}
              title={collapsed ? label : undefined}>
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

      {/* Right main */}
      <div className={styles.main}>

        {/* Topbar */}
        <div className={styles.topbar}>
          <div>
            <p className={styles.pageTitle}>Application Review</p>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
              Step {step + 1} of {STEPS.length} · {STEPS[step]?.label}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: sm.bg, color: sm.color }}>
              {sm.label}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
              background: TX_BG[app.transaction_type] || "#f1f5f9",
              color: TX_COLOR[app.transaction_type] || "#374151",
            }}>
              {TX_LABEL[app.transaction_type] || app.transaction_type}
            </span>
            <button onClick={() => navigate("/officer")} title="Notifications"
              style={{ position: "relative", width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BellIcon size={15} stroke="#6b7280" />
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "#dc2626", border: "1.5px solid white" }} />
              )}
            </button>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className={styles.scrollArea}>

          {/* Application hero card — same style as queue page headers */}
          <div className={styles.heroCard}>
            <div className={styles.heroOrb1} />
            <div className={styles.heroOrb2} />
            <div className={styles.heroGrid} />
            <div className={styles.heroInner}>
              <div className={styles.heroLeft}>
                <div className={styles.heroAvatar}>{initials}</div>
                <div>
                  <p className={styles.heroLabel}>Officer Portal · Application Review</p>
                  <h2 className={styles.heroName}>{applicant?.firstname} {applicant?.lastname}</h2>
                  <div className={styles.heroMeta}>
                    {[
                      ["TRN", licence?.trn, true],
                      ["Current Control No.", licence?.control_number, true],
                      ["Class", licence?.licence_class, false],
                      ["Submitted", fmt(app.submitted_at), false],
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
                <p className={styles.heroRef}>{app.application_number}</p>
                {app.trustee_collection && (
                  <span className={styles.heroBadge}>Trustee Collection</span>
                )}
              </div>
            </div>
          </div>

          {/* Returned banner */}
          {app.status === "RETURNED_TO_OFFICER" && (
            <div className={styles.returnedBanner}>
              <p className={styles.returnedTitle}>Returned by supervisor</p>
              <p className={styles.returnedSub}>{app.officer_comment || "Please re-review based on supervisor instructions."}</p>
            </div>
          )}

          {/* Resubmission attention banner — hide once the application has a final decision */}
          {isResubmission && !["APPROVED","REJECTED","ESCALATED"].includes(app.status) && (() => {
            const resubDocs = docs.filter(d => d.version > 1 && d.doc_type !== "licence_photo" && d.doc_type !== "verification_photo");
            const DOC_LABELS = { passport_photo: "Passport Photo", national_id_front: "National ID (Front)", national_id_back: "National ID (Back)", existing_licence_front: "Current Licence (Front)", existing_licence_back: "Current Licence (Back)", police_report: "Police Report", proof_of_address: "Proof of Address", trustee_letter: "Authorisation Letter" };
            return (
              <div style={{ margin: "0 0 0 0", padding: "14px 20px", background: "linear-gradient(90deg,#fef9c3,#fefce8)", borderBottom: "2px solid #fbbf24", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fef08a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <AlertIcon size={16} stroke="#d97706" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#92400e", margin: "0 0 3px" }}>Applicant has resubmitted — needs your attention</p>
                  <p style={{ fontSize: 12, color: "#78350f", margin: 0, lineHeight: 1.55 }}>
                    Your previous approved decisions have been restored. Review the newly uploaded document{resubDocs.length !== 1 ? "s" : ""} below, then complete the checklist and issue a final decision.
                  </p>
                  {resubDocs.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {resubDocs.map(d => (
                        <span key={d.id} style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: "#fef08a", color: "#92400e", border: "1px solid #fde047" }}>
                          ↻ {DOC_LABELS[d.doc_type] || d.doc_type.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Step bar */}
          <StepBar steps={STEPS} current={step} onStepClick={idx => { if (idx < step) setStep(idx); }} />

          {/* Two-panel */}
          <div className={styles.reviewLayout}>
            <ReferenceSidebar
              app={app} applicant={applicant} licence={licence}
              step={step} docReviews={docReviews} systemFlags={systemFlags}
            />

            <div className={styles.reviewMain}>
              <div className={styles.content} ref={contentRef}>
                {currentStepId === "summary"   && <StepSummary app={app} applicant={applicant} licence={licence} onDocReview={handleDocReview} photoFlag={(() => { const pd = docs.find(d => d.doc_type === "licence_photo"); return pd ? docFlags[pd.id] : null; })()} onTogglePhotoFlag={flagData => { const pd = docs.find(d => d.doc_type === "licence_photo"); if (pd) handleToggleFlag(pd.id, flagData ? { ...flagData, docType: "licence_photo" } : null); }} />}
                {currentStepId === "ita"       && <StepITA app={app} applicant={applicant} licence={licence} officer={user} onITAComplete={(cleared, ref) => { setItaCleared(cleared); setItaReference(ref); }} />}
                {currentStepId === "changes"   && <StepRequestedChanges app={app} applicant={applicant} docReviews={docReviews} onDocReview={handleDocReview} onPreview={setPreviewDoc} addressChangeStatus={addressChangeStatus} setAddressChangeStatus={setAddressChangeStatus} docFlags={docFlags} onToggleFlag={handleToggleFlag} />}
                {currentStepId === "documents" && <StepDocuments app={app} licence={licence} docReviews={docReviews} onDocReview={handleDocReview} onPreview={setPreviewDoc} onRemoveDocReview={docId => setDocReviews(prev => { const n = { ...prev }; delete n[docId]; return n; })} onReverifyRequested={fetchApp} onApplicationRejected={() => { setVerificationOverridden(true); fetchApp(); }} onCancelOverride={() => setVerificationOverridden(false)} docFlags={docFlags} onToggleFlag={handleToggleFlag} verificationFlag={verificationFlag} onToggleVerificationFlag={f => setVerificationFlag(f)} verificationOverridden={verificationOverridden} isResubmission={isResubmission} />}
                {currentStepId === "checklist" && <StepChecklist app={app} licence={licence} checklist={checklist} setChecklist={setChecklist} priorStepCount={STEPS.findIndex(s => s.id === "checklist")} />}
                {currentStepId === "review"    && <StepReviewSummary app={app} applicant={applicant} licence={licence} docReviews={docReviews} systemFlags={systemFlags} addressChangeStatus={addressChangeStatus} verificationFlag={verificationFlag} verificationOverridden={verificationOverridden} events={app.events || []} />}
                {currentStepId === "decision"  && <StepDecision decision={decision} setDecision={setDecision} comment={comment} setComment={setComment} approveEnabled={approveEnabled} docsApproved={allDocsApproved} docsCount={nonPhotoDocs.length} approvedCount={nonPhotoDocs.filter(d => docReviews[d.id]?.status === "APPROVED").length} photoRejected={photoRejected} officerSignature={officerSignature} setOfficerSignature={setOfficerSignature} decisionConfirmed={decisionConfirmed} setDecisionConfirmed={setDecisionConfirmed} flaggedDocs={[...Object.values(docFlags).map(f => f.docType), ...(verificationFlag ? ["Verification Photo"] : [])].filter(Boolean)} hasResubmit={hasResubmit} resubmitDocs={resubmitDocs} itaCleared={resolvedItaCleared} itaReference={resolvedItaReference} />}
              </div>

              <div className={styles.stepNav}>
                <div className={styles.stepNavLeft}>
                  {step > 0 && (
                    <button className={styles.prevBtn} onClick={() => setStep(s => s - 1)}>
                      <ArrowLeft size={13} /> Previous
                    </button>
                  )}
                </div>
                <div className={styles.stepNavCenter}>
                  {blockReason && <p className={styles.blockReason}>{blockReason}</p>}
                  <span className={styles.stepCount}>Step {step + 1} of {STEPS.length}</span>
                </div>
                <div className={styles.stepNavRight}>
                  {step < STEPS.length - 1 ? (
                    <button className={styles.nextBtn} disabled={!canGoNext()} onClick={() => setStep(s => s + 1)}>
                      Next <ArrowRight size={13} />
                    </button>
                  ) : (
                    <button className={styles.submitBtn} disabled={!canSubmit || submitting} onClick={handleSubmit}>
                      {submitting ? "Submitting…" : <><CheckIcon size={13} stroke="white" sw={2.5} /> Confirm & Submit</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
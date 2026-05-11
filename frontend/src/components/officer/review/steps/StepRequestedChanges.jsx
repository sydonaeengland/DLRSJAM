// Shows the changes the applicant requested (address, occupation) and lets the officer approve or reject each one.
import { useState, useRef, useCallback, useEffect } from "react";
import api from "../../../../services/api";
import pStyles from "../reviewStyles.module.css";

function fmtTime(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z") ? iso : iso + "Z";
  return new Date(s).toLocaleString("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Jamaica" });
}

function toTitleCase(str) {
  return (str || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const Ico = ({ d, size = 16, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const EditIcon    = p => <Ico {...p} d={["M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7","M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"]} />;
const CheckCircle = p => <Ico {...p} d={["M22 11.08V12a10 10 0 1 1-5.93-9.14","M22 4L12 14.01l-3-3"]} />;
const CheckIcon   = p => <Ico {...p} sw={2.5} d="M5 12l5 5L20 7" />;
const EyeIcon     = p => <Ico {...p} d={["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6"]} />;
const RotateIcon  = p => <Ico {...p} d={["M1 4v6h6","M3.51 15a9 9 0 1 0 .49-4.5"]} />;
const MailIcon    = p => <Ico {...p} d={["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z","M22,6 12,13 2,6"]} />;
const CopyIcon    = p => <Ico {...p} d={["M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z","M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"]} />;
const ArrowRight  = p => <Ico {...p} d={["M5 12h14","M12 5l7 7-7 7"]} />;
const PenIcon     = p => <Ico {...p} d={["M12 20h9","M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"]} />;
const TrashIcon   = p => <Ico {...p} d={["M3 6h18","M19 6l-1 14H6L5 6","M9 6V4h6v2"]} />;
const FlagIcon    = p => <Ico {...p} d={["M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z","M4 22v-7"]} />;

// Signature pad

function SignaturePad({ existingSig, onSave, onUseExisting }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const getPos = (e, c) => { const r = c.getBoundingClientRect(); const s = e.touches ? e.touches[0] : e; return { x: s.clientX - r.left, y: s.clientY - r.top }; };
  const startDraw = useCallback(e => { e.preventDefault(); drawing.current = true; const c = canvasRef.current; const ctx = c.getContext("2d"); const p = getPos(e, c); ctx.beginPath(); ctx.moveTo(p.x, p.y); }, []);
  const draw = useCallback(e => { e.preventDefault(); if (!drawing.current) return; const c = canvasRef.current; const ctx = c.getContext("2d"); const p = getPos(e, c); ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#1e3a8a"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); setIsEmpty(false); }, []);
  const stopDraw = useCallback(() => { drawing.current = false; }, []);
  const clear = () => { canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); setIsEmpty(true); };
  const save = async () => {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    setSaving(true);
    try { await api.post("/api/officer/profile/signature", { signature_image: dataUrl }); } catch { /* best-effort */ }
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
        <canvas ref={canvasRef} width={400} height={90}
          style={{ width: "100%", height: 90, border: "1.5px solid #cbd5e1", borderRadius: 8, background: "#fafbff", cursor: "crosshair", display: "block", touchAction: "none" }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
        {isEmpty && <p style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 11, color: "#cbd5e1", pointerEvents: "none" }}>Draw signature here</p>}
        {!isEmpty && <button onClick={clear} style={{ position: "absolute", top: 5, right: 5, background: "white", border: "1px solid #e2e8f0", borderRadius: 5, padding: "2px 6px", cursor: "pointer", fontSize: 10, color: "#6b7280", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}><TrashIcon size={9} /> Clear</button>}
      </div>
      <button onClick={save} disabled={isEmpty || saving}
        style={{ padding: "8px 0", borderRadius: 7, border: "none", background: isEmpty ? "#e2e8f0" : "#1e3a8a", color: "white", fontSize: 12, fontWeight: 700, cursor: isEmpty ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
        {saving ? "Saving…" : "Save & Use Signature"}
      </button>
    </div>
  );
}

// Doc review modal (signed)

const RESUBMIT_REASONS = [
  "Photo is blurry or low quality",
  "Document is expired",
  "Name does not match application",
  "Date of birth does not match",
  "Document is cut off or partially visible",
  "Wrong document type submitted",
  "Signature missing or illegible",
  "Document not certified / notarised",
  "Other",
];

function DocReviewModal({ doc, current, onSubmit, onClose }) {
  const [status,      setStatus]      = useState(current?.status || "");
  const [reason,      setReason]      = useState("");
  const [comment,     setComment]     = useState(current?.comment || "");
  const [sig,         setSig]         = useState(null);
  const [showSigPad,  setShowSigPad]  = useState(false);
  const [confirmedAt, setConfirmedAt] = useState(null);
  const [loadingSig,  setLoadingSig]  = useState(true);

  useEffect(() => {
    api.get("/api/officer/profile/signature")
      .then(res => { if (res.data.signature_image) setSig(res.data.signature_image); })
      .catch(() => {})
      .finally(() => setLoadingSig(false));
  }, []);

  const needsReason  = status === "RESUBMIT_REQUIRED";
  const isOther      = reason === "Other";
  const finalComment = needsReason
    ? (isOther ? comment.trim() : reason + (comment.trim() ? ` — ${comment.trim()}` : ""))
    : comment.trim();
  const decisionColor = { APPROVED: "#16a34a", RESUBMIT_REQUIRED: "#d97706" }[status] || "#374151";
  const decisionLabel = { APPROVED: "Approval", RESUBMIT_REQUIRED: "Resubmission Request" }[status] || "Decision";
  const reasonOk   = !needsReason || (reason && (reason !== "Other" || comment.trim()));
  const canConfirm = !!status && reasonOk && !!sig;
  const canSave    = canConfirm && !!confirmedAt;
  const reset      = () => setConfirmedAt(null);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: "20px 24px 14px", borderBottom: "1px solid #f3f4f6" }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 2 }}>Review Document</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>{toTitleCase(doc.doc_type)}</p>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Decision options */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Decision</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                { value: "APPROVED",          label: "Approve",          desc: "Document meets all requirements.", color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
                { value: "RESUBMIT_REQUIRED", label: "Request Resubmit", desc: "Document needs to be re-uploaded.",  color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
              ].map(opt => (
                <button key={opt.value}
                  onClick={() => { setStatus(opt.value); setReason(""); setComment(""); reset(); }}
                  style={{ padding: "11px 14px", borderRadius: 10, border: `2px solid ${status === opt.value ? opt.border : "#e2e8f0"}`, background: status === opt.value ? opt.bg : "white", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.15s" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: status === opt.value ? opt.color : "#374151", margin: "0 0 2px" }}>{opt.label}</p>
                  <p style={{ fontSize: 11, color: status === opt.value ? opt.color : "#9ca3af", margin: 0 }}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Reason picker */}
          {needsReason && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 7 }}>Reason <span style={{ color: "#ef4444" }}>*</span></p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {RESUBMIT_REASONS.map(r => (
                  <button key={r} onClick={() => { setReason(r); setComment(""); reset(); }}
                    style={{ padding: "9px 13px", borderRadius: 8, border: `1.5px solid ${reason === r ? "#fcd34d" : "#e2e8f0"}`, background: reason === r ? "#fffbeb" : "white", cursor: "pointer", fontSize: 12, fontWeight: reason === r ? 700 : 500, color: reason === r ? "#92400e" : "#374151", fontFamily: "inherit", textAlign: "left" }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comment */}
          {(status === "APPROVED" || isOther || (needsReason && reason)) && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
                {isOther ? <>Details <span style={{ color: "#ef4444" }}>*</span></> : "Comment (optional)"}
              </label>
              <textarea value={comment} onChange={e => { setComment(e.target.value); reset(); }}
                placeholder={isOther ? "Describe the issue…" : status === "APPROVED" ? "Approval note (optional)…" : "Extra context (optional)…"}
                rows={3}
                style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            </div>
          )}

          {/* Signature */}
          {!!status && reasonOk && (
            <div style={{ padding: 14, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                <PenIcon size={13} stroke="#374151" />
                <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0 }}>Officer Signature <span style={{ color: "#ef4444" }}>*</span></p>
              </div>
              {loadingSig ? (
                <p style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</p>
              ) : sig && !showSigPad ? (
                <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                  <img src={sig} alt="Signature" style={{ height: 44, objectFit: "contain", objectPosition: "left", maxWidth: "100%", display: "block" }} />
                  <button onClick={() => { setShowSigPad(true); reset(); }}
                    style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                    <PenIcon size={9} /> Draw a different signature
                  </button>
                </div>
              ) : (
                <SignaturePad existingSig={sig} onSave={s => { setSig(s); setShowSigPad(false); reset(); }} onUseExisting={() => setShowSigPad(false)} />
              )}
            </div>
          )}

          {/* Confirm */}
          {canConfirm && !confirmedAt && (
            <div style={{ padding: "12px 16px", background: `${decisionColor}0d`, border: `1.5px solid ${decisionColor}30`, borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, marginBottom: 10 }}>
                I confirm this <strong style={{ color: decisionColor }}>{decisionLabel}</strong> decision for <strong>{toTitleCase(doc.doc_type)}</strong> is accurate.
              </p>
              <button onClick={() => setConfirmedAt(new Date().toISOString())}
                style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "none", background: decisionColor, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Confirm {decisionLabel}
              </button>
            </div>
          )}

          {confirmedAt && (
            <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle size={15} stroke="#16a34a" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#15803d", margin: 0 }}>Decision confirmed</p>
                <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{fmtTime(confirmedAt)}</p>
              </div>
              <button onClick={() => setConfirmedAt(null)} style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Undo</button>
            </div>
          )}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button disabled={!canSave} onClick={() => { onSubmit(doc.id, status, finalComment, confirmedAt, doc.doc_type); onClose(); }}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: canSave ? decisionColor : "#94a3b8", color: "white", fontSize: 13, fontWeight: 700, cursor: canSave ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            Save Decision
          </button>
        </div>
      </div>
    </div>
  );
}

// Main

export default function StepRequestedChanges({ app, applicant, docReviews, onDocReview, onPreview, addressChangeStatus, setAddressChangeStatus, docFlags, onToggleFlag }) {
  const [reviewingDoc, setReviewingDoc] = useState(null);
  const [flaggingDoc,  setFlaggingDoc]  = useState(null);
  const [flagNote,     setFlagNote]     = useState("");
  const [copiedEmail,  setCopiedEmail]  = useState(false);

  const hasAddressChange    = app.address_change_requested;
  const hasOccupationChange = !!(app.new_occupation);
  const isReplacement       = app.transaction_type === "REPLACEMENT";

  const addressDoc = (app.documents || []).find(d =>
    d.is_current && (d.doc_type === "PROOF_OF_ADDRESS" || d.doc_type?.includes("ADDRESS"))
  );
  const addressDocReview   = addressDoc ? docReviews[addressDoc.id] : null;
  const addressDocApproved = addressDocReview?.status === "APPROVED";

  const itaEmail = {
    to: "ita@ita.gov.jm",
    subject: `Traffic Clearance Request — ${app.application_number}`,
    body: `Dear Island Traffic Authority,

I am writing to request a traffic clearance certificate for the following applicant in connection with a driver's licence replacement application submitted through the DLRSJAM system.

Application Reference: ${app.application_number}
Applicant Name: ${applicant?.firstname || ""} ${applicant?.lastname || ""}
TRN: ${app.trn || "on file"}
Date of Application: ${app.submitted_at ? fmtTime(app.submitted_at) : "—"}
Collectorate: ${app.pickup_collectorate || "—"}

Please confirm whether this applicant has any outstanding traffic violations, fines, or suspensions that would preclude the issuance of a replacement driver's licence.

This request is made under the authority of the Road Traffic Act 2018.

Regards,
TAJ Driver's Licence Unit
Tax Administration Jamaica`
  };

  const copyEmail = () => {
    const full = `To: ${itaEmail.to}\nSubject: ${itaEmail.subject}\n\n${itaEmail.body}`;
    navigator.clipboard.writeText(full).then(() => { setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000); });
  };

  if (!hasAddressChange && !hasOccupationChange && !isReplacement) {
    return (
      <div className={pStyles.stepContent}>
        <div className={pStyles.sectionHead}>
          <EditIcon size={18} stroke="#2563eb" />
          <h2 className={pStyles.sectionTitle}>Requested Changes</h2>
        </div>
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <div style={{ width: 44, height: 44, background: "#f0fdf4", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <CheckCircle size={22} stroke="#16a34a" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 6 }}>No changes requested</p>
          <p style={{ fontSize: 13, color: "#9ca3af" }}>No address or occupation changes requested.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {reviewingDoc && (
        <DocReviewModal
          doc={reviewingDoc}
          current={docReviews[reviewingDoc.id]}
          onSubmit={onDocReview}
          onClose={() => setReviewingDoc(null)}
        />
      )}

      {/* Inline flag modal */}
      {flaggingDoc && (
        <div style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setFlaggingDoc(null)}>
          <div style={{ background: "white", borderRadius: 16, padding: 24, maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FlagIcon size={14} stroke="#d97706" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 800, color: "#111827", margin: 0 }}>Flag for Review</p>
            </div>
            <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16, paddingLeft: 37 }}>{toTitleCase(flaggingDoc.doc_type)}</p>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>Note (optional)</label>
            <textarea value={flagNote} onChange={e => setFlagNote(e.target.value)}
              placeholder="What needs a closer look?…"
              rows={3}
              style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 8 }}>
              {(docFlags || {})[flaggingDoc.id] && (
                <button onClick={() => { onToggleFlag?.(flaggingDoc.id, null); setFlaggingDoc(null); }}
                  style={{ flex: 1, padding: 10, borderRadius: 8, border: "1.5px solid #fca5a5", background: "white", fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>
                  Remove Flag
                </button>
              )}
              <button onClick={() => setFlaggingDoc(null)}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={() => { onToggleFlag?.(flaggingDoc.id, { note: flagNote.trim(), docType: flaggingDoc.doc_type }); setFlaggingDoc(null); }}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#d97706", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {(docFlags || {})[flaggingDoc.id] ? "Update" : "Add Flag"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={pStyles.stepContent}>
        <div className={pStyles.sectionHead}>
          <EditIcon size={18} stroke="#2563eb" />
          <h2 className={pStyles.sectionTitle}>Requested Changes</h2>
          <span className={pStyles.sectionNote}>{hasAddressChange && addressChangeStatus === "approved" ? "Address change approved" : hasAddressChange ? "Action required" : ""}</span>
        </div>

        {hasAddressChange && (
          <div style={{ margin: "20px 24px", border: `2px solid ${addressChangeStatus === "approved" ? "#86efac" : "#bfdbfe"}`, borderRadius: 14, overflow: "hidden", background: addressChangeStatus === "approved" ? "#f0fdf4" : "#f8faff" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${addressChangeStatus === "approved" ? "#bbf7d0" : "#dbeafe"}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#111827", textTransform: "uppercase", letterSpacing: "0.06em" }}>Address Change Request</p>
              {addressChangeStatus === "approved" && (
                <span style={{ fontSize: 11, fontWeight: 700, background: "#dcfce7", color: "#15803d", padding: "3px 10px", borderRadius: 999, display: "flex", alignItems: "center", gap: 5 }}>
                  <CheckIcon size={10} stroke="#16a34a" sw={3} /> Approved
                </span>
              )}
            </div>

            <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", background: "white", margin: "16px 20px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div>
                <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Current address</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  {applicant?.address_line1 || "—"}{applicant?.address_line2 ? `, ${applicant.address_line2}` : ""}{applicant?.parish ? `, ${applicant.parish}` : ""}
                </p>
              </div>
              <ArrowRight size={18} stroke="#9ca3af" />
              <div>
                <p style={{ fontSize: 10, color: "#2563eb", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Requested new address</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>
                  {app.new_address_line1 || "—"}{app.new_address_line2 ? `, ${app.new_address_line2}` : ""}{app.new_parish ? `, ${app.new_parish}` : ""}
                </p>
              </div>
            </div>

            <div style={{ padding: "0 20px 16px" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 10 }}>Supporting Document</p>
              {addressDoc ? (() => {
                const flagged = (docFlags || {})[addressDoc.id];
                return (
                  <div style={{ border: `2px solid ${flagged ? "#fb923c" : addressDocReview?.status === "APPROVED" ? "#86efac" : "#e2e8f0"}`, borderRadius: 10, padding: "14px 16px", background: addressDocReview?.status === "APPROVED" ? "#f0fdf4" : "white" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 2 }}>{toTitleCase(addressDoc.doc_type)}</p>
                        <p style={{ fontSize: 11, color: "#9ca3af" }}>{addressDoc.original_filename} · {fmtTime(addressDoc.uploaded_at)}</p>
                        {addressDoc.ai_check_score != null && (
                          <span style={{ fontSize: 11, fontWeight: 600, background: addressDoc.ai_check_passed ? "#dcfce7" : "#fef9c3", color: addressDoc.ai_check_passed ? "#15803d" : "#92400e", padding: "2px 8px", borderRadius: 6, display: "inline-block", marginTop: 6 }}>
                            {addressDoc.ai_check_passed ? "✓ AI Verified" : "⚠ AI Warning"} · {addressDoc.ai_check_score}%
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                        {flagged && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "#fff7ed", color: "#d97706", border: "1px solid #fed7aa", display: "flex", alignItems: "center", gap: 3 }}>
                            <FlagIcon size={9} stroke="#d97706" /> Flagged
                          </span>
                        )}
                        {addressDocReview && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: addressDocReview.status === "APPROVED" ? "#dcfce7" : "#fef9c3", color: addressDocReview.status === "APPROVED" ? "#15803d" : "#92400e" }}>
                            {addressDocReview.status === "APPROVED" ? "Approved" : "Resubmit"}
                          </span>
                        )}
                      </div>
                    </div>
                    {flagged?.note && (
                      <div style={{ marginBottom: 8, padding: "6px 10px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 7, display: "flex", gap: 6 }}>
                        <FlagIcon size={11} stroke="#d97706" />
                        <p style={{ fontSize: 11, color: "#92400e", margin: 0, fontStyle: "italic" }}>"{flagged.note}"</p>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => onPreview(addressDoc)} style={{ flex: 1, height: 34, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f1f5f9", color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                        <EyeIcon size={12} /> Preview
                      </button>
                      <button onClick={() => { setFlagNote((docFlags || {})[addressDoc.id]?.note || ""); setFlaggingDoc(addressDoc); }}
                        style={{ flex: 1, height: 34, borderRadius: 8, border: `1.5px solid ${flagged ? "#fb923c" : "#e2e8f0"}`, background: flagged ? "#fff7ed" : "white", color: flagged ? "#d97706" : "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                        <FlagIcon size={11} stroke={flagged ? "#d97706" : "#6b7280"} /> {flagged ? "Flagged" : "Flag"}
                      </button>
                      <button onClick={() => setReviewingDoc(addressDoc)}
                        style={{ flex: 1, height: 34, borderRadius: 8, border: "none", background: addressDocReview?.status === "APPROVED" ? "#16a34a" : "#dcfce7", color: addressDocReview?.status === "APPROVED" ? "white" : "#15803d", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                        <CheckIcon size={11} sw={2.5} stroke={addressDocReview?.status === "APPROVED" ? "white" : "#15803d"} />
                        {addressDocReview?.status === "APPROVED" ? "Approved" : "Review"}
                      </button>
                      <button onClick={() => setReviewingDoc(addressDoc)}
                        style={{ flex: 1, height: 34, borderRadius: 8, border: "none", background: "#fef9c3", color: "#92400e", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                        <RotateIcon size={11} /> Resubmit
                      </button>
                    </div>
                  </div>
                );
              })() : (
                <div style={{ padding: 20, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>No proof of address document uploaded</p>
                </div>
              )}
            </div>

            {addressChangeStatus !== "approved" && (
              <div style={{ margin: "0 20px 16px", padding: "10px 14px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#92400e" }}>
                  {!addressDocApproved ? "Approve the proof of address document above before approving this address change." : "Document approved — you can now approve the address change below."}
                </p>
              </div>
            )}

            {addressChangeStatus !== "approved" && (
              <div style={{ padding: "0 20px 20px" }}>
                <button disabled={!addressDocApproved} onClick={() => setAddressChangeStatus("approved")}
                  style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: addressDocApproved ? "#16a34a" : "#e2e8f0", color: addressDocApproved ? "white" : "#9ca3af", fontSize: 14, fontWeight: 700, cursor: addressDocApproved ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <CheckCircle size={16} stroke={addressDocApproved ? "white" : "#9ca3af"} />
                  Approve Address Change
                </button>
              </div>
            )}

            {addressChangeStatus === "approved" && (
              <div style={{ margin: "0 20px 20px", padding: "10px 14px", background: "white", border: "1px solid #bbf7d0", borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>✓ Address change approved</p>
              </div>
            )}
          </div>
        )}

        {hasOccupationChange && (
          <div style={{ margin: `${hasAddressChange ? "12px" : "20px"} 24px 20px`, border: "2px solid #bfdbfe", borderRadius: 14, overflow: "hidden", background: "#f8faff" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #dbeafe" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#111827", textTransform: "uppercase", letterSpacing: "0.06em" }}>Occupation Change Request</p>
            </div>
            <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", background: "white", margin: "16px 20px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div>
                <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Current occupation</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{applicant?.occupation || "—"}</p>
              </div>
              <ArrowRight size={18} stroke="#9ca3af" />
              <div>
                <p style={{ fontSize: 10, color: "#2563eb", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Requested new occupation</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>{app.new_occupation}</p>
              </div>
            </div>
            <div style={{ padding: "0 20px 16px" }}>
              <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
                This change will be applied to the licence record automatically when the application is approved.
              </p>
            </div>
          </div>
        )}

        {isReplacement && (
          <div style={{ margin: `${hasAddressChange ? "12px" : "20px"} 24px 20px`, border: "2px solid #ddd6fe", borderRadius: 14, overflow: "hidden", background: "#faf5ff" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #ede9fe", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, background: "#ede9fe", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MailIcon size={15} stroke="#7c3aed" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#111827", textTransform: "uppercase", letterSpacing: "0.06em" }}>ITA Traffic Clearance Required</p>
                <p style={{ fontSize: 11, color: "#7c3aed" }}>Licence replacement — send email to Island Traffic Authority</p>
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ background: "#f3e8ff", border: "1px solid #ddd6fe", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: "#6d28d9", fontWeight: 600 }}>
                  Licence replacements require a traffic clearance from the Island Traffic Authority before the replacement can be issued.
                </p>
              </div>
              <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6", background: "#f8fafc" }}>
                  <div style={{ fontSize: 12, color: "#374151", marginBottom: 3 }}><span style={{ color: "#9ca3af" }}>To:</span> {itaEmail.to}</div>
                  <div style={{ fontSize: 12, color: "#374151" }}><span style={{ color: "#9ca3af" }}>Subject:</span> {itaEmail.subject}</div>
                </div>
                <div style={{ padding: 14, maxHeight: 180, overflowY: "auto" }}>
                  <pre style={{ fontSize: 12, color: "#374151", fontFamily: "inherit", whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0 }}>{itaEmail.body}</pre>
                </div>
              </div>
              <button onClick={copyEmail}
                style={{ width: "100%", padding: 11, borderRadius: 10, border: "none", background: copiedEmail ? "#16a34a" : "#7c3aed", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "background 0.2s" }}>
                {copiedEmail ? <><CheckIcon size={14} stroke="white" sw={2.5} /> Copied to clipboard</> : <><CopyIcon size={14} stroke="white" /> Copy email to clipboard</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

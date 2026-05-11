// Applicant details summary step — personal info, licence record, and verification photo.
import { useState, useEffect, useRef, useCallback } from "react";
import api from "../../../../services/api";
import pStyles from "../reviewStyles.module.css";

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

const TX_LABEL = { RENEWAL: "Renewal", REPLACEMENT: "Replacement", AMENDMENT: "Amendment" };

const Ico = ({ d, size = 16, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const UserIcon    = p => <Ico {...p} d={["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2","M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"]} />;
const AlertIcon   = p => <Ico {...p} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"]} />;
const MailIcon    = p => <Ico {...p} d={["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z","M22 6l-10 7L2 6"]} />;
const CopyIcon    = p => <Ico {...p} d={["M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z","M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"]} />;

function EmailPopup({ email }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(email).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!email || email === "—") return <span style={{ fontSize: 12, color: "#374151" }}>—</span>;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ fontSize: 12, fontWeight: 600, color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
        <MailIcon size={11} stroke="#2563eb" /> {email}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100, background: "white", border: "1.5px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 8, minWidth: 180 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", padding: "2px 6px 8px", borderBottom: "1px solid #f3f4f6", marginBottom: 6 }}>{email}</p>
          <button onClick={copy}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "6px 8px", borderRadius: 6, border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: copied ? "#15803d" : "#374151", fontWeight: 600 }}>
            <CopyIcon size={13} stroke={copied ? "#15803d" : "#6b7280"} />
            {copied ? "Copied!" : "Copy address"}
          </button>
          <a href={`mailto:${email}`}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "6px 8px", borderRadius: 6, textDecoration: "none", fontSize: 12, color: "#374151", fontWeight: 600 }}
            onClick={() => setOpen(false)}>
            <MailIcon size={13} stroke="#6b7280" /> Open in mail app
          </a>
        </div>
      )}
    </div>
  );
}
const MapPinIcon  = p => <Ico {...p} d={["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z","M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6"]} />;
const CheckCircle = p => <Ico {...p} d={["M22 11.08V12a10 10 0 1 1-5.93-9.14","M22 4L12 14.01l-3-3"]} />;
const CameraIcon  = p => <Ico {...p} d={["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z","M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6"]} />;
const FileIcon    = p => <Ico {...p} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6"]} />;
const PenIcon     = p => <Ico {...p} d={["M12 20h9","M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"]} />;
const TrashIcon   = p => <Ico {...p} d={["M3 6h18","M19 6l-1 14H6L5 6","M9 6V4h6v2"]} />;
const FlagIcon    = p => <Ico {...p} d={["M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z","M4 22v-7"]} />;

const DECISION_META = {
  APPROVED:          { label: "Approved",          color: "#15803d", bg: "#dcfce7", border: "#86efac" },
  RESUBMIT_REQUIRED: { label: "Resubmit Requested", color: "#854d0e", bg: "#fef9c3", border: "#fcd34d" },
};

function SignaturePad({ existingSig, onSave, onUseExisting }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };
  const startDraw = useCallback(e => { e.preventDefault(); drawing.current = true; const c = canvasRef.current; const ctx = c.getContext("2d"); const p = getPos(e, c); ctx.beginPath(); ctx.moveTo(p.x, p.y); }, []);
  const draw = useCallback(e => { e.preventDefault(); if (!drawing.current) return; const c = canvasRef.current; const ctx = c.getContext("2d"); const p = getPos(e, c); ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#1e3a8a"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); setIsEmpty(false); }, []);
  const stopDraw = useCallback(() => { drawing.current = false; }, []);
  const clear = () => { canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); setIsEmpty(true); };
  const save = async () => {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    setSaving(true);
    try { await api.post("/api/officer/profile/signature", { signature_image: dataUrl }); } catch {}
    setSaving(false);
    onSave(dataUrl);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {existingSig && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 8 }}>
          <img src={existingSig} alt="Saved sig" style={{ height: 32, objectFit: "contain" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#15803d" }}>Saved signature on file</p>
          </div>
          <button onClick={onUseExisting} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#16a34a", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Use saved</button>
        </div>
      )}
      <div style={{ position: "relative" }}>
        <canvas ref={canvasRef} width={400} height={90}
          style={{ width: "100%", height: 90, border: "1.5px solid #cbd5e1", borderRadius: 8, background: "#fafbff", cursor: "crosshair", display: "block", touchAction: "none" }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
        {isEmpty && <p style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 11, color: "#cbd5e1", pointerEvents: "none" }}>Draw signature here</p>}
        {!isEmpty && <button onClick={clear} style={{ position: "absolute", top: 5, right: 5, background: "white", border: "1px solid #e2e8f0", borderRadius: 5, padding: "2px 6px", cursor: "pointer", fontSize: 10, color: "#6b7280", fontFamily: "inherit" }}><TrashIcon size={9} /> Clear</button>}
      </div>
      <button onClick={save} disabled={isEmpty || saving}
        style={{ padding: "8px 0", borderRadius: 7, border: "none", background: isEmpty ? "#e2e8f0" : "#1e3a8a", color: "white", fontSize: 12, fontWeight: 700, cursor: isEmpty ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
        {saving ? "Saving…" : "Save & Use This Signature"}
      </button>
    </div>
  );
}

function PhotoDecisionModal({ photoBlobUrl, onSubmit, onClose, onRemove, existingDecision, photoFlag, onTogglePhotoFlag }) {
  const [status,        setStatus]        = useState(existingDecision?.status || "");
  const [comment,       setComment]       = useState(existingDecision?.comment || "");
  const [sig,           setSig]           = useState(null);
  const [showSigPad,    setShowSigPad]    = useState(false);
  const [loadingSig,    setLoadingSig]    = useState(true);
  const [confirmed,     setConfirmed]     = useState(false);
  const [confirmedAt,   setConfirmedAt]   = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [removingReason, setRemovingReason] = useState("");
  const [showRemove,    setShowRemove]    = useState(false);
  const [removing,      setRemoving]      = useState(false);

  const needsComment = status === "RESUBMIT_REQUIRED";
  const commentOk    = !needsComment || comment.trim().length > 0;
  const canConfirm   = status && commentOk && sig;
  const meta         = DECISION_META[status];

  useEffect(() => {
    api.get("/api/officer/profile/signature")
      .then(res => { if (res.data.signature_image) setSig(res.data.signature_image); })
      .catch(() => {})
      .finally(() => setLoadingSig(false));
  }, []);

  const handleConfirm = () => { setConfirmed(true); setConfirmedAt(new Date().toISOString()); };

  const handleSave = async () => {
    setSaving(true);
    try { await onSubmit(status, comment.trim()); onClose(); }
    finally { setSaving(false); }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try { await onRemove(removingReason.trim()); onClose(); }
    finally { setRemoving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: "white", borderRadius: 16, padding: 28, maxWidth: 520, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxHeight: "92vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        <p style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 4 }}>Photo Decision</p>
        <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>Licence Photo — review and sign to confirm</p>

        {photoBlobUrl && (
          <img src={photoBlobUrl} alt="Applicant photo"
            style={{ display: "block", height: 100, objectFit: "cover", objectPosition: "top", borderRadius: 8, border: "1.5px solid #e2e8f0", marginBottom: 16 }} />
        )}

        {/* Remove existing decision */}
        {existingDecision && !showRemove && (
          <button onClick={() => setShowRemove(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 11, color: "#dc2626", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}>
            <TrashIcon size={11} stroke="#dc2626" /> Remove current decision
          </button>
        )}
        {showRemove && (
          <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>Remove decision — provide reason <span style={{ color: "#ef4444" }}>*</span></p>
            <textarea value={removingReason} onChange={e => setRemovingReason(e.target.value)}
              placeholder="e.g. Decision made in error…" rows={2}
              style={{ width: "100%", border: "1.5px solid #fca5a5", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setShowRemove(false)}
                style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "white", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button disabled={!removingReason.trim() || removing} onClick={handleRemove}
                style={{ flex: 2, padding: "7px 0", borderRadius: 7, border: "none", background: removingReason.trim() ? "#dc2626" : "#94a3b8", color: "white", fontSize: 12, fontWeight: 700, cursor: removingReason.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                {removing ? "Removing…" : "Confirm Remove"}
              </button>
            </div>
          </div>
        )}

        {/* Decision selection */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
          {[
            { value: "APPROVED",          label: "Approve Photo",        color: "#15803d", bg: "#f0fdf4", border: "#86efac" },
            { value: "RESUBMIT_REQUIRED", label: "Request Resubmission", color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
          ].map(opt => (
            <button key={opt.value} onClick={() => { setStatus(opt.value); setConfirmed(false); setConfirmedAt(null); }}
              style={{ padding: "11px 14px", borderRadius: 10, border: `2px solid ${status === opt.value ? opt.border : "#e2e8f0"}`, background: status === opt.value ? opt.bg : "white", cursor: "pointer", fontSize: 13, fontWeight: 700, color: status === opt.value ? opt.color : "#6b7280", fontFamily: "inherit", textAlign: "left" }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Comment */}
        {status && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
              {needsComment ? <>Comment <span style={{ color: "#ef4444" }}>*</span></> : "Comment (optional)"}
            </label>
            <textarea value={comment} onChange={e => { setComment(e.target.value); setConfirmed(false); setConfirmedAt(null); }}
              placeholder={status === "APPROVED" ? "Approval note (optional)…" : "Explain the reason…"}
              rows={2}
              style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "9px 11px", fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
          </div>
        )}

        {/* Signature */}
        {status && commentOk && (
          <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
              <PenIcon size={14} stroke="#374151" />
              <p style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>Officer Signature</p>
            </div>
            {loadingSig ? (
              <p style={{ fontSize: 11, color: "#9ca3af" }}>Loading…</p>
            ) : sig && !showSigPad ? (
              <div>
                <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                  <img src={sig} alt="Officer signature" style={{ display: "block", height: 44, objectFit: "contain", objectPosition: "left", maxWidth: "100%" }} />
                  <button onClick={() => { setShowSigPad(true); setConfirmed(false); }}
                    style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", marginTop: 5, display: "flex", alignItems: "center", gap: 3 }}>
                    <PenIcon size={9} /> Draw a different signature
                  </button>
                </div>
                {!confirmed ? (
                  <button onClick={handleConfirm}
                    style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "none", background: meta?.color || "#1e3a8a", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Confirm {meta?.label || "Decision"}
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 8 }}>
                    <CheckCircle size={14} stroke="#16a34a" />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#15803d" }}>Decision confirmed</p>
                      <p style={{ fontSize: 10, color: "#6b7280" }}>{fmtTime(confirmedAt)}</p>
                    </div>
                    <button onClick={() => { setConfirmed(false); setConfirmedAt(null); }}
                      style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Undo</button>
                  </div>
                )}
              </div>
            ) : (
              <SignaturePad existingSig={sig} onSave={s => { setSig(s); setShowSigPad(false); }} onUseExisting={() => setShowSigPad(false)} />
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button
            onClick={() => { onTogglePhotoFlag(photoFlag ? null : { note: "" }); onClose(); }}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: `1.5px solid ${photoFlag ? "#fb923c" : "#e2e8f0"}`, background: photoFlag ? "#fff7ed" : "white", fontSize: 13, fontWeight: 600, color: photoFlag ? "#d97706" : "#374151", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <FlagIcon size={13} stroke={photoFlag ? "#d97706" : "#6b7280"} />
            {photoFlag ? "Unflag" : "Flag Photo"}
          </button>
          <button disabled={!confirmed || saving} onClick={handleSave}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: confirmed ? "#1e3a8a" : "#94a3b8", color: "white", fontSize: 13, fontWeight: 700, cursor: confirmed ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            {saving ? "Saving…" : "Save Decision"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StepSummary({ app, applicant, licence, onDocReview, photoFlag, onTogglePhotoFlag }) {
  const photoDoc = (app.documents || []).find(d => d.doc_type === "licence_photo" && d.is_current);
  const [photoBlobUrl,  setPhotoBlobUrl]  = useState(null);
  const [expanded,      setExpanded]      = useState(false);
  const [photoDecision, setPhotoDecision] = useState(null);
  const [decidedAt,     setDecidedAt]     = useState(null);
  const [showModal,     setShowModal]     = useState(false);

  useEffect(() => {
    if (!photoDoc) return;
    let url;
    api.get(`/api/officer/applications/${app.id}/documents/${photoDoc.id}/file`, { responseType: "blob" })
      .then(res => { url = URL.createObjectURL(res.data); setPhotoBlobUrl(url); })
      .catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [app.id, photoDoc?.id]);

  const handlePhotoDecision = async (status, note = "") => {
    await api.post(`/api/officer/applications/${app.id}/documents/${photoDoc.id}/review`, { status, comment: note });
    const ts = new Date().toISOString();
    setPhotoDecision(status);
    setDecidedAt(ts);
    if (onDocReview) onDocReview(photoDoc.id, status, note, ts);
  };

  const handleRemoveDecision = async (reason) => {
    await api.delete(`/api/officer/applications/${app.id}/documents/${photoDoc.id}/review`, { data: { reason } });
    setPhotoDecision(null);
    setDecidedAt(null);
    if (onDocReview) onDocReview(photoDoc.id, null, "", null);
  };

  return (
    <div className={pStyles.stepContent}>
      <div className={pStyles.sectionHead}>
        <UserIcon size={18} stroke="#2563eb" />
        <h2 className={pStyles.sectionTitle}>Applicant Summary</h2>
      </div>

      {showModal && photoDoc && (
        <PhotoDecisionModal
          photoBlobUrl={photoBlobUrl}
          existingDecision={photoDecision ? { status: photoDecision } : null}
          onSubmit={handlePhotoDecision}
          onRemove={handleRemoveDecision}
          onClose={() => setShowModal(false)}
          photoFlag={photoFlag}
          onTogglePhotoFlag={onTogglePhotoFlag}
        />
      )}

      {/* Photo + Declaration FIRST — identity confirmation */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 0, borderBottom: "1px solid #f3f4f6" }}>

        {/* Photo */}
        <div style={{ padding: "20px 20px", borderRight: "1px solid #f3f4f6", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, background: "#fafbff" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", alignSelf: "flex-start" }}>Submitted Photo</p>
          {photoBlobUrl ? (
            <>
              <div style={{ position: "relative", cursor: "zoom-in" }} onClick={() => setExpanded(true)}>
                <img src={photoBlobUrl} alt="Applicant photo"
                  style={{ width: 110, height: 145, objectFit: "cover", borderRadius: 10,
                    border: `2px solid ${photoFlag ? "#fb923c" : photoDecision === "APPROVED" ? "#86efac" : photoDecision === "RESUBMIT_REQUIRED" ? "#fcd34d" : "#e2e8f0"}`,
                    display: "block" }}
                  onError={e => e.target.style.display = "none"}
                />
                <div style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.55)", borderRadius: 5, padding: "2px 5px" }}>
                  <FileIcon size={11} stroke="white" />
                </div>
              </div>

              {photoFlag && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706", background: "#fff7ed", border: "1px solid #fed7aa", padding: "2px 8px", borderRadius: 999, display: "flex", alignItems: "center", gap: 3 }}>
                  <FlagIcon size={9} stroke="#d97706" /> Flagged
                </span>
              )}

              {photoDecision && DECISION_META[photoDecision] && (
                <span style={{ fontSize: 11, fontWeight: 700, color: DECISION_META[photoDecision].color, background: DECISION_META[photoDecision].bg, padding: "3px 10px", borderRadius: 999, textAlign: "center" }}>
                  {photoDecision === "APPROVED" ? "✓" : "↺"} {DECISION_META[photoDecision].label}
                  {decidedAt ? " · " + fmtTime(decidedAt) : ""}
                </span>
              )}

              <button onClick={() => setShowModal(true)}
                style={{ width: "100%", padding: "6px 0", borderRadius: 7, border: "1.5px solid #cbd5e1", background: "white", color: "#374151", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {photoDecision ? "Change / Remove Decision" : "Review Photo"}
              </button>
            </>
          ) : (
            <div style={{ background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: 10, padding: "28px 20px", textAlign: "center", width: "100%" }}>
              <CameraIcon size={24} stroke="#d1d5db" />
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>No photo</p>
            </div>
          )}
          <p style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", lineHeight: 1.4 }}>
            Cross-check photo against applicant's identity documents
          </p>
        </div>

        {/* Lightbox */}
        {expanded && photoBlobUrl && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setExpanded(false)}>
            <img src={photoBlobUrl} alt="Applicant photo"
              style={{ maxHeight: "90vh", maxWidth: "90vw", borderRadius: 12, border: "3px solid white", objectFit: "contain" }} />
            <button onClick={() => setExpanded(false)}
              style={{ position: "absolute", top: 20, right: 24, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", color: "white", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ✕
            </button>
          </div>
        )}

        {/* Declaration */}
        <div style={{ padding: "20px 24px", background: "#fafbff" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Signed Declaration</p>
          {app.declaration ? (
            <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <CheckCircle size={18} stroke="#16a34a" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>Declaration Signed</span>
              </div>
              <div style={{ background: "white", border: "1px solid #bbf7d0", borderRadius: 8, padding: 14, marginBottom: 12 }}>
                <p style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Digital Signature</p>
                {app.signature_image ? (
                  <img
                    src={app.signature_image}
                    alt="Applicant signature"
                    style={{ display: "block", maxWidth: "100%", height: 72, objectFit: "contain", objectPosition: "left center", borderBottom: "2px solid #d1d5db", paddingBottom: 8, marginBottom: 8 }}
                  />
                ) : (
                  <p style={{ fontSize: 22, color: "#1e3a8a", fontFamily: "Georgia, serif", fontStyle: "italic", borderBottom: "2px solid #d1d5db", paddingBottom: 8, marginBottom: 8 }}>
                    {applicant?.firstname} {applicant?.lastname}
                  </p>
                )}
                <p style={{ fontSize: 11, color: "#9ca3af" }}>Signed {fmtTime(app.declaration_signed_at || app.submitted_at)}</p>
              </div>
              <div style={{ background: "#dcfce7", borderRadius: 6, padding: "8px 12px" }}>
                <p style={{ fontSize: 11, color: "#15803d", lineHeight: 1.5 }}>
                  "I hereby declare that all information provided in this application is true and correct to the best of my knowledge."
                </p>
              </div>
            </div>
          ) : (
            <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: 20, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>Declaration not signed</p>
            </div>
          )}
        </div>
      </div>

      {/* Data grid */}
      <div className={pStyles.twoCol}>
        {/* Personal */}
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

        {/* Address */}
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
          {app.address_change_requested && (
            <div className={pStyles.changeBanner}>
              <AlertIcon size={13} stroke="#c2410c" />
              <div>
                <p className={pStyles.changeBannerTitle} style={{ color: "#c2410c" }}>Address change requested</p>
                <p className={pStyles.changeBannerVal}>
                  {app.new_address_line1}{app.new_address_line2 ? `, ${app.new_address_line2}` : ""}{app.new_parish ? `, ${app.new_parish}` : ""}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Licence */}
        <div className={pStyles.infoBlock}>
          <p className={pStyles.infoBlockTitle}>Licence Record</p>
          {[
            ["Current Control No.", licence?.control_number || "—"],
            ["TRN",           licence?.trn || "—"],
            ["Class",         licence?.licence_class || "—"],
            ["Status",        licence?.status || "—"],
            ["First Issued",  fmt(licence?.first_issue_date)],
            ["Last Issued",   fmt(licence?.issue_date)],
            ["Expiry Date",   fmt(licence?.expiry_date)],
            ["Collectorate",  licence?.collectorate || "—"],
          ].map(([l, v]) => (
            <div key={l} className={pStyles.infoRow}>
              <span className={pStyles.infoLabel}>{l}</span>
              <span className={pStyles.infoVal}>{v}</span>
            </div>
          ))}
        </div>

        {/* Application */}
        <div className={pStyles.infoBlock}>
          <p className={pStyles.infoBlockTitle}>Application Details</p>
          {[
            ["Reference",       app.application_number],
            ["Type",            TX_LABEL[app.transaction_type] || app.transaction_type],
            ["Submitted",       fmtTime(app.submitted_at)],
            ["Fee",             app.fee_amount ? `J$${parseFloat(app.fee_amount).toLocaleString()}` : "—"],
            ["Payment Ref",     app.payment_reference || "—"],
            ["Pickup Location", app.pickup_collectorate || "—"],
          ].map(([l, v]) => (
            <div key={l} className={pStyles.infoRow}>
              <span className={pStyles.infoLabel}>{l}</span>
              <span className={pStyles.infoVal}>{v}</span>
            </div>
          ))}
          {app.trustee_collection && (
            <div className={pStyles.changeBanner} style={{ borderColor: "#ddd6fe", background: "#f5f3ff" }}>
              <MapPinIcon size={13} stroke="#7c3aed" />
              <div>
                <p className={pStyles.changeBannerTitle} style={{ color: "#7c3aed" }}>Trustee collection</p>
                <p className={pStyles.changeBannerVal} style={{ color: "#6d28d9" }}>
                  {app.trustee_name} · {app.trustee_contact}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
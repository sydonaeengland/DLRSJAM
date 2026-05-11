// Documents step — officer views each uploaded document, runs OCR cross-check, and sets per-document decisions. Also shows the liveness/face verification panel.
import { useState, useRef, useCallback, useEffect } from "react";
import api from "../../../../services/api";
import pStyles from "../reviewStyles.module.css";

function fmtTime(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z") ? iso : iso + "Z";
  return new Date(s).toLocaleString("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Jamaica" });
}
function fmtShort(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z") ? iso : iso + "Z";
  return new Date(s).toLocaleString("en-JM", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Jamaica" });
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
const FileIcon    = p => <Ico {...p} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6"]} />;
const EyeIcon     = p => <Ico {...p} d={["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6"]} />;
const CheckIcon   = p => <Ico {...p} sw={2.5} d="M5 12l5 5L20 7" />;
const RotateIcon  = p => <Ico {...p} d={["M1 4v6h6","M3.51 15a9 9 0 1 0 .49-4.5"]} />;
const XIcon       = p => <Ico {...p} d="M18 6L6 18M6 6l12 12" />;
const TrashIcon   = p => <Ico {...p} d={["M3 6h18","M19 6l-1 14H6L5 6","M9 6V4h6v2"]} />;
const ShieldIcon  = p => <Ico {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const AlertIcon   = p => <Ico {...p} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"]} />;
const PenIcon     = p => <Ico {...p} d={["M12 20h9","M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"]} />;
const CheckCircle = p => <Ico {...p} d={["M22 11.08V12a10 10 0 1 1-5.93-9.14","M22 4L12 14.01l-3-3"]} />;
const ClockIcon   = p => <Ico {...p} d={["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M12 6v6l4 2"]} />;
const FlagIcon    = p => <Ico {...p} d={["M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z","M4 22v-7"]} />;

// Shared signature pad

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
    try { await api.post("/api/officer/profile/signature", { signature_image: dataUrl }); } catch { /* save best-effort */ }
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

// Score bar

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

function VerificationHistory({ events }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ margin: "0 18px 14px", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: "100%", padding: "10px 14px", background: "#f8fafc", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <ClockIcon size={13} stroke="#6b7280" />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Verification History</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af" }}>({events.length})</span>
        </div>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2.5} strokeLinecap="round">
          <path d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
        </svg>
      </button>
      {open && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, background: "white" }}>
          {events.map((ev, i) => (
            <div key={ev.id || i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                <ClockIcon size={11} stroke="#4338ca" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: 0 }}>{ev.event_type?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                {ev.comment && <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0", fontStyle: "italic" }}>"{ev.comment}"</p>}
              </div>
              <p style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0, marginTop: 2 }}>{fmtShort(ev.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Verification override modal (reject whole application)

const OVERRIDE_REASONS = [
  "Photo does not match applicant",
  "Liveness check appears spoofed",
  "Significant discrepancy with ID documents",
  "Applicant identity cannot be confirmed",
  "Verification photo is obscured or manipulated",
  "Other",
];

function VerificationOverrideModal({ app, onRejected, onClose }) {
  const [reason,       setReason]       = useState("");
  const [customReason, setCustomReason] = useState("");
  const [sig,          setSig]          = useState(null);
  const [showSigPad,   setShowSigPad]   = useState(false);
  const [confirmedAt,  setConfirmedAt]  = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [loadingSig,   setLoadingSig]   = useState(true);

  useEffect(() => {
    api.get("/api/officer/profile/signature")
      .then(res => { if (res.data.signature_image) setSig(res.data.signature_image); })
      .catch(() => {})
      .finally(() => setLoadingSig(false));
  }, []);

  const finalReason = reason === "Other" ? customReason.trim() : reason + (customReason.trim() ? ` — ${customReason.trim()}` : "");
  const canConfirm  = !!reason && (reason !== "Other" || customReason.trim()) && !!sig;
  const canSubmit   = canConfirm && !!confirmedAt;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/api/officer/applications/${app.id}/reject`, { comment: `Verification overridden by officer: ${finalReason}` });
      onRejected();
      onClose();
    } catch { alert("Failed to reject application. Please try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldIcon size={16} stroke="#dc2626" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0 }}>Override Verification — Reject Application</p>
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, paddingLeft: 42, lineHeight: 1.5 }}>
            This will reject the entire application. The applicant will be notified with your reason.
          </p>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Reason list */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Reason for Override <span style={{ color: "#ef4444" }}>*</span></p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {OVERRIDE_REASONS.map(r => (
                <button key={r} onClick={() => { setReason(r); setCustomReason(""); setConfirmedAt(null); }}
                  style={{ padding: "9px 13px", borderRadius: 8, border: `1.5px solid ${reason === r ? "#fca5a5" : "#e2e8f0"}`, background: reason === r ? "#fef2f2" : "white", cursor: "pointer", fontSize: 12, fontWeight: reason === r ? 700 : 500, color: reason === r ? "#991b1b" : "#374151", fontFamily: "inherit", textAlign: "left" }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {reason && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
                {reason === "Other" ? <>Details <span style={{ color: "#ef4444" }}>*</span></> : "Additional context (optional)"}
              </label>
              <textarea value={customReason} onChange={e => { setCustomReason(e.target.value); setConfirmedAt(null); }}
                placeholder={reason === "Other" ? "Describe the issue in detail…" : "Any extra context for the record…"}
                rows={3}
                style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            </div>
          )}

          {/* Signature */}
          {reason && (reason !== "Other" || customReason.trim()) && (
            <div style={{ padding: 14, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                <PenIcon size={13} stroke="#374151" />
                <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0 }}>Officer Signature <span style={{ color: "#ef4444" }}>*</span></p>
              </div>
              {loadingSig ? (
                <p style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</p>
              ) : sig && !showSigPad ? (
                <div>
                  <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Signature</p>
                    <img src={sig} alt="Signature" style={{ height: 44, objectFit: "contain", objectPosition: "left", maxWidth: "100%", display: "block" }} />
                    <button onClick={() => { setShowSigPad(true); setConfirmedAt(null); }}
                      style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                      <PenIcon size={9} /> Draw a different signature
                    </button>
                  </div>
                </div>
              ) : (
                <SignaturePad existingSig={sig} onSave={s => { setSig(s); setShowSigPad(false); }} onUseExisting={() => setShowSigPad(false)} />
              )}
            </div>
          )}

          {/* Confirm */}
          {canConfirm && !confirmedAt && (
            <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, marginBottom: 10 }}>
                I confirm that I am overriding this verification result and rejecting this application on the grounds stated above.
              </p>
              <button onClick={() => setConfirmedAt(new Date().toISOString())}
                style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "none", background: "#dc2626", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Confirm Override Decision
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

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit || submitting}
            style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: canSubmit ? "#dc2626" : "#94a3b8", color: "white", fontSize: 13, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            {submitting ? "Rejecting Application…" : "Reject Application"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Re-verification request modal

const REVERIFY_REASONS = [
  "Photo is blurry or low quality",
  "Face not clearly visible",
  "Lighting conditions too poor to verify",
  "Liveness check score below threshold",
  "Face does not match submitted ID photo",
  "Suspected spoofing attempt",
  "Other",
];

function ReverifyModal({ app, onRequested, onClose }) {
  const [reason,       setReason]       = useState("");
  const [customReason, setCustomReason] = useState("");
  const [sig,          setSig]          = useState(null);
  const [showSigPad,   setShowSigPad]   = useState(false);
  const [confirmedAt,  setConfirmedAt]  = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [loadingSig,   setLoadingSig]   = useState(true);

  useEffect(() => {
    api.get("/api/officer/profile/signature")
      .then(res => { if (res.data.signature_image) setSig(res.data.signature_image); })
      .catch(() => {})
      .finally(() => setLoadingSig(false));
  }, []);

  const finalReason = reason === "Other" ? customReason.trim() : reason + (customReason.trim() ? ` — ${customReason.trim()}` : "");
  const canConfirm  = !!reason && (reason !== "Other" || customReason.trim()) && !!sig;
  const canSubmit   = canConfirm && !!confirmedAt;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/api/officer/applications/${app.id}/request-reverification`, { comment: finalReason });
      onRequested();
      onClose();
    } catch { alert("Failed to request re-verification. Please try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fef9c3", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <RotateIcon size={16} stroke="#d97706" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0 }}>Request Re-verification</p>
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, paddingLeft: 42, lineHeight: 1.5 }}>
            The applicant will be asked to complete live identity verification again.
          </p>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Reason <span style={{ color: "#ef4444" }}>*</span></p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {REVERIFY_REASONS.map(r => (
                <button key={r} onClick={() => { setReason(r); setCustomReason(""); setConfirmedAt(null); }}
                  style={{ padding: "9px 13px", borderRadius: 8, border: `1.5px solid ${reason === r ? "#fcd34d" : "#e2e8f0"}`, background: reason === r ? "#fffbeb" : "white", cursor: "pointer", fontSize: 12, fontWeight: reason === r ? 700 : 500, color: reason === r ? "#92400e" : "#374151", fontFamily: "inherit", textAlign: "left" }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {reason && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
                {reason === "Other" ? <>Details <span style={{ color: "#ef4444" }}>*</span></> : "Additional context (optional)"}
              </label>
              <textarea value={customReason} onChange={e => { setCustomReason(e.target.value); setConfirmedAt(null); }}
                placeholder={reason === "Other" ? "Describe the issue in detail…" : "Any extra context for the record…"}
                rows={3}
                style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            </div>
          )}

          {reason && (reason !== "Other" || customReason.trim()) && (
            <div style={{ padding: 14, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                <PenIcon size={13} stroke="#374151" />
                <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0 }}>Officer Signature <span style={{ color: "#ef4444" }}>*</span></p>
              </div>
              {loadingSig ? (
                <p style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</p>
              ) : sig && !showSigPad ? (
                <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Signature</p>
                  <img src={sig} alt="Signature" style={{ height: 44, objectFit: "contain", objectPosition: "left", maxWidth: "100%", display: "block" }} />
                  <button onClick={() => { setShowSigPad(true); setConfirmedAt(null); }}
                    style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                    <PenIcon size={9} /> Draw a different signature
                  </button>
                </div>
              ) : (
                <SignaturePad existingSig={sig} onSave={s => { setSig(s); setShowSigPad(false); }} onUseExisting={() => setShowSigPad(false)} />
              )}
            </div>
          )}

          {canConfirm && !confirmedAt && (
            <div style={{ padding: "12px 16px", background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, marginBottom: 10 }}>
                I confirm that I am requesting the applicant to complete live identity verification again for the reason stated above.
              </p>
              <button onClick={() => setConfirmedAt(new Date().toISOString())}
                style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "none", background: "#d97706", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Confirm Request
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
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit || submitting}
            style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: canSubmit ? "#d97706" : "#94a3b8", color: "white", fontSize: 13, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            {submitting ? "Requesting…" : "Request Re-verification"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Liveness panel

function LivenessPanel({ app, onReverifyRequested, onApplicationRejected, verificationFlag, onToggleVerificationFlag, verificationOverridden, onCancelOverride }) {
  const [showReverify,   setShowReverify]   = useState(false);
  const [showOverride,   setShowOverride]   = useState(false);
  const [cancelling,     setCancelling]     = useState(false);
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [flagNote,      setFlagNote]      = useState(verificationFlag?.note || "");
  const [showFlagInput, setShowFlagInput] = useState(false);
  const [photoBlobUrl,  setPhotoBlobUrl]  = useState(null);

  const verificationPhotoDoc = (app.documents || []).find(d => d.is_current && d.doc_type === "verification_photo");

  useEffect(() => {
    if (!verificationPhotoDoc) return;
    api.get(`/api/officer/applications/${app.id}/documents/${verificationPhotoDoc.id}/file`, { responseType: "blob" })
      .then(res => setPhotoBlobUrl(URL.createObjectURL(res.data)))
      .catch(() => {});
    return () => { if (photoBlobUrl) URL.revokeObjectURL(photoBlobUrl); };
  }, [verificationPhotoDoc?.id]);

  if (!app.verification_attempts) return null;

  const passed   = app.verification_passed;
  const manual   = app.needs_manual_review;
  const reverify = app.reverification_requested;

  const autoApproved = passed && !manual && !reverify && !verificationFlag && !verificationOverridden;
  const statusLabel = verificationOverridden ? "Overridden — Rejected"
                    : reverify               ? "Re-verification Requested"
                    : verificationFlag        ? "Flagged"
                    : autoApproved           ? "Approved"
                    : manual                 ? "Manual Review Required"
                    : "Failed";
  const statusColor = autoApproved           ? "#15803d"
                    : verificationFlag        ? "#d97706"
                    : reverify               ? "#a16207"
                    : "#991b1b";
  const statusBg    = autoApproved           ? "#dcfce7"
                    : verificationFlag        ? "#fff7ed"
                    : reverify               ? "#fef9c3"
                    : "#fee2e2";

  // Pull verification-related events from the application history
  const verifyEvents = (app.events || [])
    .filter(e => ["SUBMITTED", "RESUBMITTED", "REVERIFICATION_REQUESTED", "MANUAL_REVIEW_CLEARED"].includes(e.event_type) || (e.event_type === "STATUS_CHANGE" && e.comment?.toLowerCase().includes("verif")))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <>
      {showReverify && (
        <ReverifyModal
          app={app}
          onRequested={() => onReverifyRequested?.()}
          onClose={() => setShowReverify(false)}
        />
      )}
      {showOverride && (
        <VerificationOverrideModal
          app={app}
          onRejected={() => onApplicationRejected?.()}
          onClose={() => setShowOverride(false)}
        />
      )}

      <div style={{ overflow: "hidden", background: "white" }}>

        {/* Header */}
        <div style={{ padding: "14px 18px", background: autoApproved ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : verificationFlag ? "linear-gradient(135deg,#fffbeb,#fff7ed)" : reverify ? "linear-gradient(135deg,#fffbeb,#fef9c3)" : "#fef2f2", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: autoApproved ? "#dcfce7" : verificationFlag ? "#fff7ed" : reverify ? "#fef9c3" : "#fecaca", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ShieldIcon size={17} stroke={statusColor} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#111827", margin: "0 0 2px" }}>Live Identity Verification</p>
            <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
              {app.verification_attempts} attempt{app.verification_attempts !== 1 ? "s" : ""}
              {app.verified_at ? ` · completed ${fmtTime(app.verified_at)}` : ""}
            </p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: statusBg, color: statusColor, flexShrink: 0 }}>
            {statusLabel}
          </span>
        </div>

        {/* Body — selfie + scores */}
        <div style={{ padding: "16px 18px", display: "flex", gap: 18 }}>

          {/* Live capture selfie */}
          {photoBlobUrl ? (
            <div style={{ flexShrink: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Captured Frame</p>
              <div style={{ position: "relative" }}>
                <img
                  src={photoBlobUrl}
                  alt="Verification capture"
                  onClick={() => setPhotoExpanded(true)}
                  style={{ width: 100, height: 130, objectFit: "cover", objectPosition: "top", borderRadius: 8, border: `2px solid ${verificationFlag ? "#fb923c" : autoApproved ? "#86efac" : "#fca5a5"}`, display: "block", cursor: "zoom-in" }}
                />
                <div style={{ position: "absolute", bottom: 5, right: 5, background: "rgba(0,0,0,0.5)", borderRadius: 5, padding: "2px 5px", display: "flex", alignItems: "center", gap: 3 }}>
                  <EyeIcon size={10} stroke="white" />
                </div>
              </div>
              <p style={{ fontSize: 9, color: "#9ca3af", marginTop: 4, textAlign: "center" }}>Click to enlarge</p>
              {verificationFlag && (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 4, fontSize: 10, fontWeight: 700, color: "#d97706" }}>
                  <FlagIcon size={9} stroke="#d97706" /> Flagged
                </span>
              )}
            </div>
          ) : (
            <div style={{ width: 100, height: 130, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: 8, border: "1.5px dashed #e2e8f0" }}>
              <ShieldIcon size={20} stroke="#d1d5db" />
              <p style={{ fontSize: 9, color: "#9ca3af", marginTop: 4, textAlign: "center" }}>No capture</p>
            </div>
          )}

          {/* Scores + metadata */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Score Breakdown</p>
            <ScoreBar label="Liveness Score" value={app.liveness_score}   threshold={50} />
            <ScoreBar label="Face Match"     value={app.face_match_score} threshold={20} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              {[
                ["Attempts",  app.verification_attempts],
                ["Liveness",  app.liveness_score != null ? `${app.liveness_score}%` : "—"],
                ["Face Match",app.face_match_score != null ? `${app.face_match_score}%` : "—"],
                ["Completed", app.verified_at ? fmtShort(app.verified_at) : "—"],
              ].map(([label, val]) => (
                <div key={label} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
                  <p style={{ fontSize: 10, color: "#9ca3af", marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0 }}>{val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* Verification flag note */}
        {verificationFlag?.note && (
          <div style={{ margin: "0 18px 10px", padding: "8px 12px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, display: "flex", gap: 7, alignItems: "flex-start" }}>
            <FlagIcon size={12} stroke="#d97706" />
            <p style={{ fontSize: 11, color: "#92400e", margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>"{verificationFlag.note}"</p>
          </div>
        )}

        {/* Manual review reason */}
        {manual && app.manual_review_reason && (
          <div style={{ margin: "0 18px 14px", padding: "10px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, display: "flex", gap: 7, alignItems: "flex-start" }}>
            <AlertIcon size={13} stroke="#d97706" />
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#92400e", margin: "0 0 2px" }}>Manual Review Flagged</p>
              <p style={{ fontSize: 11, color: "#78350f", margin: 0, lineHeight: 1.5 }}>{app.manual_review_reason}</p>
            </div>
          </div>
        )}

        {/* Verification history — collapsible */}
        {verifyEvents.length > 0 && <VerificationHistory events={verifyEvents} />}

        {/* Inline flag input */}
        {showFlagInput && (
          <div style={{ margin: "0 18px 10px", padding: "12px 14px", background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>Flag verification photo</p>
            <textarea
              value={flagNote}
              onChange={e => setFlagNote(e.target.value)}
              placeholder="What needs a closer look? e.g. face angle unclear, photo quality poor…"
              rows={2}
              style={{ width: "100%", border: "1.5px solid #fcd34d", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box", background: "white", marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 7 }}>
              {verificationFlag && (
                <button onClick={() => { onToggleVerificationFlag(null); setShowFlagInput(false); setFlagNote(""); }}
                  style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "1.5px solid #fca5a5", background: "white", fontSize: 11, fontWeight: 600, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>
                  Remove Flag
                </button>
              )}
              <button onClick={() => setShowFlagInput(false)}
                style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "white", fontSize: 11, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={() => { onToggleVerificationFlag({ note: flagNote.trim() }); setShowFlagInput(false); }}
                style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "none", background: "#d97706", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {verificationFlag ? "Update" : "Add Flag"}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ padding: "14px 18px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!reverify && (
            <button onClick={() => setShowReverify(true)}
              style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1.5px solid #fcd34d", background: "#fefce8", fontSize: 12, fontWeight: 700, color: "#92400e", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <RotateIcon size={12} stroke="#92400e" />
              Request Re-verification
            </button>
          )}
          {reverify && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#92400e", margin: 0, flex: 1 }}>Re-verification requested — awaiting applicant response.</p>
              <button onClick={async () => { setCancelling(true); try { await api.post(`/api/officer/applications/${app.id}/cancel-reverification`); onReverifyRequested?.(); } catch (e) { console.error("cancel-reverification error", e.response?.status, e.response?.data); alert(`Failed to cancel: ${e.response?.data?.error || e.message}`); } finally { setCancelling(false); } }}
                disabled={cancelling}
                style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid #e2e8f0", background: "white", fontSize: 11, fontWeight: 700, color: "#374151", cursor: cancelling ? "not-allowed" : "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                {cancelling ? "Cancelling…" : "Cancel"}
              </button>
            </div>
          )}
          <button onClick={() => { setFlagNote(verificationFlag?.note || ""); setShowFlagInput(v => !v); }}
            style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1.5px solid #fb923c", background: "#fff7ed", fontSize: 12, fontWeight: 700, color: "#c2410c", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <FlagIcon size={12} stroke="#c2410c" />
            {verificationFlag ? "Flagged" : "Flag Photo"}
          </button>
          {verificationOverridden ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8 }}>
              <XIcon size={12} stroke="#dc2626" />
              <p style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", margin: 0, flex: 1 }}>Override applied — application rejected.</p>
              <button onClick={onCancelOverride}
                style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid #e2e8f0", background: "white", fontSize: 11, fontWeight: 700, color: "#374151", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setShowOverride(true)}
              style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1.5px solid #fca5a5", background: "#fef2f2", fontSize: 12, fontWeight: 700, color: "#dc2626", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <XIcon size={12} stroke="#dc2626" />
              Override &amp; Reject Application
            </button>
          )}
        </div>
      </div>

      {/* Photo lightbox */}
      {photoExpanded && photoBlobUrl && (
        <div onClick={() => setPhotoExpanded(false)} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <img src={photoBlobUrl} alt="Verification" style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }} />
          <button onClick={() => setPhotoExpanded(false)} style={{ position: "fixed", top: 20, right: 20, width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <XIcon size={16} stroke="white" />
          </button>
        </div>
      )}
    </>
  );
}

// Document review modal (with signature + confirmation)

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

function DocReviewModal({ doc, mode, current, onSubmit, onClose }) {
  const status       = mode === "resubmit" ? "RESUBMIT_REQUIRED" : "APPROVED";
  const decisionColor = mode === "resubmit" ? "#d97706" : "#16a34a";
  const decisionLabel = mode === "resubmit" ? "Resubmission Request" : "Approval";

  const [reason,      setReason]      = useState("");
  const [comment,     setComment]     = useState(mode === "approve" ? (current?.comment || "") : "");
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

  const isOther      = reason === "Other";
  const reasonOk     = mode === "approve" || (reason && (reason !== "Other" || comment.trim()));
  const finalComment = mode === "resubmit"
    ? (isOther ? comment.trim() : reason + (comment.trim() ? ` — ${comment.trim()}` : ""))
    : comment.trim();
  const canConfirm   = reasonOk && !!sig;
  const canSave      = canConfirm && !!confirmedAt;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "20px 24px 14px", borderBottom: "1px solid #f3f4f6" }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 2 }}>
            {mode === "resubmit" ? "Request Resubmission" : "Approve Document"}
          </p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>{toTitleCase(doc.doc_type)}</p>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Resubmit: reason picker */}
          {mode === "resubmit" && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 7 }}>Reason <span style={{ color: "#ef4444" }}>*</span></p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {RESUBMIT_REASONS.map(r => (
                  <button key={r} onClick={() => { setReason(r); setComment(""); setConfirmedAt(null); }}
                    style={{ padding: "9px 13px", borderRadius: 8, border: `1.5px solid ${reason === r ? "#fcd34d" : "#e2e8f0"}`, background: reason === r ? "#fffbeb" : "white", cursor: "pointer", fontSize: 12, fontWeight: reason === r ? 700 : 500, color: reason === r ? "#92400e" : "#374151", fontFamily: "inherit", textAlign: "left" }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comment */}
          {(mode === "approve" || (mode === "resubmit" && (isOther || reason))) && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
                {isOther ? <>Details <span style={{ color: "#ef4444" }}>*</span></> : "Comment (optional)"}
              </label>
              <textarea value={comment} onChange={e => { setComment(e.target.value); setConfirmedAt(null); }}
                placeholder={isOther ? "Describe the issue…" : mode === "approve" ? "Approval note (optional)…" : "Extra context (optional)…"}
                rows={3}
                style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            </div>
          )}

          {/* Signature */}
          {reasonOk && (
            <div style={{ padding: 14, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                <PenIcon size={13} stroke="#374151" />
                <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0 }}>Officer Signature <span style={{ color: "#ef4444" }}>*</span></p>
              </div>
              {loadingSig ? (
                <p style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</p>
              ) : sig && !showSigPad ? (
                <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Signature</p>
                  <img src={sig} alt="Signature" style={{ height: 44, objectFit: "contain", objectPosition: "left", maxWidth: "100%", display: "block" }} />
                  <button onClick={() => { setShowSigPad(true); setConfirmedAt(null); }}
                    style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                    <PenIcon size={9} /> Draw a different signature
                  </button>
                </div>
              ) : (
                <SignaturePad existingSig={sig} onSave={s => { setSig(s); setShowSigPad(false); setConfirmedAt(null); }} onUseExisting={() => setShowSigPad(false)} />
              )}
            </div>
          )}

          {/* Confirmation */}
          {canConfirm && !confirmedAt && (
            <div style={{ padding: "12px 14px", background: `${decisionColor}08`, border: `1.5px solid ${decisionColor}30`, borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, marginBottom: 10 }}>
                I confirm this <strong style={{ color: decisionColor }}>{decisionLabel}</strong> for <strong>{toTitleCase(doc.doc_type)}</strong> is accurate.
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

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button disabled={!canSave} onClick={() => { onSubmit(doc.id, status, finalComment, confirmedAt, doc.doc_type); onClose(); }}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: canSave ? decisionColor : "#94a3b8", color: "white", fontSize: 13, fontWeight: 700, cursor: canSave ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            Save Decision
          </button>
        </div>
      </div>
    </div>
  );
}

// Remove decision modal

function RemoveDecisionModal({ doc, appId, onRemoved, onClose }) {
  const [reason,   setReason]   = useState("");
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await api.delete(`/api/officer/applications/${appId}/documents/${doc.id}/review`, { data: { reason: reason.trim() } });
      onRemoved(doc.id);
      onClose();
    } catch { alert("Failed to remove decision."); }
    finally { setRemoving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: "white", borderRadius: 16, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <TrashIcon size={18} stroke="#dc2626" />
          <p style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0 }}>Remove Decision</p>
        </div>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>{toTitleCase(doc.doc_type)}</p>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
          Reason <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <textarea value={reason} onChange={e => setReason(e.target.value)}
          placeholder="e.g. Decision made in error…" rows={3}
          style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button disabled={!reason.trim() || removing} onClick={handleRemove}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: reason.trim() ? "#dc2626" : "#94a3b8", color: "white", fontSize: 13, fontWeight: 700, cursor: reason.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            {removing ? "Removing…" : "Remove Decision"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Flag note modal

function FlagModal({ doc, current, onSave, onRemove, onClose }) {
  const [note, setNote] = useState(current?.note || "");
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: "white", borderRadius: 16, padding: 24, maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FlagIcon size={14} stroke="#d97706" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#111827", margin: 0 }}>Flag for Review</p>
        </div>
        <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16, paddingLeft: 37 }}>{toTitleCase(doc.doc_type)}</p>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>Note (optional)</label>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="What needs a closer look? e.g. expiry date unclear, photo angle off…"
          rows={3}
          style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {current && (
            <button onClick={() => { onRemove(doc.id); onClose(); }}
              style={{ flex: 1, padding: 10, borderRadius: 8, border: "1.5px solid #fca5a5", background: "white", fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>
              Remove Flag
            </button>
          )}
          <button onClick={onClose}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button onClick={() => { onSave(doc.id, note.trim()); onClose(); }}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#d97706", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {current ? "Update Flag" : "Add Flag"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main export

const REVIEW_META = {
  APPROVED:          { label: "Approved", color: "#15803d", bg: "#dcfce7", cardClass: pStyles.docCardApproved },
  RESUBMIT_REQUIRED: { label: "Resubmit", color: "#854d0e", bg: "#fef9c3", cardClass: pStyles.docCardResubmit },
};

// Previous submissions panel

const REVIEW_STATUS_META = {
  APPROVED:          { label: "Approved",  color: "#15803d", bg: "#dcfce7" },
  RESUBMIT_REQUIRED: { label: "Resubmit",  color: "#854d0e", bg: "#fef9c3" },
  REJECTED:          { label: "Rejected",  color: "#991b1b", bg: "#fee2e2" },
  PENDING:           { label: "Pending",   color: "#6b7280", bg: "#f1f5f9" },
};

function PreviousSubmissions({ prevDocs, appId }) {
  const [open, setOpen] = useState(false);
  if (!prevDocs || prevDocs.length === 0) return null;

  // Group by doc_type, sorted newest version first
  const byType = {};
  for (const d of prevDocs) {
    if (!byType[d.doc_type]) byType[d.doc_type] = [];
    byType[d.doc_type].push(d);
  }
  for (const k of Object.keys(byType)) {
    byType[k].sort((a, b) => b.version - a.version);
  }

  return (
    <div style={{ margin: "0 0 0", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: "100%", padding: "12px 18px", background: "#f8fafc", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ClockIcon size={14} stroke="#6b7280" />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Previous Submissions</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", background: "#f1f5f9", borderRadius: 999, padding: "1px 7px" }}>{prevDocs.length}</span>
        </div>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2.5} strokeLinecap="round">
          <path d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
        </svg>
      </button>

      {open && (
        <div style={{ padding: "16px 18px", background: "white", display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, lineHeight: 1.5 }}>
            These are the documents from earlier submissions. They have been replaced by the applicant's resubmission.
          </p>
          {Object.entries(byType).map(([docType, versions]) => (
            <div key={docType}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                {toTitleCase(docType)}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {versions.map(doc => {
                  const rm = REVIEW_STATUS_META[doc.review_status] || REVIEW_STATUS_META.PENDING;
                  return (
                    <div key={doc.id} style={{ padding: "10px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 9, display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>Version {doc.version}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: rm.color, background: rm.bg, borderRadius: 999, padding: "1px 8px" }}>{rm.label}</span>
                        </div>
                        <p style={{ fontSize: 10, color: "#9ca3af", margin: "0 0 4px" }}>Uploaded {fmtShort(doc.uploaded_at)}</p>
                        {doc.review_comment && (
                          <p style={{ fontSize: 11, color: "#6b7280", margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>"{doc.review_comment}"</p>
                        )}
                        {doc.reviewed_at && (
                          <p style={{ fontSize: 10, color: "#9ca3af", margin: "3px 0 0" }}>Reviewed {fmtShort(doc.reviewed_at)}</p>
                        )}
                        {doc.ai_check_passed !== null && doc.ai_check_passed !== undefined && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: doc.ai_check_passed ? "#15803d" : "#d97706", marginTop: 3, display: "inline-block" }}>
                            {doc.ai_check_passed ? "✓ AI Verified" : "⚠ AI Warning"}{doc.ai_check_score ? ` · ${doc.ai_check_score}%` : ""}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => window.open(`/api/officer/applications/${appId}/documents/${doc.id}/file`, "_blank")}
                        style={{ padding: "5px 10px", borderRadius: 6, border: "1.5px solid #e2e8f0", background: "white", fontSize: 11, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                        <EyeIcon size={11} stroke="#374151" /> View
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// OCR cross-check panel

const OCR_DOC_TYPES = new Set(["national_id_front","national_id_back","existing_licence_front","existing_licence_back"]);

function normName(s) { return (s || "").trim().toLowerCase().replace(/[^a-z\s]/g,""); }
function normDate(s) {
  if (!s) return null;
  const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
  // DD/MM/YYYY or DD-MM-YYYY
  let m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  // YYYY-MM-DD
  m = s.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // DD MMM YYYY
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/i);
  if (m) { const mo = months[m[2].toLowerCase()]; return mo ? `${m[3]}-${String(mo).padStart(2,"0")}-${m[1].padStart(2,"0")}` : null; }
  return null;
}

function OcrRow({ label, ocr, expected, match }) {
  const color  = match === true ? "#15803d" : match === false ? "#dc2626" : "#374151";
  const bg     = match === true ? "#f0fdf4" : match === false ? "#fef2f2" : "#f8fafc";
  const border = match === true ? "#bbf7d0" : match === false ? "#fecaca" : "#e2e8f0";
  const icon   = match === true ? "M5 12l5 5L20 7" : match === false ? "M18 6L6 18M6 6l12 12" : "M12 5v14M5 12h14";
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"7px 10px", background:bg, border:`1px solid ${border}`, borderRadius:7 }}>
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:1 }}>
        <path d={icon} />
      </svg>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:10, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 2px" }}>{label}</p>
        <p style={{ fontSize:11, fontWeight:600, color, margin:0 }}>{ocr || "—"}</p>
        {expected && match === false && (
          <p style={{ fontSize:10, color:"#9ca3af", margin:"2px 0 0" }}>Expected: {expected}</p>
        )}
      </div>
      {match !== null && (
        <span style={{ fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:999, background:match ? "#dcfce7" : "#fee2e2", color:match ? "#15803d" : "#991b1b", flexShrink:0, textTransform:"uppercase", letterSpacing:"0.06em" }}>
          {match ? "Match" : "Mismatch"}
        </span>
      )}
    </div>
  );
}

function OcrPanel({ doc, licence }) {
  const [open, setOpen] = useState(false);
  if (!OCR_DOC_TYPES.has(doc.doc_type)) return null;

  // Prefer the rich fields dict; fall back to legacy flat columns
  const fields     = doc.ocr_fields || {};
  const confidence = doc.ocr_confidence;

  // Normalised licence values for cross-check
  const licenceName  = normName([licence?.firstname, licence?.lastname].filter(Boolean).join(" "));
  const licenceDob   = licence?.date_of_birth ? String(licence.date_of_birth).slice(0,10) : null;
  const licenceTrn   = (licence?.trn || "").replace(/\s/g,"");
  const licenceSex   = (licence?.sex || "").toUpperCase();
  const licenceClass = (licence?.licence_class || "").toUpperCase();
  const licenceExpiry = licence?.expiry_date ? String(licence.expiry_date).slice(0,10) : null;

  // Pick values — prefer ocr_fields, fall back to flat columns
  const ocrName    = fields.name    || doc.ocr_name  || null;
  const ocrDob     = fields.dob     || doc.ocr_dob   || null;
  const ocrTrn     = fields.trn     || doc.ocr_id_number || null;
  const ocrSex     = fields.sex     || null;
  const ocrClass   = fields.licence_class  || null;
  const ocrExpiry  = fields.expiry_date    || null;
  const ocrControl = fields.control_number || null;
  const ocrFirstIssue = fields.first_issue_date || null;
  const ocrNationality = fields.nationality  || null;
  const ocrAddress = fields.address || null;
  const ocrParish  = fields.parish  || null;
  const ocrCollectorate = fields.collectorate || null;

  // Match checks
  const nameMatch  = ocrName   ? normName(ocrName).split(" ").some(w => licenceName.includes(w) && w.length > 2) : null;
  const dobMatch   = ocrDob    ? normDate(ocrDob) === licenceDob : null;
  const trnMatch   = ocrTrn    ? ocrTrn.replace(/\s/g,"") === licenceTrn : null;
  const sexMatch   = ocrSex    ? ocrSex.toUpperCase() === licenceSex : null;
  const classMatch = ocrClass  ? ocrClass.toUpperCase() === licenceClass : null;
  const expiryMatch = ocrExpiry ? normDate(ocrExpiry) === licenceExpiry : null;

  const checks = [nameMatch, dobMatch, trnMatch, sexMatch, classMatch, expiryMatch].filter(v => v !== null);
  const anyMismatch = checks.some(v => v === false);
  const allMatch    = checks.length > 0 && checks.every(v => v === true);
  const confPct     = confidence != null ? Math.round(confidence * 100) : null;

  const stripColor = anyMismatch ? "#dc2626" : allMatch ? "#15803d" : "#d97706";
  const stripBg    = anyMismatch ? "#fef2f2" : allMatch ? "#f0fdf4" : "#fff7ed";
  const stripBdr   = anyMismatch ? "#fecaca" : allMatch ? "#bbf7d0" : "#fed7aa";
  const stripLabel = anyMismatch ? "OCR Mismatch Detected" : allMatch ? "OCR Cross-check Passed" : "OCR Partial";

  const hasAnyField = ocrName || ocrDob || ocrTrn || ocrSex || ocrClass || ocrExpiry || ocrControl ||
                      ocrFirstIssue || ocrNationality || ocrAddress || ocrParish || ocrCollectorate;

  return (
    <div style={{ marginBottom: 6 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:6, padding:"5px 8px", background:stripBg, border:`1px solid ${stripBdr}`, borderRadius:7, cursor:"pointer", fontFamily:"inherit" }}>
        <span style={{ fontSize:10, fontWeight:800, color:stripColor, letterSpacing:"0.05em" }}>{stripLabel}</span>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          {confPct != null && <span style={{ fontSize:10, color:"#9ca3af" }}>Confidence {confPct}%</span>}
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2.5} strokeLinecap="round">
            <path d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
          </svg>
        </div>
      </button>
      {open && (
        <div style={{ display:"flex", flexDirection:"column", gap:4, padding:"8px 0 0" }}>
          {!hasAnyField && (
            <p style={{ fontSize:11, color:"#9ca3af", padding:"4px 8px" }}>OCR ran but could not extract readable fields from this document.</p>
          )}
          {/* Cross-checked fields */}
          {ocrName   && <OcrRow label="Name"          ocr={ocrName}   expected={[licence?.firstname, licence?.lastname].filter(Boolean).join(" ")} match={nameMatch} />}
          {ocrDob    && <OcrRow label="Date of Birth"  ocr={ocrDob}    expected={licenceDob}    match={dobMatch} />}
          {ocrTrn    && <OcrRow label="TRN"            ocr={ocrTrn}    expected={licenceTrn}    match={trnMatch} />}
          {ocrSex    && <OcrRow label="Sex"            ocr={ocrSex}    expected={licenceSex}    match={sexMatch} />}
          {ocrClass  && <OcrRow label="Licence Class"  ocr={ocrClass}  expected={licenceClass}  match={classMatch} />}
          {ocrExpiry && <OcrRow label="Expiry Date"    ocr={ocrExpiry} expected={licenceExpiry} match={expiryMatch} />}
          {/* Info-only fields (no licence record to check against) */}
          {ocrControl     && <OcrRow label="Control Number"  ocr={ocrControl}     expected={null} match={null} />}
          {ocrFirstIssue  && <OcrRow label="First Issue Date" ocr={ocrFirstIssue} expected={null} match={null} />}
          {ocrNationality && <OcrRow label="Nationality"      ocr={ocrNationality} expected={null} match={null} />}
          {ocrParish      && <OcrRow label="Parish"           ocr={ocrParish}      expected={null} match={null} />}
          {ocrAddress     && <OcrRow label="Address"          ocr={ocrAddress}     expected={null} match={null} />}
          {ocrCollectorate && <OcrRow label="Collectorate"    ocr={ocrCollectorate} expected={null} match={null} />}
        </div>
      )}
    </div>
  );
}

export default function StepDocuments({ app, licence, docReviews, onDocReview, onPreview, onRemoveDocReview, onReverifyRequested, onApplicationRejected, onCancelOverride, docFlags, onToggleFlag, verificationFlag, onToggleVerificationFlag, verificationOverridden, isResubmission }) {
  const [reviewingDoc, setReviewingDoc] = useState(null);
  const [removingDoc,  setRemovingDoc]  = useState(null);
  const [flaggingDoc,  setFlaggingDoc]  = useState(null);
  // licence_photo and verification_photo are handled separately; exclude from docs grid.
  // Sort by canonical order so front always precedes back, regardless of upload/db order.
  const DOC_ORDER = ["national_id_front","national_id_back","existing_licence_front","existing_licence_back","passport_photo","police_report","proof_of_address","trustee_letter"];
  const docs = (app.documents || [])
    .filter(d => d.is_current && d.doc_type !== "licence_photo" && d.doc_type !== "verification_photo")
    .sort((a, b) => {
      const ai = DOC_ORDER.indexOf(a.doc_type);
      const bi = DOC_ORDER.indexOf(b.doc_type);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  const reviewedCount = docs.filter(d => docReviews[d.id]).length;
  const flagCount     = Object.keys(docFlags || {}).length;

  return (
    <>
      {reviewingDoc && (
        <DocReviewModal
          doc={reviewingDoc.doc}
          mode={reviewingDoc.mode}
          current={docReviews[reviewingDoc.doc.id]}
          onSubmit={onDocReview}
          onClose={() => setReviewingDoc(null)}
        />
      )}
      {removingDoc && (
        <RemoveDecisionModal
          doc={removingDoc}
          appId={app.id}
          onRemoved={docId => onRemoveDocReview?.(docId)}
          onClose={() => setRemovingDoc(null)}
        />
      )}
      {flaggingDoc && (
        <FlagModal
          doc={flaggingDoc}
          current={(docFlags || {})[flaggingDoc.id]}
          onSave={(docId, note) => onToggleFlag?.(docId, { note, docType: flaggingDoc.doc_type })}
          onRemove={docId => onToggleFlag?.(docId, null)}
          onClose={() => setFlaggingDoc(null)}
        />
      )}

      {/* Live Identity Verification — same card style as docs */}
      <div className={pStyles.stepContent} style={{ marginTop: 0 }}>
        <LivenessPanel
          app={app}
          onReverifyRequested={onReverifyRequested}
          onApplicationRejected={onApplicationRejected}
          onCancelOverride={onCancelOverride}
          verificationFlag={verificationFlag}
          onToggleVerificationFlag={onToggleVerificationFlag}
          verificationOverridden={verificationOverridden}
        />
      </div>

      {/* Documents section */}
      <div className={pStyles.stepContent} style={{ marginTop: 0 }}>
        <div className={pStyles.sectionHead}>
          <FileIcon size={18} stroke="#2563eb" />
          <h2 className={pStyles.sectionTitle}>Submitted Documents</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            {flagCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: "#fff7ed", color: "#d97706", border: "1px solid #fed7aa", display: "flex", alignItems: "center", gap: 4 }}>
                <FlagIcon size={10} stroke="#d97706" /> {flagCount} flagged
              </span>
            )}
            <span className={pStyles.sectionNote}>{reviewedCount}/{docs.length} reviewed</span>
          </div>
        </div>

        {docs.length === 0 ? (
          <div className={pStyles.emptyDocs}>
            <FileIcon size={28} stroke="#d1d5db" />
            <p>No documents uploaded</p>
          </div>
        ) : (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
            {(() => {
              // Group docs by base type (strip _front/_back/_page suffix for grouping)
              const baseType = dt => dt?.replace(/_(front|back|page\d*)$/i, "") ?? dt;
              const groups = [];
              const seen = new Map();
              docs.forEach(doc => {
                const key = baseType(doc.doc_type);
                if (!seen.has(key)) { seen.set(key, []); groups.push({ key, items: seen.get(key) }); }
                seen.get(key).push(doc);
              });

              return groups.map(({ key, items }) => (
                <div key={key}>
                  {items.length > 1 && (
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                      {toTitleCase(key)}
                    </p>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: items.length > 1 ? `repeat(${Math.min(items.length, 2)}, 1fr)` : "1fr 1fr", gap: 16 }}>
                    {items.map(doc => {
                      const review       = docReviews[doc.id];
                      const meta         = review ? REVIEW_META[review.status] : null;
                      const flagged      = (docFlags || {})[doc.id];
                      const isNewUpload  = isResubmission && doc.version > 1;
                      const resubReason  = isNewUpload ? (doc.prev_review_comment || null) : null;

                      return (
                        <div key={doc.id} className={`${pStyles.docCard} ${meta?.cardClass || ""}`}
                          style={{
                            ...(flagged ? { outline: "2px solid #fb923c", outlineOffset: -1 } : {}),
                            ...(isNewUpload && !review ? { outline: "2px solid #f59e0b", outlineOffset: -1 } : {}),
                          }}>
                          {isNewUpload && (
                            <div style={{ margin: "-1px -1px 0", borderBottom: "1px solid #fde047" }}>
                              <div style={{ padding: "5px 12px", background: "linear-gradient(90deg,#fef08a,#fef9c3)", display: "flex", alignItems: "center", gap: 6 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
                                <span style={{ fontSize: 10, fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.07em" }}>Resubmitted — needs review</span>
                              </div>
                              {resubReason && (
                                <div style={{ padding: "5px 12px 7px", background: "#fffbeb", display: "flex", alignItems: "flex-start", gap: 5 }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                  <span style={{ fontSize: 10, color: "#92400e", lineHeight: 1.5, fontStyle: "italic" }}>Reason: &ldquo;{resubReason}&rdquo;</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className={pStyles.docCardHeader}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p className={pStyles.docCardType}>{toTitleCase(doc.doc_type)}</p>
                              <p className={pStyles.docCardSub}>{doc.doc_subtype || "Document"}</p>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                              {flagged && (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "#fff7ed", color: "#d97706", border: "1px solid #fed7aa", display: "flex", alignItems: "center", gap: 3 }}>
                                  <FlagIcon size={9} stroke="#d97706" /> Flagged
                                </span>
                              )}
                              {meta && (
                                <span className={pStyles.docCardBadge} style={{ background: meta.bg, color: meta.color }}>
                                  {meta.label}
                                </span>
                              )}
                            </div>
                          </div>
                          {flagged?.note && (
                            <div style={{ margin: "0 0 8px", padding: "7px 10px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 7, display: "flex", gap: 6, alignItems: "flex-start" }}>
                              <FlagIcon size={11} stroke="#d97706" />
                              <p style={{ fontSize: 11, color: "#92400e", margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>"{flagged.note}"</p>
                            </div>
                          )}
                          <div className={pStyles.docCardBody}>
                            <p className={pStyles.docCardTime}>Uploaded {fmtShort(doc.uploaded_at)}</p>
                            {doc.ai_check_passed !== null && doc.ai_check_passed !== undefined && (
                              <span className={`${pStyles.docCardAi} ${doc.ai_check_passed ? pStyles.docCardAiGood : pStyles.docCardAiWarn}`}>
                                {doc.ai_check_passed ? "✓ AI Verified" : "⚠ AI Warning"}{doc.ai_check_score ? ` · ${doc.ai_check_score}%` : ""}
                              </span>
                            )}
                            {doc.ocr_ran && <OcrPanel doc={doc} licence={licence} />}
                            {review?.comment && <p className={pStyles.docComment}>"{review.comment}"</p>}
                            {review?.status === "APPROVED" && (
                              <p style={{ fontSize: 11, color: "#15803d", fontWeight: 600, margin: "4px 0 6px", display: "flex", alignItems: "center", gap: 4 }}>
                                <CheckIcon size={11} stroke="#15803d" sw={2.5} />
                                Approved · {fmtShort(review.decidedAt)}
                              </p>
                            )}
                            <div className={pStyles.docActions}>
                              <div className={pStyles.docActionsRow}>
                                <button className={`${pStyles.docBtn} ${pStyles.docBtnPreview}`} onClick={() => onPreview(doc)}>
                                  <EyeIcon size={12} stroke="currentColor" /> Preview
                                </button>
                                <button
                                  onClick={() => setFlaggingDoc(doc)}
                                  style={{ padding: "5px 9px", borderRadius: 6, border: `1.5px solid ${flagged ? "#fb923c" : "#e2e8f0"}`, background: flagged ? "#fff7ed" : "white", fontSize: 11, fontWeight: 600, color: flagged ? "#d97706" : "#6b7280", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                                  <FlagIcon size={11} stroke={flagged ? "#d97706" : "#6b7280"} />
                                  {flagged ? "Flagged" : "Flag"}
                                </button>
                                {review && (
                                  <button className={pStyles.docBtn} style={{ color: "#dc2626", borderColor: "#fca5a5" }} onClick={() => setRemovingDoc(doc)}>
                                    <TrashIcon size={11} stroke="#dc2626" /> Remove
                                  </button>
                                )}
                              </div>
                              <div className={pStyles.docActionsRow}>
                                <button className={`${pStyles.docBtn} ${review?.status === "APPROVED" ? pStyles.docBtnApproveActive : pStyles.docBtnApprove}`} onClick={() => setReviewingDoc({ doc, mode: "approve" })}>
                                  <CheckIcon size={11} stroke="currentColor" sw={2.5} /> Approve
                                </button>
                                <button className={`${pStyles.docBtn} ${review?.status === "RESUBMIT_REQUIRED" ? pStyles.docBtnResubmitActive : pStyles.docBtnResubmit}`} onClick={() => setReviewingDoc({ doc, mode: "resubmit" })}>
                                  <RotateIcon size={11} stroke="currentColor" /> Resubmit
                                </button>
                              </div>
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
        )}

        {/* Previous submissions — collapsible */}
        {(app.previous_documents?.length > 0) && (
          <div style={{ padding: "0 24px 20px" }}>
            <PreviousSubmissions prevDocs={app.previous_documents} appId={app.id} />
          </div>
        )}
      </div>
    </>
  );
}


// Decision step — officer picks Approve, Reject, Resubmit, or Return and signs off.
import { useState, useRef, useEffect, useCallback } from "react";
import api from "../../../../services/api";
import pStyles from "../reviewStyles.module.css";

const Ico = ({ d, size = 16, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const CheckCircle = p => <Ico {...p} d={["M22 11.08V12a10 10 0 1 1-5.93-9.14","M22 4L12 14.01l-3-3"]} />;
const ArrowUpIcon = p => <Ico {...p} d="M12 19V5M5 12l7-7 7 7" />;
const XCircle     = p => <Ico {...p} d={["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M15 9l-6 6M9 9l6 6"]} />;
const AlertIcon   = p => <Ico {...p} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"]} />;
const PenIcon     = p => <Ico {...p} d={["M12 20h9","M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"]} />;
const TrashIcon   = p => <Ico {...p} d={["M3 6h18","M19 6l-1 14H6L5 6","M9 6V4h6v2"]} />;
const FlagIcon    = p => <Ico {...p} d={["M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z","M4 22v-7"]} />;

const DECISIONS = [
  { id: "approve",  label: "Approve Application",    desc: "All documents verified. Issue the licence.",      Icon: CheckCircle, iconColor: "#16a34a", iconBg: "#f0fdf4", activeClass: pStyles.decisionCardApproveActive,  commentRequired: false, requiresAllDocs: true },
  { id: "resubmit", label: "Request Resubmission",   desc: "Ask the applicant to re-upload one or more docs.", Icon: AlertIcon,   iconColor: "#d97706", iconBg: "#fffbeb", activeClass: pStyles.decisionCardResubmitActive, commentRequired: true  },
  { id: "escalate", label: "Escalate to Supervisor", desc: "Complex case requiring senior review.",           Icon: ArrowUpIcon, iconColor: "#be185d", iconBg: "#fdf4ff", activeClass: pStyles.decisionCardEscalateActive, commentRequired: true  },
  { id: "reject",   label: "Reject Application",     desc: "Application does not meet requirements.",         Icon: XCircle,     iconColor: "#dc2626", iconBg: "#fef2f2", activeClass: pStyles.decisionCardRejectActive,   commentRequired: true  },
];

function SignaturePad({ onSave, existingSig, onUseExisting }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = useCallback(e => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, []);

  const draw = useCallback(e => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    setIsEmpty(false);
  }, []);

  const stopDraw = useCallback(() => { drawing.current = false; }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const save = async () => {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    setSaving(true);
    try {
      await api.post("/api/officer/profile/signature", { signature_image: dataUrl });
      onSave(dataUrl);
    } catch {
      onSave(dataUrl);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {existingSig && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10 }}>
          <img src={existingSig} alt="Saved signature" style={{ height: 40, objectFit: "contain" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#15803d", marginBottom: 2 }}>Saved signature on file</p>
            <p style={{ fontSize: 10, color: "#6b7280" }}>Use this or draw a new one below</p>
          </div>
          <button onClick={onUseExisting}
            style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "#16a34a", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
            Use saved
          </button>
        </div>
      )}

      <div style={{ position: "relative" }}>
        <canvas ref={canvasRef} width={420} height={110}
          style={{ width: "100%", height: 110, border: "1.5px solid #cbd5e1", borderRadius: 10, background: "#fafbff", cursor: "crosshair", display: "block", touchAction: "none" }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />
        <p style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 12, color: "#cbd5e1", pointerEvents: "none", display: isEmpty ? "block" : "none" }}>
          Draw your signature here
        </p>
        {!isEmpty && (
          <button onClick={clear}
            style={{ position: "absolute", top: 6, right: 6, background: "white", border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 6px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#6b7280", fontFamily: "inherit" }}>
            <TrashIcon size={10} /> Clear
          </button>
        )}
      </div>

      <button onClick={save} disabled={isEmpty || saving}
        style={{ padding: "9px 0", borderRadius: 8, border: "none", background: isEmpty ? "#e2e8f0" : "#1e3a8a", color: "white", fontSize: 13, fontWeight: 700, cursor: isEmpty ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
        {saving ? "Saving…" : "Save & Use This Signature"}
      </button>
    </div>
  );
}

export default function StepDecision({ decision, setDecision, comment, setComment, approveEnabled, docsCount, approvedCount, photoRejected, officerSignature, setOfficerSignature, setDecisionConfirmed, flaggedDocs, hasResubmit, resubmitDocs, itaCleared, itaReference }) {
  const selected      = DECISIONS.find(d => d.id === decision);
  const [showSigPad,  setShowSigPad]  = useState(false);
  const [loadingSig,  setLoadingSig]  = useState(true);
  const [confirmedAt, setConfirmedAt] = useState(null);

  // itaCleared === false means ITA denied — only Reject allowed
  const itaBlocked = itaCleared === false;

  useEffect(() => {
    api.get("/api/officer/profile/signature")
      .then(res => { if (res.data.signature_image) setOfficerSignature(res.data.signature_image); })
      .catch(() => {})
      .finally(() => setLoadingSig(false));
  }, [setOfficerSignature]);

  // Auto-select resubmit when docs require it
  useEffect(() => {
    if (hasResubmit && decision !== "resubmit") {
      setDecision("resubmit");
      setDecisionConfirmed(false);
    }
  }, [hasResubmit]);

  // Auto-select reject + pre-fill comment when ITA blocked
  useEffect(() => {
    if (itaBlocked) {
      if (decision !== "reject") {
        setDecision("reject");
        setDecisionConfirmed(false);
      }
      if (!comment.trim() && itaReference) {
        setComment(`ITA traffic clearance denied. Outstanding violations found. Reference: ${itaReference}.`);
      }
    }
  }, [itaBlocked, itaReference]);

  const handleSig = (dataUrl) => {
    setOfficerSignature(dataUrl);
    setShowSigPad(false);
  };

  const confirmDecision = () => {
    const ts = new Date().toISOString();
    setConfirmedAt(ts);
    setDecisionConfirmed(true);
  };

  const decisionLabel = {
    approve:  "Approval",
    resubmit: "Resubmission Request",
    escalate: "Escalation",
    reject:   "Rejection",
  }[decision] || "Decision";

  const decisionColor = {
    approve:  "#16a34a",
    resubmit: "#d97706",
    escalate: "#be185d",
    reject:   "#dc2626",
  }[decision] || "#374151";

  return (
    <div className={pStyles.stepContent}>
      <div className={pStyles.sectionHead}>
        <AlertIcon size={18} stroke="#2563eb" />
        <h2 className={pStyles.sectionTitle}>Final Decision</h2>
        <span className={pStyles.sectionNote}>This action cannot be undone</span>
      </div>

      {flaggedDocs?.length > 0 && (
        <div style={{ margin: "16px 24px 0", padding: "12px 16px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <FlagIcon size={16} stroke="#d97706" />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 3 }}>
              {flaggedDocs.length} document{flaggedDocs.length !== 1 ? "s" : ""} flagged for review
            </p>
            <p style={{ fontSize: 12, color: "#78350f", lineHeight: 1.5 }}>
              {flaggedDocs.map(t => t?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())).join(", ")} — check your notes before submitting. If escalating, these will be visible to the supervisor.
            </p>
          </div>
        </div>
      )}

      {hasResubmit && (
        <div style={{ margin: "16px 24px 0", padding: "12px 16px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertIcon size={16} stroke="#d97706" />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 3 }}>Resubmission required</p>
            <p style={{ fontSize: 12, color: "#78350f", lineHeight: 1.5 }}>
              {resubmitDocs.map(d => d.doc_type?.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())).join(", ")} — the applicant must re-upload before this application can be approved. Decision locked to Request Resubmission.
            </p>
          </div>
        </div>
      )}

      {itaBlocked && (
        <div style={{ margin: "16px 24px 0", padding: "12px 16px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertIcon size={16} stroke="#dc2626" />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 3 }}>ITA clearance denied — Reject only</p>
            <p style={{ fontSize: 12, color: "#b91c1c", lineHeight: 1.5 }}>
              The Island Traffic Authority found outstanding violations on this applicant's record. Only <strong>Reject</strong> is available. Reference: <span style={{ fontFamily: "monospace" }}>{itaReference}</span>
            </p>
          </div>
        </div>
      )}

      {!approveEnabled && !hasResubmit && !itaBlocked && (
        <div style={{ margin: "16px 24px 0", padding: "12px 16px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertIcon size={16} stroke="#dc2626" />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 3 }}>Approve is not available</p>
            <p style={{ fontSize: 12, color: "#b91c1c" }}>
              {photoRejected
                ? "The licence photo has been rejected. The applicant must resubmit a new photo before this application can be approved."
                : `${approvedCount}/${docsCount} documents approved. All documents must be approved before you can approve this application.`}
            </p>
          </div>
        </div>
      )}

      <div className={pStyles.decisionGrid}>
        {DECISIONS.map(d => {
          const isLocked   = (itaBlocked && d.id !== "reject") || (d.requiresAllDocs && !approveEnabled) || (d.id === "approve" && hasResubmit);
          const isSelected = decision === d.id;
          return (
            <div key={d.id}
              className={`${pStyles.decisionCard} ${isSelected ? d.activeClass : ""} ${isLocked ? pStyles.decisionCardLocked : ""}`}
              onClick={() => { if (isLocked) return; setDecision(d.id); setConfirmedAt(null); setDecisionConfirmed(false); if (!d.commentRequired) setComment(""); }}
              style={{ opacity: isLocked ? 0.45 : 1, cursor: isLocked ? "not-allowed" : "pointer", position: "relative" }}>
              {isLocked && (
                <div style={{ position: "absolute", top: "10px", right: "10px", fontSize: "10px", fontWeight: "700", color: "#9ca3af", background: "#f1f5f9", padding: "2px 8px", borderRadius: "999px" }}>
                  Locked
                </div>
              )}
              <div className={pStyles.decisionIcon} style={{ background: d.iconBg }}>
                <d.Icon size={20} stroke={isLocked ? "#9ca3af" : d.iconColor} />
              </div>
              <p className={pStyles.decisionLabel} style={{ color: isLocked ? "#9ca3af" : "#111827" }}>{d.label}</p>
              <p className={pStyles.decisionDesc}>{d.desc}</p>
            </div>
          );
        })}
      </div>

      {decision && (
        <div className={pStyles.commentBox}>
          <label className={pStyles.commentLabel}>
            {selected?.commentRequired
              ? <>Officer Comment <span className={pStyles.commentRequired}>*</span> — applicant will see this</>
              : "Officer Comment (optional)"}
          </label>
          <textarea className={pStyles.commentTextarea} value={comment} onChange={e => { setComment(e.target.value); setConfirmedAt(null); setDecisionConfirmed(false); }}
            placeholder={
              decision === "approve"  ? "Add any notes for the record (optional)…" :
              decision === "resubmit" ? "Explain exactly what needs to be fixed or resubmitted…" :
              decision === "escalate" ? "Explain why this case requires supervisor review…" :
              "Explain the reason for rejection…"
            }
            rows={4}
          />
          {selected?.commentRequired && !comment.trim() && (
            <p style={{ fontSize: "11px", color: "#ef4444", marginTop: "6px" }}>A comment is required for this decision.</p>
          )}
        </div>
      )}

      {/* Officer Signature + Confirmation */}
      {decision && (
        <div style={{ margin: "0 24px 24px", padding: "20px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <PenIcon size={16} stroke="#374151" />
            <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Officer Signature &amp; Confirmation</p>
          </div>

          {loadingSig ? (
            <p style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</p>
          ) : officerSignature && !showSigPad ? (
            <div>
              <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Officer Signature</p>
                <img src={officerSignature} alt="Officer signature"
                  style={{ display: "block", height: 56, objectFit: "contain", objectPosition: "left", maxWidth: "100%" }} />
                <button onClick={() => { setShowSigPad(true); setConfirmedAt(null); }}
                  style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <PenIcon size={10} /> Draw a different signature
                </button>
              </div>

              {!confirmedAt ? (
                <div style={{ background: "white", border: `1.5px solid ${decisionColor}22`, borderRadius: 10, padding: "14px 16px" }}>
                  <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, marginBottom: 12 }}>
                    By confirming, I <strong>Officer</strong> certify that this <strong style={{ color: decisionColor }}>{decisionLabel}</strong> decision is accurate and made in accordance with DLRSJAM policy.
                  </p>
                  <button onClick={confirmDecision}
                    disabled={!!(selected?.commentRequired && !comment.trim())}
                    style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "none", background: (selected?.commentRequired && !comment.trim()) ? "#e2e8f0" : decisionColor, color: (selected?.commentRequired && !comment.trim()) ? "#9ca3af" : "white", fontSize: 13, fontWeight: 700, cursor: (selected?.commentRequired && !comment.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                    Confirm {decisionLabel}
                  </button>
                </div>
              ) : (
                <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle size={18} stroke="#16a34a" />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#15803d" }}>Decision confirmed</p>
                    <p style={{ fontSize: 11, color: "#6b7280" }}>{new Date(confirmedAt.endsWith("Z") ? confirmedAt : confirmedAt + "Z").toLocaleString("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Jamaica" })}</p>
                  </div>
                  <button onClick={() => { setConfirmedAt(null); setDecisionConfirmed(false); }}
                    style={{ marginLeft: "auto", fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    Undo
                  </button>
                </div>
              )}
            </div>
          ) : (
            <SignaturePad
              existingSig={officerSignature}
              onSave={handleSig}
              onUseExisting={() => setShowSigPad(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

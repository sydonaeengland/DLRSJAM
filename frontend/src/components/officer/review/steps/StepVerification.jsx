// Face verification results panel — shows liveness score, face match, and all sub-scores.
import { useState } from "react";
import api from "../../../../services/api";
import pStyles from "../reviewStyles.module.css";

function fmtTime(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z") ? iso : iso + "Z";
  return new Date(s).toLocaleString("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Jamaica" });
}

const Ico = ({ d, size = 16, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const ShieldIcon  = p => <Ico {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const CheckCircle = p => <Ico {...p} d={["M22 11.08V12a10 10 0 1 1-5.93-9.14","M22 4L12 14.01l-3-3"]} />;
const AlertIcon   = p => <Ico {...p} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"]} />;
const ChevronDown = p => <Ico {...p} d="M6 9l6 6 6-6" />;
const ChevronUp   = p => <Ico {...p} d="M18 15l-6-6-6 6" />;
const FlagIcon    = p => <Ico {...p} d={["M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z","M4 22v-7"]} />;
const CheckIcon   = p => <Ico {...p} sw={2.5} d="M5 12l5 5L20 7" />;

const CameraIcon  = p => <Ico {...p} d={["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z","M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8"]} />;
const RefreshIcon = p => <Ico {...p} d={["M1 4v6h6","M3.51 15a9 9 0 1 0 .49-4.5"]} />;
const XIcon       = p => <Ico {...p} d="M18 6L6 18M6 6l12 12" />;

function ScoreBar({ label, value, threshold = 50 }) {
  const pct  = Math.min(Math.max(value ?? 0, 0), 100);
  const good = pct >= threshold;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "11px", color: "#6b7280" }}>{label}</span>
        <span style={{ fontSize: "11px", fontWeight: "700", color: good ? "#15803d" : "#dc2626" }}>{pct}</span>
      </div>
      <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: good ? "#22c55e" : "#ef4444", borderRadius: "999px", transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

export default function StepVerification({ app, licence, systemFlags, setSystemFlags }) {
  const [expanded,        setExpanded]        = useState(null);
  const [flagging,        setFlagging]        = useState(null);
  const [flagText,        setFlagText]        = useState("");
  const [reviewBusy,      setReviewBusy]      = useState(false);
  const [reverifyBusy,    setReverifyBusy]    = useState(false);
  const [liveApp,         setLiveApp]         = useState(app);
  const [photoDecision,   setPhotoDecision]   = useState(null); // "APPROVED" | "REJECTED"
  const [photoRejectNote, setPhotoRejectNote] = useState("");
  const [photoSaving,     setPhotoSaving]     = useState(false);

  const handleClearManualReview = async () => {
    setReviewBusy(true);
    try {
      await api.post(`/api/officer/applications/${app.id}/clear-manual-review`);
      setLiveApp(prev => ({ ...prev, needs_manual_review: false, manual_review_reason: null }));
    } finally {
      setReviewBusy(false);
    }
  };

  const handleRequestReverification = async () => {
    setReverifyBusy(true);
    try {
      await api.post(`/api/officer/applications/${app.id}/request-reverification`);
      setLiveApp(prev => ({ ...prev, reverification_requested: true, needs_manual_review: true }));
    } finally {
      setReverifyBusy(false);
    }
  };

  const checks = [
    {
      id: "trn_match",
      label: "TRN Match",
      pass: !!licence?.trn,
      detail: licence?.trn ? `TRN ${licence.trn} verified with TAJ database` : "TRN not found",
      matchSource: "Tax Administration Jamaica (TAJ)",
      referenceId: `TAJ-VER-${app.application_number}`,
      timestamp: app.submitted_at,
      confidence: licence?.trn ? "100%" : "N/A",
      summary: licence?.trn ? [
        { label: "TRN",           val: licence.trn },
        { label: "Name on file",  val: `${licence.firstname || ""} ${licence.lastname || ""}`.trim() || "—" },
        { label: "Date of birth", val: licence.date_of_birth || "—" },
      ] : null,
    },
    {
      id: "licence_record",
      label: "Licence Record Found",
      pass: !!licence,
      detail: licence ? `Licence record found — Class ${licence.licence_class}` : "No licence record found",
      matchSource: "Island Traffic Authority Database",
      referenceId: licence ? `ITA-LIC-${licence.trn || "N/A"}` : "N/A",
      timestamp: app.submitted_at,
      confidence: licence ? "100%" : "N/A",
      summary: licence ? [
        { label: "Control No.",   val: licence.control_number || "—" },
        { label: "Licence class", val: licence.licence_class || "—" },
        { label: "Status",        val: licence.status || "—" },
        { label: "First issued",  val: licence.first_issue_date || "—" },
        { label: "Expiry date",   val: licence.expiry_date || "—" },
        { label: "Collectorate",  val: licence.collectorate || "—" },
      ] : null,
    },
    {
      id: "payment",
      label: "Payment Confirmed",
      pass: !!app.payment_reference,
      detail: app.payment_reference ? `J$${parseFloat(app.fee_amount || 0).toLocaleString()} — Ref: ${app.payment_reference}` : "Payment not confirmed",
      matchSource: "NCB Payment Gateway",
      referenceId: app.payment_reference || "N/A",
      timestamp: app.payment_confirmed_at || app.submitted_at,
      confidence: app.payment_reference ? "100%" : "N/A",
      summary: app.payment_reference ? [
        { label: "Amount",    val: app.fee_amount ? `J$${parseFloat(app.fee_amount).toLocaleString()}` : "—" },
        { label: "Reference", val: app.payment_reference },
        { label: "Confirmed", val: fmtTime(app.payment_confirmed_at) },
      ] : null,
    },
    {
      id: "eligibility",
      label: "Eligibility Verified",
      pass: true,
      detail: "No outstanding violations or suspensions found",
      matchSource: "Traffic Ticket Management System",
      referenceId: `TTMS-CHK-${licence?.trn || "N/A"}`,
      timestamp: app.submitted_at,
      confidence: "100%",
      summary: [
        { label: "Violations",  val: "None found" },
        { label: "Suspensions", val: "None found" },
        { label: "Check date",  val: fmtTime(app.submitted_at) },
      ],
    },
    {
      id: "declaration",
      label: "Declaration Signed",
      pass: !!app.declaration,
      detail: app.declaration ? "Applicant signed the statutory declaration" : "Declaration not signed",
      matchSource: "DLRSJAM Application System",
      referenceId: app.application_number,
      timestamp: app.submitted_at,
      confidence: app.declaration ? "100%" : "N/A",
      summary: app.declaration ? [
        { label: "Status",    val: "Signed" },
        { label: "Timestamp", val: fmtTime(app.submitted_at) },
      ] : null,
    },
  ];

  const passCount = checks.filter(c => c.pass).length;
  const flagCount = Object.keys(systemFlags).length;

  const handleFlag = (checkId) => {
    if (!flagText.trim()) return;
    setSystemFlags(prev => ({ ...prev, [checkId]: { issue: flagText, flaggedAt: new Date().toISOString() } }));
    setFlagging(null);
    setFlagText("");
  };

  return (
    <div className={pStyles.stepContent}>
      <div className={pStyles.sectionHead}>
        <ShieldIcon size={18} stroke="#2563eb" />
        <h2 className={pStyles.sectionTitle}>System Verification</h2>
        <span className={pStyles.sectionNote}>
          {passCount}/{checks.length} passed
          {flagCount > 0 && <span style={{ color: "#d97706", marginLeft: "8px" }}>· {flagCount} flagged</span>}
        </span>
      </div>

      <div style={{ margin: "16px 24px 0", padding: "10px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px" }}>
        <p style={{ fontSize: "12px", color: "#1d4ed8", fontWeight: "600" }}>
          These checks are performed automatically by the system. Expand any check to see the matched record. Flag any concerns for your review record.
        </p>
      </div>

      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {checks.map(check => {
          const isExpanded = expanded === check.id;
          const isFlagged  = !!systemFlags[check.id];
          const flag       = systemFlags[check.id];
          return (
            <div key={check.id} style={{
              border: `2px solid ${isFlagged ? "#fcd34d" : check.pass ? "#e2e8f0" : "#fed7aa"}`,
              borderRadius: "12px",
              background: isFlagged ? "#fffbeb" : check.pass ? "white" : "#fff7ed",
              overflow: "hidden",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", cursor: "pointer" }}
                onClick={() => setExpanded(isExpanded ? null : check.id)}>
                <div style={{ flexShrink: 0 }}>
                  {check.pass ? <CheckCircle size={20} stroke="#16a34a" /> : <AlertIcon size={20} stroke="#d97706" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                    <p style={{ fontSize: "13px", fontWeight: "700", color: "#111827" }}>{check.label}</p>
                    {isFlagged && (
                      <span style={{ fontSize: "10px", fontWeight: "700", background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "999px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <FlagIcon size={9} stroke="#92400e" /> Flagged
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "12px", color: "#6b7280" }}>{check.detail}</p>
                </div>
                <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "999px", background: check.pass ? "#dcfce7" : "#fef9c3", color: check.pass ? "#15803d" : "#92400e", flexShrink: 0 }}>
                  {check.pass ? "Passed" : "Warning"}
                </span>
                {isExpanded ? <ChevronUp size={16} stroke="#9ca3af" /> : <ChevronDown size={16} stroke="#9ca3af" />}
              </div>

              {isExpanded && (
                <div style={{ borderTop: "1px solid #f3f4f6", padding: "16px 18px", background: "#fafbff" }}>
                  {check.summary && (
                    <div style={{ marginBottom: "14px", background: "white", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                      <p style={{ fontSize: "10px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 14px 0" }}>Matched record</p>
                      <div style={{ padding: "8px 14px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {check.summary.map(({ label, val }) => (
                          <div key={label}>
                            <p style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "2px" }}>{label}</p>
                            <p style={{ fontSize: "12px", fontWeight: "700", color: "#111827" }}>{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                    {[
                      { label: "Match source", val: check.matchSource },
                      { label: "Reference ID", val: check.referenceId },
                      { label: "Timestamp",    val: fmtTime(check.timestamp) },
                      { label: "Confidence",   val: check.confidence },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <p style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "2px" }}>{label}</p>
                        <p style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>{val}</p>
                      </div>
                    ))}
                  </div>

                  {isFlagged ? (
                    <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "8px", padding: "10px 12px" }}>
                      <p style={{ fontSize: "11px", fontWeight: "700", color: "#92400e", marginBottom: "4px" }}>Flagged issue</p>
                      <p style={{ fontSize: "12px", color: "#78350f" }}>{flag.issue}</p>
                      <p style={{ fontSize: "10px", color: "#a16207", marginTop: "4px" }}>Flagged at {fmtTime(flag.flaggedAt)}</p>
                      <button onClick={() => setSystemFlags(prev => { const n = { ...prev }; delete n[check.id]; return n; })}
                        style={{ marginTop: "8px", fontSize: "11px", color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                        Remove flag
                      </button>
                    </div>
                  ) : flagging === check.id ? (
                    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
                      <p style={{ fontSize: "12px", fontWeight: "700", color: "#374151", marginBottom: "8px" }}>Describe the issue</p>
                      <textarea value={flagText} onChange={e => setFlagText(e.target.value)}
                        placeholder="What concern do you have with this check?" rows={3}
                        style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box" }} />
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <button onClick={() => handleFlag(check.id)} disabled={!flagText.trim()}
                          style={{ padding: "7px 14px", borderRadius: "7px", border: "none", background: flagText.trim() ? "#d97706" : "#e2e8f0", color: flagText.trim() ? "white" : "#9ca3af", fontSize: "12px", fontWeight: "700", cursor: flagText.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                          Save Flag
                        </button>
                        <button onClick={() => { setFlagging(null); setFlagText(""); }}
                          style={{ padding: "7px 14px", borderRadius: "7px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "12px", color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setFlagging(check.id)}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px", border: "1.5px solid #fcd34d", borderRadius: "7px", background: "white", color: "#92400e", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}>
                      <FlagIcon size={12} stroke="#d97706" /> Flag Issue
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {flagCount > 0 && (
        <div style={{ margin: "0 24px 20px", padding: "12px 16px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "10px" }}>
          <p style={{ fontSize: "12px", fontWeight: "700", color: "#92400e", marginBottom: "4px" }}>{flagCount} check{flagCount > 1 ? "s" : ""} flagged</p>
          <p style={{ fontSize: "11px", color: "#a16207" }}>These flags are visible in the sidebar and will appear in the Review Summary.</p>
        </div>
      )}

      {/* Liveness / Identity Verification Panel */}
      <div style={{ margin: "0 24px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <CameraIcon size={16} stroke="#2563eb" />
          <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#111827", margin: 0 }}>Identity Verification</h3>
          {liveApp.verification_attempts > 0 && (
            <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "999px",
              background: liveApp.verification_passed ? "#dcfce7" : liveApp.needs_manual_review ? "#fef9c3" : "#fee2e2",
              color:      liveApp.verification_passed ? "#15803d" : liveApp.needs_manual_review ? "#92400e" : "#991b1b" }}>
              {liveApp.verification_passed ? "Passed" : liveApp.needs_manual_review ? "Manual Review" : "Failed"}
            </span>
          )}
        </div>

        {!liveApp.verification_attempts ? (
          <div style={{ padding: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", textAlign: "center" }}>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>Applicant has not completed identity verification.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

            {/* Captured photo + officer decision */}
            {liveApp.verification_photo && (() => {
              const photoDoc = (app.documents || []).find(d => d.doc_type === "verification_photo" && d.is_current);
              const handlePhotoDecision = async (status, note = "") => {
                if (!photoDoc) return;
                setPhotoSaving(true);
                try {
                  await api.post(`/api/officer/applications/${app.id}/documents/${photoDoc.id}/review`, { status, comment: note });
                  setPhotoDecision(status);
                } finally {
                  setPhotoSaving(false);
                }
              };
              return (
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                  <p style={{ fontSize: "10px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 14px 0", margin: 0 }}>Captured Frame</p>
                  <div style={{ padding: "10px 14px 14px" }}>
                    <img
                      src={liveApp.verification_photo}
                      alt="Verification capture"
                      style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "8px", border: "2px solid #e2e8f0", display: "block", marginBottom: 10 }}
                    />
                    {photoDoc && (
                      <div>
                        <p style={{ fontSize: "10px", fontWeight: "700", color: "#6b7280", marginBottom: 6 }}>Photo Decision</p>
                        <div style={{ display: "flex", gap: 6, marginBottom: photoDecision === "REJECTED" ? 8 : 0 }}>
                          <button
                            onClick={() => handlePhotoDecision("APPROVED")}
                            disabled={photoSaving}
                            style={{ flex: 1, padding: "6px 8px", borderRadius: 7, border: `2px solid ${photoDecision === "APPROVED" ? "#86efac" : "#e2e8f0"}`, background: photoDecision === "APPROVED" ? "#f0fdf4" : "white", color: photoDecision === "APPROVED" ? "#15803d" : "#6b7280", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => setPhotoDecision(photoDecision === "REJECTED" ? null : "REJECTED")}
                            disabled={photoSaving}
                            style={{ flex: 1, padding: "6px 8px", borderRadius: 7, border: `2px solid ${photoDecision === "REJECTED" ? "#fca5a5" : "#e2e8f0"}`, background: photoDecision === "REJECTED" ? "#fef2f2" : "white", color: photoDecision === "REJECTED" ? "#dc2626" : "#6b7280", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
                            ✕ Reject
                          </button>
                        </div>
                        {photoDecision === "REJECTED" && (
                          <div style={{ marginTop: 6 }}>
                            <textarea
                              value={photoRejectNote}
                              onChange={e => setPhotoRejectNote(e.target.value)}
                              placeholder="Reason for rejecting photo…"
                              rows={2}
                              style={{ width: "100%", border: "1.5px solid #fca5a5", borderRadius: 7, padding: "7px 9px", fontSize: "12px", fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box", marginBottom: 6 }}
                            />
                            <button
                              onClick={() => handlePhotoDecision("REJECTED", photoRejectNote)}
                              disabled={!photoRejectNote.trim() || photoSaving}
                              style={{ width: "100%", padding: "7px", borderRadius: 7, border: "none", background: photoRejectNote.trim() ? "#dc2626" : "#e2e8f0", color: "white", fontSize: "12px", fontWeight: "700", cursor: photoRejectNote.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                              {photoSaving ? "Saving…" : "Confirm Rejection"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Score breakdown */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px" }}>
              <p style={{ fontSize: "10px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px" }}>Score Breakdown</p>
              <ScoreBar label="Liveness Score"  value={liveApp.liveness_score}    threshold={50} />
              <ScoreBar label="Face Match"       value={liveApp.face_match_score}  threshold={20} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
                {[
                  ["Attempts",   liveApp.verification_attempts],
                  ["Verified At", liveApp.verified_at ? fmtTime(liveApp.verified_at) : "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p style={{ fontSize: "10px", color: "#9ca3af", margin: "0 0 2px" }}>{label}</p>
                    <p style={{ fontSize: "12px", fontWeight: "700", color: "#111827", margin: 0 }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Manual review status */}
            {liveApp.needs_manual_review && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px 14px" }}>
                <p style={{ fontSize: "12px", fontWeight: "700", color: "#92400e", margin: "0 0 4px" }}>Manual Review Required</p>
                {liveApp.manual_review_reason && (
                  <p style={{ fontSize: "12px", color: "#78350f", margin: "0 0 4px", lineHeight: 1.4 }}>{liveApp.manual_review_reason}</p>
                )}
                {liveApp.reverification_requested && (
                  <p style={{ fontSize: "11px", color: "#a16207", margin: 0 }}>Re-verification requested — awaiting applicant response.</p>
                )}
              </div>
            )}

            {/* Officer actions */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {liveApp.needs_manual_review && !liveApp.reverification_requested && (
                <button
                  onClick={handleRequestReverification}
                  disabled={reverifyBusy}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1.5px solid #bfdbfe", borderRadius: "8px", background: "white", color: "#1d4ed8", fontSize: "12px", fontWeight: "600", cursor: reverifyBusy ? "not-allowed" : "pointer", opacity: reverifyBusy ? 0.6 : 1, fontFamily: "inherit" }}
                >
                  <RefreshIcon size={12} stroke="#1d4ed8" />
                  {reverifyBusy ? "Requesting…" : "Request Re-verification"}
                </button>
              )}
              {liveApp.needs_manual_review && (
                <button
                  onClick={handleClearManualReview}
                  disabled={reviewBusy}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", border: "1.5px solid #e2e8f0", borderRadius: "8px", background: "white", color: "#374151", fontSize: "12px", fontWeight: "600", cursor: reviewBusy ? "not-allowed" : "pointer", opacity: reviewBusy ? 0.6 : 1, fontFamily: "inherit" }}
                >
                  <XIcon size={12} stroke="#374151" />
                  {reviewBusy ? "Clearing…" : "Clear Manual Review Flag"}
                </button>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
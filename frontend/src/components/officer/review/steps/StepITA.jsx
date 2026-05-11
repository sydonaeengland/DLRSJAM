// ITA (Island Traffic Authority) correspondence step for replacement applications.
import { useState, useEffect, useRef } from "react";
import api from "../../../../services/api";
import pStyles from "../reviewStyles.module.css";

const Ico = ({ d, size = 16, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const MailIcon     = p => <Ico {...p} d={["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z","M22 6l-10 7L2 6"]} />;
const SendIcon     = p => <Ico {...p} d={["M22 2L11 13","M22 2L15 22 11 13 2 9l20-7z"]} />;
const CheckCircle  = p => <Ico {...p} d={["M22 11.08V12a10 10 0 1 1-5.93-9.14","M22 4L12 14.01l-3-3"]} />;
const AlertTriangle= p => <Ico {...p} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"]} />;
const InboxIcon    = p => <Ico {...p} d={["M22 12h-6l-2 3H10l-2-3H2","M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"]} />;
const ShieldIcon   = p => <Ico {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;

function EmailCard({ from, to, subject, body, accent, headerBg, headerText, tag, tagColor, tagBg }) {
  return (
    <div style={{
      border: `1.5px solid ${accent}`,
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: `0 2px 12px ${accent}22`,
    }}>
      {/* Email header strip */}
      <div style={{ background: headerBg, padding: "12px 16px", borderBottom: `1px solid ${accent}33` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MailIcon size={14} stroke="white" />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: headerText, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Email Message
            </span>
          </div>
          {tag && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: tagBg, color: tagColor, border: `1px solid ${tagColor}33` }}>
              {tag}
            </span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: "3px 8px", fontSize: 11 }}>
          <span style={{ color: headerText, opacity: 0.6, fontWeight: 600 }}>From</span>
          <span style={{ color: headerText, fontWeight: 700, fontFamily: "monospace", fontSize: 10 }}>{from}</span>
          <span style={{ color: headerText, opacity: 0.6, fontWeight: 600 }}>To</span>
          <span style={{ color: headerText, fontWeight: 700, fontFamily: "monospace", fontSize: 10 }}>{to}</span>
          <span style={{ color: headerText, opacity: 0.6, fontWeight: 600 }}>Subject</span>
          <span style={{ color: headerText, fontWeight: 600, fontSize: 11 }}>{subject}</span>
        </div>
      </div>

      {/* Email body */}
      <div style={{ background: "white", padding: "16px 18px" }}>
        <pre style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 12,
          color: "#374151",
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          margin: 0,
        }}>{body}</pre>
      </div>
    </div>
  );
}

export default function StepITA({ app, applicant, licence, officer, onITAComplete }) {
  const WAIT_SECONDS = 35;

  const [sending,   setSending]   = useState(false);
  const [waiting,   setWaiting]   = useState(false);
  const [countdown, setCountdown] = useState(WAIT_SECONDS);
  const [sent,      setSent]      = useState(!!app.ita_reference);
  const [sentAt,    setSentAt]    = useState(app.ita_request_sent_at || null);
  const [result,    setResult]    = useState(
    app.ita_reference
      ? { ita_cleared: app.ita_outcome === "CLEARED", ita_reference: app.ita_reference, ita_outcome: app.ita_outcome }
      : null
  );
  const [outEmail,  setOutEmail]  = useState(null);
  const [resEmail,  setResEmail]  = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCountdown = (onDone) => {
    setCountdown(WAIT_SECONDS);
    setWaiting(true);
    let remaining = WAIT_SECONDS;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setWaiting(false);
        onDone();
      }
    }, 1000);
  };

  const cleared = result?.ita_cleared;

  const officerName  = officer ? `${officer.firstname} ${officer.lastname}` : "Officer";
  const officerEmail = officer?.work_email || "officer@taj.gov.jm";
  const staffId      = officer?.staff_id   || "—";

  const applicantName  = applicant ? `${applicant.firstname} ${applicant.lastname}` : "—";
  const trn            = licence?.trn            || "—";
  const licenceNumber  = licence?.control_number  || "—";
  const collectorate   = app.pickup_collectorate?.split("(")[0]?.trim() || "—";
  const submittedDate  = app.submitted_at
    ? new Date(app.submitted_at.endsWith("Z") ? app.submitted_at : app.submitted_at + "Z")
        .toLocaleDateString("en-JM", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Jamaica" })
    : "—";
  const reason = app.replacement_reason
    ? app.replacement_reason.charAt(0).toUpperCase() + app.replacement_reason.slice(1).toLowerCase()
    : "Replacement";

  const outgoingBody = [
    `Dear Island Traffic Authority,`,
    ``,
    `I am writing to request a traffic clearance certificate for the following applicant in connection with a ${reason.toLowerCase()} driver's licence replacement application submitted through the DLRSJAM system.`,
    ``,
    `Application Reference: ${app.application_number}`,
    `Applicant Name:        ${applicantName}`,
    `TRN:                   ${trn}`,
    `Licence Number:        ${licenceNumber}`,
    `Replacement Reason:    ${reason}`,
    `Date of Application:   ${submittedDate}`,
    `Collectorate:          ${collectorate}`,
    ``,
    `Please confirm whether this applicant has any outstanding traffic violations, fines, or suspensions that would preclude the issuance of a replacement driver's licence.`,
    ``,
    `This request is made under the authority of the Road Traffic Act 2018.`,
    ``,
    `Regards,`,
    `${officerName} | Staff ID: ${staffId}`,
    `TAJ Driver's Licence Unit`,
    `Tax Administration Jamaica`,
  ].join("\n");

  const handleSend = async () => {
    setSending(true);
    const now = new Date().toISOString();
    setSentAt(now);
    try {
      await api.post(`/api/officer/applications/${app.id}/ita-request`);
      await new Promise(r => setTimeout(r, 800));
      setSending(false);
      setSent(true);

      startCountdown(async () => {
        try {
          const res = await api.post(`/api/officer/applications/${app.id}/ita-resolve`);
          const d   = res.data;
          setResult(d);
          setResEmail(d.response_email);
          onITAComplete(d.ita_cleared, d.ita_reference, d.ita_outcome);
        } catch (e) {
          alert(e.response?.data?.error || "Failed to receive ITA response.");
        }
      });
    } catch (e) {
      setSending(false);
      setSent(false);
      alert(e.response?.data?.error || "Failed to send ITA request.");
    }
  };

  const fmtTime = iso => {
    if (!iso) return "";
    const s = iso.endsWith("Z") ? iso : iso + "Z";
    return new Date(s).toLocaleString("en-JM", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "America/Jamaica",
    });
  };

  return (
    <div className={pStyles.stepContent}>

      {/* Header */}
      <div className={pStyles.sectionHead}>
        <ShieldIcon size={18} stroke="#7c3aed" />
        <h2 className={pStyles.sectionTitle}>ITA Traffic Clearance</h2>
        <span className={pStyles.sectionNote}>Required for all replacement applications</span>
      </div>

      {/* Policy explainer */}
      <div style={{ margin: "0 24px 20px", padding: "14px 16px", background: "#faf5ff", border: "1.5px solid #e9d5ff", borderRadius: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
          <ShieldIcon size={15} stroke="#7c3aed" />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#5b21b6", marginBottom: 4 }}>ITA Verification Required</p>
          <p style={{ fontSize: 12, color: "#6d28d9", lineHeight: 1.6 }}>
            Before processing this replacement, TAJ must confirm with the Island Traffic Authority that the applicant
            has no outstanding traffic violations. Review the pre-filled email below and click <strong>Send ITA Request</strong> to proceed.
          </p>
        </div>
      </div>

      {/* Outgoing email preview */}
      <div style={{ margin: "0 24px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <SendIcon size={14} stroke="#7c3aed" />
          <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Outgoing Request
          </p>
          {sent && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#dcfce7", color: "#15803d", border: "1px solid #86efac", marginLeft: "auto" }}>
              ✓ Sent {fmtTime(sentAt)}
            </span>
          )}
        </div>
        <EmailCard
          from={officerEmail}
          to="ita@ita.gov.jm"
          subject={`Traffic Clearance Request — ${app.application_number}`}
          body={outgoingBody}
          accent="#7c3aed"
          headerBg="#faf5ff"
          headerText="#5b21b6"
          tag="Outgoing"
          tagColor="#7c3aed"
          tagBg="#ede9fe"
        />
      </div>

      {/* Send button / waiting state / sent confirmation */}
      {!sent ? (
        <div style={{ margin: "0 24px 24px" }}>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 10,
              border: "none",
              background: sending ? "#a78bfa" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: sending ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: sending ? "none" : "0 4px 14px #7c3aed44",
              transition: "all 0.2s",
            }}>
            {sending ? (
              <>
                <span style={{ width: 16, height: 16, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                Sending to ita@ita.gov.jm…
              </>
            ) : (
              <>
                <SendIcon size={15} stroke="white" sw={2.5} />
                Send ITA Request
              </>
            )}
          </button>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : waiting ? (
        <div style={{ margin: "0 24px 24px" }}>
          <div style={{ padding: "18px 20px", background: "#faf5ff", border: "1.5px solid #c4b5fd", borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MailIcon size={16} stroke="#7c3aed" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#5b21b6" }}>Email sent — awaiting ITA response</p>
                <p style={{ fontSize: 11, color: "#7c3aed" }}>Sent at {fmtTime(sentAt)}</p>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "center" }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: "#7c3aed", lineHeight: 1, fontFamily: "monospace" }}>{countdown}</p>
                <p style={{ fontSize: 9, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.06em" }}>seconds</p>
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ height: 6, background: "#ede9fe", borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
                width: `${((WAIT_SECONDS - countdown) / WAIT_SECONDS) * 100}%`,
                transition: "width 1s linear",
              }} />
            </div>
            <p style={{ fontSize: 11, color: "#8b5cf6", marginTop: 10, lineHeight: 1.5 }}>
              You can navigate away — you'll be notified when the response arrives.
            </p>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div style={{ margin: "0 24px 24px", padding: "12px 16px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <CheckCircle size={18} stroke="#16a34a" />
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#15803d" }}>Email sent to ita@ita.gov.jm</p>
            <p style={{ fontSize: 11, color: "#6b7280" }}>Sent at {fmtTime(sentAt)}</p>
          </div>
        </div>
      )}

      {/* ITA Response */}
      {sent && result && (
        <div style={{ margin: "0 24px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <InboxIcon size={14} stroke={cleared ? "#16a34a" : "#dc2626"} />
            <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              ITA Response Received
            </p>
          </div>

          <EmailCard
            from="clearance@ita.gov.jm"
            to={officerEmail}
            subject={`RE: Traffic Clearance Request — ${app.application_number}`}
            body={
              cleared
                ? [
                    `Dear Officer,`,
                    ``,
                    `We have reviewed our records for the above-referenced applicant.`,
                    ``,
                    `CLEARANCE STATUS: CLEARED`,
                    ``,
                    `No outstanding traffic violations, fines, or suspensions were found. This applicant is cleared for licence replacement.`,
                    ``,
                    `ITA Reference: ${result.ita_reference}`,
                    ``,
                    `Island Traffic Authority`,
                  ].join("\n")
                : [
                    `Dear Officer,`,
                    ``,
                    `We have reviewed our records for the above-referenced applicant.`,
                    ``,
                    `CLEARANCE STATUS: NOT CLEARED`,
                    ``,
                    `Outstanding traffic violations were found on this applicant's record. This applicant is NOT cleared for licence replacement at this time.`,
                    ``,
                    `ITA Reference: ${result.ita_reference}`,
                    ``,
                    `Island Traffic Authority`,
                  ].join("\n")
            }
            accent={cleared ? "#16a34a" : "#dc2626"}
            headerBg={cleared ? "#f0fdf4" : "#fef2f2"}
            headerText={cleared ? "#14532d" : "#7f1d1d"}
            tag={cleared ? "CLEARED" : "NOT CLEARED"}
            tagColor={cleared ? "#15803d" : "#dc2626"}
            tagBg={cleared ? "#dcfce7" : "#fee2e2"}
          />

          {/* Outcome banner */}
          {cleared ? (
            <div style={{ marginTop: 14, padding: "14px 18px", background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "1.5px solid #86efac", borderRadius: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckCircle size={16} stroke="#15803d" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#14532d", marginBottom: 3 }}>ITA clearance confirmed</p>
                <p style={{ fontSize: 12, color: "#166534", lineHeight: 1.6 }}>
                  Applicant is cleared to proceed. You may now continue with the document review.
                </p>
                <p style={{ fontSize: 11, color: "#15803d", fontWeight: 700, marginTop: 6, fontFamily: "monospace" }}>
                  Ref: {result.ita_reference}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 14, padding: "14px 18px", background: "linear-gradient(135deg, #fef2f2, #fee2e2)", border: "1.5px solid #fca5a5", borderRadius: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#fecaca", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle size={16} stroke="#dc2626" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#7f1d1d", marginBottom: 3 }}>ITA clearance denied</p>
                <p style={{ fontSize: 12, color: "#991b1b", lineHeight: 1.6 }}>
                  Outstanding violations found. Only <strong>Reject</strong> is available in the final decision step. The rejection comment has been pre-filled with the ITA reference.
                </p>
                <p style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, marginTop: 6, fontFamily: "monospace" }}>
                  Ref: {result.ita_reference}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

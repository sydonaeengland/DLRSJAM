// Final review summary before the officer submits their decision.
import pStyles from "../reviewStyles.module.css";

const Ico = ({ d, size = 16, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const CheckCircle = p => <Ico {...p} d={["M22 11.08V12a10 10 0 1 1-5.93-9.14","M22 4L12 14.01l-3-3"]} />;
const AlertCircle = p => <Ico {...p} d={["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M12 8v4","M12 16h.01"]} />;
const ClipIcon    = p => <Ico {...p} d={["M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2","M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"]} />;
const FileIcon    = p => <Ico {...p} d={["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z","M14 2v6h6"]} />;
const UserIcon    = p => <Ico {...p} d={["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0-4 4v2","M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"]} />;
const ShieldIcon  = p => <Ico {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const MapPinIcon  = p => <Ico {...p} d={["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z","M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"]} />;
const ClockIcon   = p => <Ico {...p} d={["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z","M12 6v6l4 2"]} />;

const TX_LABEL = { RENEWAL: "Renewal", REPLACEMENT: "Replacement", AMENDMENT: "Amendment" };

const EVENT_META = {
  STATUS_CHANGE:            { label: "Status Change",        color: "#2563eb", bg: "#eff6ff" },
  DOCUMENT_REVIEW:          { label: "Document Review",      color: "#0369a1", bg: "#e0f2fe" },
  ESCALATION:               { label: "Escalated",            color: "#7c3aed", bg: "#f5f3ff" },
  REVERIFICATION_REQUESTED: { label: "Re-verification Req.", color: "#d97706", bg: "#fff7ed" },
  REVERIFICATION_CANCELLED: { label: "Re-verification Cancelled", color: "#6b7280", bg: "#f3f4f6" },
  MANUAL_REVIEW_CLEARED:    { label: "Manual Review Cleared", color: "#16a34a", bg: "#f0fdf4" },
  ASSIGNMENT:               { label: "Assigned",             color: "#6b7280", bg: "#f3f4f6" },
};

function daysUntilExpiry(expiryDateStr) {
  if (!expiryDateStr) return null;
  const expiry = new Date(expiryDateStr);
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

function fmt(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z") ? iso : iso + "Z";
  return new Date(s).toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Jamaica" });
}

function Row({ label, value }) {
  return (
    <div className={pStyles.infoRow}>
      <span className={pStyles.infoLabel}>{label}</span>
      <span className={pStyles.infoVal}>{value || "—"}</span>
    </div>
  );
}

function SectionCard({ icon: Icon, iconStroke = "#2563eb", title, badge, badgeColor, children }) {
  return (
    <div className={pStyles.stepContent} style={{ marginBottom: 16 }}>
      <div className={pStyles.sectionHead}>
        <Icon size={18} stroke={iconStroke} />
        <h2 className={pStyles.sectionTitle}>{title}</h2>
        {badge && (
          <span style={{
            marginLeft: "auto", fontSize: "11px", fontWeight: "700",
            color: badgeColor || "#6b7280",
            background: (badgeColor || "#6b7280") + "18",
            borderRadius: "999px", padding: "2px 10px",
          }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ padding: "16px 24px" }}>{children}</div>
    </div>
  );
}

export default function StepReviewSummary({
  app, applicant, licence, docReviews, systemFlags, addressChangeStatus, verificationFlag, verificationOverridden, events,
}) {
  const isRenewal       = app?.transaction_type === "RENEWAL";
  const days            = isRenewal ? daysUntilExpiry(licence?.expiry_date) : null;
  const renewalTooEarly = isRenewal && days !== null && days > 60;
  const allDocs      = (app?.documents || []).filter(d => d.is_current);
  const docs         = allDocs.filter(d => d.doc_type !== "licence_photo" && d.doc_type !== "verification_photo");
  const approvedDocs = docs.filter(d => docReviews[d.id]?.status === "APPROVED");
  const resubmitDocs = docs.filter(d => docReviews[d.id]?.status === "RESUBMIT_REQUIRED");
  const rejectedDocs = docs.filter(d => docReviews[d.id]?.status === "REJECTED");
  const pendingDocs  = docs.filter(d => !docReviews[d.id]);

  const verificationPassed  = app?.verification_passed && !app?.needs_manual_review && !app?.reverification_requested && !verificationFlag && !verificationOverridden;
  const verificationLabel   = verificationOverridden            ? "Overridden — Rejected"
                            : app?.reverification_requested    ? "Re-verification Requested"
                            : verificationFlag                 ? "Flagged"
                            : verificationPassed               ? "Approved"
                            : app?.needs_manual_review         ? "Manual Review Required"
                            : "Failed";
  const verificationColor   = verificationPassed               ? "#15803d"
                            : verificationFlag                 ? "#d97706"
                            : app?.reverification_requested    ? "#a16207"
                            : "#991b1b";
  const verificationBg      = verificationPassed               ? "#dcfce7"
                            : verificationFlag                 ? "#fff7ed"
                            : app?.reverification_requested    ? "#fef9c3"
                            : "#fee2e2";

  const flagCount       = Object.keys(systemFlags || {}).length;
  const hasAddressChange = app?.address_change_requested;
  const allDocsApproved  = docs.length > 0 && pendingDocs.length === 0 && rejectedDocs.length === 0 && resubmitDocs.length === 0;
  const addressOk        = !hasAddressChange || addressChangeStatus === "approved";
  const overallReady     = allDocsApproved && addressOk && flagCount === 0 && verificationPassed && !verificationFlag && !verificationOverridden && !renewalTooEarly;

  const DOC_STATUS_META = {
    APPROVED:          { label: "Approved",          color: "#15803d", bg: "#dcfce7" },
    RESUBMIT_REQUIRED: { label: "Resubmit Required", color: "#92400e", bg: "#fef9c3" },
    REJECTED:          { label: "Rejected",          color: "#991b1b", bg: "#fee2e2" },
  };

  return (
    <div>

      {/* Readiness banner */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "14px 18px", borderRadius: 12, marginBottom: 20,
        background: overallReady ? "#f0fdf4" : "#fffbeb",
        border: `1px solid ${overallReady ? "#86efac" : "#fcd34d"}`,
      }}>
        {overallReady
          ? <CheckCircle size={18} stroke="#16a34a" />
          : <AlertCircle size={18} stroke="#d97706" />}
        <div>
          <p style={{ fontSize: "13px", fontWeight: "700", color: overallReady ? "#15803d" : "#92400e", marginBottom: 2 }}>
            {overallReady ? "Application is ready for a decision" : "Review is not yet complete"}
          </p>
          <p style={{ fontSize: "12px", color: overallReady ? "#166534" : "#78350f" }}>
            {overallReady
              ? "All documents approved, checks passed, and no outstanding items."
              : "Resolve outstanding items below before proceeding to the decision step."}
          </p>
        </div>
      </div>

      {/* Renewal eligibility warning */}
      {renewalTooEarly && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 18px", borderRadius: 12, marginBottom: 20, background: "#fef2f2", border: "1.5px solid #fca5a5" }}>
          <AlertCircle size={18} stroke="#dc2626" />
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#991b1b", marginBottom: 2 }}>Renewal submitted too early</p>
            <p style={{ fontSize: 12, color: "#7f1d1d", lineHeight: 1.55 }}>
              This licence expires in <strong>{days} days</strong>. Renewals are only permitted within <strong>60 days</strong> of the expiry date. This application should be rejected or escalated unless there are exceptional circumstances.
            </p>
          </div>
        </div>
      )}

      {/* Applicant & Application */}
      <SectionCard icon={UserIcon} title="Applicant & Application">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
          <div>
            <Row label="Full Name"   value={`${applicant?.firstname || ""} ${applicant?.lastname || ""}`.trim()} />
            <Row label="TRN"         value={licence?.trn} />
            <Row label="Licence Class" value={licence?.licence_class} />
            <Row label="Date of Birth" value={fmt(applicant?.date_of_birth)} />
          </div>
          <div>
            <Row label="Transaction" value={TX_LABEL[app?.transaction_type]} />
            <Row label="Submitted"   value={fmt(app?.submitted_at)} />
            <Row label="Fee Paid"    value={app?.fee_amount ? `J$${parseFloat(app.fee_amount).toLocaleString()}` : "—"} />
            <Row label="Pickup"      value={app?.pickup_collectorate?.split("(")[0]?.trim()} />
          </div>
        </div>
      </SectionCard>

      {/* System verification */}
      <SectionCard
        icon={ShieldIcon}
        title="System Verification"
        badge={flagCount > 0 ? `${flagCount} flagged` : "All passed"}
        badgeColor={flagCount > 0 ? "#d97706" : "#16a34a"}
      >
        {flagCount === 0 ? (
          <p style={{ fontSize: "12px", color: "#6b7280" }}>All 5 automated checks passed with no issues flagged.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(systemFlags).map(([checkId, flag]) => (
              <div key={checkId} style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                padding: "10px 14px", background: "#fffbeb",
                border: "1px solid #fcd34d", borderRadius: 8,
              }}>
                <AlertCircle size={14} stroke="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: "12px", fontWeight: "700", color: "#92400e", marginBottom: 2 }}>
                    {checkId.replace(/_/g, " ")}
                  </p>
                  <p style={{ fontSize: "12px", color: "#78350f" }}>{flag.issue}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Document decisions */}
      <SectionCard
        icon={FileIcon}
        title="Document Decisions"
        badge={`${approvedDocs.length}/${docs.length} approved`}
        badgeColor={allDocsApproved ? "#16a34a" : "#d97706"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Live Identity Verification row */}
          {app?.verification_attempts > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", background: "#fafafa",
              border: "1px solid #f3f4f6", borderRadius: 8,
            }}>
              <p style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                Live Identity Verification
              </p>
              <span style={{ fontSize: "11px", fontWeight: "700", color: verificationColor, background: verificationBg, borderRadius: "999px", padding: "3px 10px" }}>
                {verificationLabel}
              </span>
            </div>
          )}
          {docs.length === 0 && !app?.verification_attempts ? (
            <p style={{ fontSize: "12px", color: "#6b7280" }}>No documents submitted.</p>
          ) : (
            docs.map(doc => {
              const review = docReviews[doc.id];
              const meta   = review ? DOC_STATUS_META[review.status] : null;
              return (
                <div key={doc.id} style={{ borderRadius: 8, border: "1px solid #f3f4f6", background: "#fafafa", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px" }}>
                    <p style={{ fontSize: "13px", fontWeight: "600", color: "#374151", textTransform: "capitalize" }}>
                      {doc.doc_type?.replace(/_/g, " ").toLowerCase()}
                    </p>
                    {meta ? (
                      <span style={{ fontSize: "11px", fontWeight: "700", color: meta.color, background: meta.bg, borderRadius: "999px", padding: "3px 10px" }}>
                        {meta.label}
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", background: "#f3f4f6", borderRadius: "999px", padding: "3px 10px" }}>
                        Pending
                      </span>
                    )}
                  </div>
                  {review?.comment && (
                    <div style={{ padding: "6px 14px 10px", borderTop: "1px solid #f3f4f6" }}>
                      <p style={{ fontSize: "11px", color: "#6b7280" }}>
                        <span style={{ fontWeight: 600, color: "#374151" }}>Officer note: </span>{review.comment}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SectionCard>

      {/* Address change */}
      <SectionCard
        icon={MapPinIcon}
        title="Requested Changes"
        badge={hasAddressChange ? (addressOk ? "Approved" : "Pending") : "None"}
        badgeColor={hasAddressChange ? (addressOk ? "#16a34a" : "#d97706") : "#6b7280"}
      >
        {!hasAddressChange ? (
          <p style={{ fontSize: "12px", color: "#6b7280" }}>No changes were requested on this application.</p>
        ) : (
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-start",
            padding: "10px 14px",
            background: addressOk ? "#f0fdf4" : "#fffbeb",
            border: `1px solid ${addressOk ? "#86efac" : "#fcd34d"}`,
            borderRadius: 8,
          }}>
            {addressOk
              ? <CheckCircle size={14} stroke="#16a34a" />
              : <AlertCircle size={14} stroke="#d97706" />}
            <p style={{ fontSize: "12px", color: addressOk ? "#166534" : "#92400e", fontWeight: "600" }}>
              Address change {addressOk ? "has been approved" : "is pending approval — go back to Step 3 to resolve"}.
            </p>
          </div>
        )}
      </SectionCard>

      {/* Officer checklist summary */}
      <SectionCard
        icon={ClipIcon}
        title="Officer Checklist"
        badge="Completed"
        badgeColor="#16a34a"
      >
        <p style={{ fontSize: "12px", color: "#6b7280" }}>
          All checklist items were confirmed in Step 5. Proceed to Step 7 to submit your decision.
        </p>
      </SectionCard>

      {/* Application event history */}
      {(events?.length > 0) && (
        <SectionCard
          icon={ClockIcon}
          iconStroke="#6b7280"
          title="Application History"
          badge={`${events.length} event${events.length !== 1 ? "s" : ""}`}
          badgeColor="#6b7280"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[...events].reverse().map((ev, i) => {
              const meta = EVENT_META[ev.event_type] || { label: ev.event_type?.replace(/_/g, " "), color: "#6b7280", bg: "#f3f4f6" };
              const isLast = i === events.length - 1;
              return (
                <div key={i} style={{ display: "flex", gap: 12, paddingBottom: isLast ? 0 : 16, position: "relative" }}>
                  {/* vertical line */}
                  {!isLast && (
                    <div style={{ position: "absolute", left: 7, top: 18, bottom: 0, width: 1, background: "#e5e7eb" }} />
                  )}
                  {/* dot */}
                  <div style={{ width: 15, height: 15, borderRadius: "50%", background: meta.bg, border: `2px solid ${meta.color}`, flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: meta.color }}>{meta.label}</span>
                      {ev.to_status && (
                        <span style={{ fontSize: "10px", fontWeight: "700", color: "#6b7280", background: "#f3f4f6", borderRadius: 999, padding: "1px 7px" }}>
                          → {ev.to_status.replace(/_/g, " ")}
                        </span>
                      )}
                      <span style={{ fontSize: "11px", color: "#9ca3af", marginLeft: "auto" }}>{fmt(ev.created_at)}</span>
                    </div>
                    {ev.comment && (
                      <p style={{ fontSize: "11px", color: "#6b7280", marginTop: 3, lineHeight: 1.5 }}>{ev.comment}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

    </div>
  );
}
// Checklist step in the officer review — officer marks off each item before proceeding to the decision.
import pStyles from "../reviewStyles.module.css";

const Ico = ({ d, size = 16, stroke = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const CheckIcon = p => <Ico {...p} sw={2.5} d="M5 12l5 5L20 7" />;
const ListIcon  = p => <Ico {...p} d={["M9 11l3 3L22 4","M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"]} />;
const AlertIcon = p => <Ico {...p} d={["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"]} />;

function daysUntilExpiry(expiryDateStr) {
  if (!expiryDateStr) return null;
  const expiry = new Date(expiryDateStr);
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

export default function StepChecklist({ app, checklist, setChecklist, priorStepCount, licence }) {
  const isLostReplacement  = app.transaction_type === "REPLACEMENT" && app.replacement_reason === "LOST";
  const hasTrustee         = !!app.trustee_collection;
  const isRenewal          = app.transaction_type === "RENEWAL";

  // Renewal eligibility: licence must be within 60 days of expiry
  const days              = isRenewal ? daysUntilExpiry(licence?.expiry_date) : null;
  const renewalTooEarly   = isRenewal && days !== null && days > 60;
  const renewalExpired    = isRenewal && days !== null && days < 0;

  const items = [
    ...(isRenewal ? [{
      id: "renewal_eligible",
      label: renewalTooEarly
        ? `Licence expires in ${days} days — renewals are only permitted within 60 days of expiry. I have confirmed this application is eligible or have escalated accordingly.`
        : renewalExpired
          ? "Licence is already expired. I have confirmed the applicant is still eligible for renewal under the applicable rules."
          : `Licence expires in ${days} day${days === 1 ? "" : "s"} — within the 60-day renewal window. Eligibility confirmed.`,
      required: true,
      warn: renewalTooEarly,
    }] : []),
    ...(isLostReplacement ? [{
      id: "ita_verified",
      label: "ITA traffic clearance has been received and confirmed for this lost licence replacement",
      required: true,
    }] : []),
    ...(hasTrustee ? [{
      id: "trustee_verified",
      label: "Trustee collection letter has been reviewed — name, signature, and ID match",
      required: true,
    }] : []),
    {
      id: "decision_ready",
      label: "I have reviewed all steps and am ready to submit my final decision on this application",
      required: true,
    },
  ];

  const checkedCount = items.filter(i => checklist[i.id]).length;

  return (
    <div className={pStyles.stepContent}>
      <div className={pStyles.sectionHead}>
        <ListIcon size={18} stroke="#2563eb" />
        <h2 className={pStyles.sectionTitle}>Officer Checklist</h2>
        <span className={pStyles.sectionNote}>{checkedCount}/{items.length} confirmed</span>
      </div>

      {/* Context banner */}
      <div style={{ margin: "16px 24px 0", padding: "12px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10 }}>
        <p style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 600, marginBottom: 3 }}>Steps 1–{priorStepCount} are already complete</p>
        <p style={{ fontSize: 12, color: "#3b82f6", lineHeight: 1.5 }}>
          Applicant details, system verification, document decisions, and any requested changes have all been handled in the previous steps.
          {items.length === 1 && !isLostReplacement && !hasTrustee
            ? " Confirm your readiness below to proceed to the decision."
            : " Complete the remaining items below before proceeding."}
        </p>
      </div>

      {/* Renewal eligibility warning */}
      {renewalTooEarly && (
        <div style={{ margin: "12px 24px 0", padding: "12px 16px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertIcon size={15} stroke="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: "#991b1b", marginBottom: 3 }}>Renewal submitted too early</p>
            <p style={{ fontSize: 12, color: "#7f1d1d", lineHeight: 1.55 }}>
              This licence expires in <strong>{days} days</strong>. Renewals are only permitted within <strong>60 days</strong> of the expiry date.
              If this application does not meet the eligibility requirement, it should be rejected or escalated.
            </p>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ width: 44, height: 44, background: "#f0fdf4", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <CheckIcon size={22} stroke="#16a34a" sw={2.5} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#15803d", marginBottom: 4 }}>No additional checks required</p>
          <p style={{ fontSize: 13, color: "#9ca3af" }}>This application has no special handling requirements.</p>
        </div>
      ) : (
        <div className={pStyles.checklistList} style={{ marginTop: 16 }}>
          {items.map(item => {
            const checked = !!checklist[item.id];
            return (
              <div key={item.id}
                className={`${pStyles.checklistItem} ${checked ? pStyles.checklistItemChecked : ""}`}
                style={item.warn && !checked ? { borderColor: "#fca5a5", background: "#fff5f5" } : {}}
                onClick={() => setChecklist(prev => ({ ...prev, [item.id]: !prev[item.id] }))}>
                <div className={`${pStyles.checkBox} ${checked ? pStyles.checkBoxChecked : ""}`}
                  style={item.warn && !checked ? { borderColor: "#fca5a5" } : {}}>
                  {checked && <CheckIcon size={12} stroke="white" sw={2.5} />}
                </div>
                <p className={`${pStyles.checkLabel} ${checked ? pStyles.checkLabelChecked : ""}`}
                  style={item.warn && !checked ? { color: "#991b1b" } : {}}>
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {checkedCount < items.length && items.length > 0 && (
        <div style={{ padding: "14px 24px", background: "#fffbeb", borderTop: "1px solid #fef3c7", display: "flex", alignItems: "center", gap: 8 }}>
          <AlertIcon size={14} stroke="#d97706" />
          <p style={{ fontSize: 12, color: "#92400e", fontWeight: 600 }}>
            Confirm all items before proceeding to the Review Summary.
          </p>
        </div>
      )}
    </div>
  );
}
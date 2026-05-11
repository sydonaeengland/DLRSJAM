// Printable payment receipt shown after a successful application payment.
import { forwardRef } from "react";
import { BRAND } from "../../config/theme";

const ReceiptDocument = forwardRef(function ReceiptDocument({ app, licence, printTime }, ref) {
  if (!app) return null;

  const TX = { RENEWAL: "Licence Renewal", REPLACEMENT: "Licence Replacement", AMENDMENT: "Licence Amendment" };
  const txLabel = TX[app.transaction_type] || app.transaction_type;
  const fee     = app.fee_amount
    ? `$${parseFloat(app.fee_amount).toLocaleString("en-JM", { minimumFractionDigits: 2 })}`
    : "—";
  const subDate = app.submitted_at
    ? new Date(app.submitted_at).toLocaleDateString("en-JM", { day: "numeric", month: "long", year: "numeric" })
    : "—";
  const name = licence
    ? [licence.firstname, licence.middlename, licence.lastname].filter(Boolean).join(" ")
    : "—";
  const trn  = licence?.trn || "—";
  const cls  = licence?.licence_class || "—";
  const dob  = licence?.date_of_birth || "—";
  const addr = licence
    ? [licence.address_line1, licence.address_line2, licence.parish].filter(Boolean).join(", ")
    : "—";

  const Field = ({ label, value, large, green, navy }) => (
    <div>
      <p style={{ fontSize: "7px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>{label}</p>
      <p style={{ fontSize: large ? "13px" : "10px", fontWeight: large ? "800" : "600", color: green ? "#16a34a" : navy ? "#1e3a8a" : "#111827", margin: 0, lineHeight: 1.4 }}>{value}</p>
    </div>
  );

  const SectionHeader = ({ label, bg }) => (
    <div style={{ background: bg, padding: "7px 14px" }}>
      <p style={{ fontSize: "7px", fontWeight: "800", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>{label}</p>
    </div>
  );

  return (
    <div ref={ref} style={{ background: "white", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#111", border: "2px solid #1e3a8a", borderRadius: "14px", padding: "20px" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%)", borderRadius: "12px", padding: "18px 22px", marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "7px", fontWeight: "700", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.18em", margin: "0 0 2px" }}>Government of Jamaica</p>
            <p style={{ fontSize: "15px", fontWeight: "900", color: "white", margin: "0 0 2px", letterSpacing: "-0.2px" }}>Tax Administration Jamaica</p>
            <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)", margin: 0 }}>Driver's Licence Renewal System · dlrsjam.gov.jm</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "7px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>Official Receipt</p>
          <p style={{ fontSize: "13px", fontWeight: "900", color: "white", margin: "0 0 2px", fontFamily: "monospace", letterSpacing: "0.04em" }}>{app.application_number}</p>
          <p style={{ fontSize: "8px", color: "rgba(255,255,255,0.45)", margin: 0 }}>{printTime}</p>
        </div>
      </div>

      {/* Confirmation strip */}
      <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "12px 16px", marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 6.5l3 3 6-6" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: "11px", fontWeight: "800", color: "#15803d", margin: "0 0 1px" }}>Payment Confirmed — Application Submitted</p>
            <p style={{ fontSize: "9px", color: "#16a34a", margin: 0 }}>Under review by a TAJ officer · {subDate}</p>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: "7px", color: "#6b7280", margin: "0 0 2px", textTransform: "uppercase" }}>Amount Paid</p>
          <p style={{ fontSize: "17px", fontWeight: "900", color: "#15803d", margin: 0 }}>{fee} <span style={{ fontSize: "10px", fontWeight: "600" }}>JMD</span></p>
        </div>
      </div>

      {/* Two-column body */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>

        {/* Applicant */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
          <SectionHeader label="Applicant" bg="#1e3a8a" />
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "9px" }}>
            <Field label="Full Name"     value={name.toUpperCase()} />
            <Field label="TRN"           value={trn} />
            <Field label="Licence Class" value={`Class ${cls}`} />
            <Field label="Date of Birth" value={dob} />
            <Field label="Address"       value={addr} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Application */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
            <SectionHeader label="Application" bg="#374151" />
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "9px" }}>
              <Field label="Transaction"    value={txLabel} />
              <Field label="Reference"      value={app.application_number} />
              <Field label="Date Submitted" value={subDate} />
              <Field label="Status"         value="SUBMITTED" green />
              {app.pickup_collectorate && <Field label="Pickup Location" value={app.pickup_collectorate} />}
            </div>
          </div>

          {/* Payment */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
            <SectionHeader label="Payment" bg="#065f46" />
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "9px" }}>
              <Field label="Amount" value={`${fee} JMD`} large navy />
              <Field label="Method" value="Card Payment (Stripe)" />
              <Field label="Status" value="PAID" green />
              <Field label="Date"   value={subDate} />
              {app.payment_reference && (
                <div>
                  <p style={{ fontSize: "7px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>Stripe Reference</p>
                  <p style={{ fontSize: "8px", color: "#6b7280", fontFamily: "monospace", margin: 0, wordBreak: "break-all" }}>{app.payment_reference}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collection notice */}
      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px" }}>
        <p style={{ fontSize: "8px", fontWeight: "800", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>When Collecting Your Licence</p>
        <p style={{ fontSize: "9px", color: "#78350f", margin: 0, lineHeight: 1.7 }}>
          Bring this receipt · Valid photo ID · Confirmation email · Reference: {app.application_number} · Processing takes 5–7 business days after approval.
        </p>
      </div>

      {/* Official verification strip */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", gap: "2px", alignItems: "stretch", height: "28px", flexShrink: 0 }}>
            {[3,1,2,1,3,2,1,3,1,2,1,3,2,1,2].map((w, i) => (
              <div key={i} style={{ width: `${w}px`, background: i % 3 === 0 ? "#1e3a8a" : "#94a3b8", borderRadius: "1px" }} />
            ))}
          </div>
          <div>
            <p style={{ fontSize: "7px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>Document Verification Code</p>
            <p style={{ fontSize: "9px", fontFamily: "monospace", color: "#374151", fontWeight: "700", margin: 0, letterSpacing: "0.08em" }}>
              {app.application_number}-{trn.slice(-4)}-TAJ
            </p>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: "7px", color: "#9ca3af", margin: "0 0 2px", textTransform: "uppercase" }}>Issued by</p>
          <p style={{ fontSize: "9px", fontWeight: "700", color: "#1e3a8a", margin: 0 }}>TAJ Licensing Division</p>
          <p style={{ fontSize: "7px", color: "#9ca3af", margin: "1px 0 0" }}>Road Traffic Act, Jamaica</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "2px solid #1e3a8a", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: "9px", fontWeight: "800", color: "#1e3a8a", margin: "0 0 2px" }}>Tax Administration Jamaica — DLRSJAM</p>
          <p style={{ fontSize: "8px", color: "#6b7280", margin: 0 }}>support@dlrsjam.gov.jm · 1-876-XXX-XXXX · Mon–Fri 8AM–4PM</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "8px", fontWeight: "700", color: "#374151", margin: "0 0 2px" }}>Official Government Receipt</p>
          <p style={{ fontSize: "8px", color: "#9ca3af", margin: 0 }}>Printed {printTime}</p>
          <p style={{ fontSize: "7px", color: "#c0c0c0", margin: "2px 0 0", fontStyle: "italic" }}>This document is digitally generated and valid without a physical signature.</p>
        </div>
      </div>

    </div>
  );
});

export default ReceiptDocument;

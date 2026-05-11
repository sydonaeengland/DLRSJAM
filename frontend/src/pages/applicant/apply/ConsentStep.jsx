// DPA consent gate — must be accepted before any application step begins.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StepLayout from "../../../components/layout/StepLayout";
import PrivacyNotice from "../PrivacyNotice";
import { BRAND } from "../../../config/theme";

const DATA_ITEMS = [
  { icon: "🪪", label: "Identity documents", detail: "National ID and existing licence (front and back)" },
  { icon: "📸", label: "Biometric data", detail: "Webcam photo, facial descriptor, and liveness scores" },
  { icon: "📋", label: "Personal details", detail: "Name, TRN, date of birth, address, contact details" },
  { icon: "💳", label: "Payment reference", detail: "Stripe payment confirmation (card details never stored)" },
];

export default function ConsentStep() {
  const navigate = useNavigate();
  const [checked,      setChecked]      = useState(false);
  const [showNotice,   setShowNotice]   = useState(false);

  const handleContinue = () => {
    if (!checked) return;
    // Store consent timestamp in sessionStorage — picked up by TransactionSelection on create
    sessionStorage.setItem("dpa_consent_at", new Date().toISOString());
    navigate("/apply/select-transaction");
  };

  if (showNotice) {
    return (
      <StepLayout currentStep={-1}>
        <div style={{ maxWidth: "680px" }}>
          <button
            onClick={() => setShowNotice(false)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: BRAND.primary, padding: 0, marginBottom: "24px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Back to consent
          </button>
          <PrivacyNotice embedded onClose={() => setShowNotice(false)} />
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout currentStep={-1}>
      <div style={{ maxWidth: "600px" }}>

        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "4px 10px", marginBottom: "12px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span style={{ fontSize: "11px", fontWeight: "700", color: BRAND.primary, letterSpacing: "0.06em", textTransform: "uppercase" }}>Data Protection</span>
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#1b1c1c", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
            Before you begin
          </h1>
          <p style={{ fontSize: "15px", color: "#64748b", margin: 0, lineHeight: 1.65 }}>
            To process your licence application, TAJ needs to collect and use certain personal and biometric data. Under the Data Protection Act, 2020, your explicit consent is required before this data is collected.
          </p>
        </div>

        {/* What will be collected */}
        <div style={{ background: "white", border: "1px solid #e9e8e7", borderRadius: "14px", padding: "20px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <p style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
            Data that will be collected
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {DATA_ITEMS.map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f5f6f8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "16px" }}>
                  {item.icon}
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 2px" }}>{item.label}</p>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Purpose and retention summary */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 18px", marginBottom: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { label: "Purpose", value: "Processing your driver's licence application only" },
              { label: "Shared with", value: "TAJ officers, ITA (replacement only), Stripe (payment)" },
              { label: "Kept for", value: "7 years after decision · Drafts deleted after 30 days" },
              { label: "Your rights", value: "Access, erasure, and rectification via Account Settings" },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", gap: "10px" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", minWidth: "90px", flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontSize: "12px", color: "#374151" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy notice link */}
        <button
          onClick={() => setShowNotice(true)}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "13px", fontWeight: "600", color: BRAND.primary, display: "flex", alignItems: "center", gap: "5px", marginBottom: "24px" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Read the full Privacy Notice
        </button>

        {/* Consent checkbox */}
        <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer", marginBottom: "28px" }}>
          <div
            onClick={() => setChecked(v => !v)}
            style={{
              width: "20px", height: "20px", borderRadius: "5px", flexShrink: 0, marginTop: "1px",
              border: `2px solid ${checked ? BRAND.primary : "#cbd5e1"}`,
              background: checked ? BRAND.primary : "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s", cursor: "pointer",
            }}
          >
            {checked && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <span style={{ fontSize: "14px", color: "#374151", lineHeight: 1.65 }}>
            I have read and understood the Privacy Notice. I give my explicit consent for Tax Administration Jamaica to collect and process my personal data, including biometric data, for the purpose of processing my driver's licence application.
          </span>
        </label>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{ padding: "12px 20px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "14px", fontWeight: "600", color: "#374151", cursor: "pointer", fontFamily: "inherit" }}
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={!checked}
            style={{
              flex: 1, padding: "12px 20px", borderRadius: "10px", border: "none",
              background: checked ? BRAND.primary : "#e2e8f0",
              color: checked ? "white" : "#94a3b8",
              fontSize: "14px", fontWeight: "700", cursor: checked ? "pointer" : "not-allowed",
              fontFamily: "inherit", transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            I Agree — Continue
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        <p style={{ fontSize: "11px", color: "#94a3b8", margin: "16px 0 0", textAlign: "center" }}>
          You may withdraw consent and delete your account at any time via Account Settings, provided no application is actively in progress.
        </p>
      </div>
    </StepLayout>
  );
}

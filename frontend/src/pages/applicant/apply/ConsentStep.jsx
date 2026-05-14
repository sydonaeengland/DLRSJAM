// DPA consent gate — must be accepted before any application step begins.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StepLayout from "../../../components/layout/StepLayout";
import PrivacyNotice from "../PrivacyNotice";
import { BRAND } from "../../../config/theme";

export default function ConsentStep() {
  const navigate = useNavigate();
  const [checked,    setChecked]    = useState(false);
  const [showNotice, setShowNotice] = useState(false);

  const handleContinue = () => {
    if (!checked) return;
    sessionStorage.setItem("dpa_consent_at", new Date().toISOString());
    navigate("/apply/select-transaction");
  };

  return (
    <StepLayout currentStep={-1}>
      {/* Full-width container matching the steps bar width */}
      <div style={{ width: "100%" }}>

        {/* Notice container */}
        <div style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}>

          {/* Header band */}
          <div style={{
            background: BRAND.primary,
            padding: "24px 32px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>
                Data Protection Act, 2020
              </p>
              <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white", margin: 0, letterSpacing: "-0.3px" }}>
                Privacy &amp; Consent Notice
              </h1>
            </div>
          </div>

          {/* Body — two columns when showing privacy notice inline */}
          {showNotice ? (
            <div style={{ padding: "28px 32px" }}>
              <button
                onClick={() => setShowNotice(false)}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: BRAND.primary, padding: 0, marginBottom: "20px" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
                Back to consent
              </button>
              <PrivacyNotice embedded onClose={() => setShowNotice(false)} />
            </div>
          ) : (
            <div style={{ padding: "28px 32px" }}>

              <p style={{ fontSize: "14px", color: "#475569", lineHeight: 1.7, margin: "0 0 28px" }}>
                To process your driver's licence application, Tax Administration Jamaica must collect and use certain personal and biometric data. Under the <strong style={{ color: "#1e293b" }}>Data Protection Act, 2020</strong>, your explicit consent is required before any data is collected.
              </p>

              {/* Two-column layout — data items left, summary table right */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "28px" }}>

                {/* Left — data collected */}
                <div>
                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>
                    Data that will be collected
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {[
                      { icon: (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                      ), label: "Identity Documents", detail: "National ID and existing licence (front & back)" },
                      { icon: (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      ), label: "Biometric Data", detail: "Webcam photo, facial descriptor, liveness scores" },
                      { icon: (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      ), label: "Personal Details", detail: "Name, TRN, date of birth, address, contact" },
                      { icon: (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                      ), label: "Payment Reference", detail: "Stripe confirmation — card details never stored" },
                    ].map(item => (
                      <div key={item.label} style={{
                        background: "#f8fafc",
                        border: "1px solid #e9e8e7",
                        borderRadius: "10px",
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                      }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "8px",
                          background: `${BRAND.primary}12`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          {item.icon}
                        </div>
                        <div>
                          <p style={{ fontSize: "12px", fontWeight: "700", color: "#1e293b", margin: "0 0 2px" }}>{item.label}</p>
                          <p style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right — summary + privacy link */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>
                    How your data is used
                  </p>
                  <div style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    overflow: "hidden",
                    marginBottom: "16px",
                    flex: 1,
                  }}>
                    {[
                      { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, label: "Purpose", value: "Processing your driver's licence application only" },
                      { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, label: "Shared with", value: "TAJ officers, ITA (replacement only), Stripe" },
                      { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label: "Kept for", value: "7 years after decision · Drafts: 30 days" },
                      { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, label: "Your rights", value: "Access, erasure, rectification — Account Settings" },
                    ].map((row, i, arr) => (
                      <div key={row.label} style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0",
                        borderBottom: i < arr.length - 1 ? "1px solid #e2e8f0" : "none",
                      }}>
                        <div style={{ width: "120px", flexShrink: 0, padding: "11px 14px", background: "#f8fafc", borderRight: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "6px" }}>
                          {row.icon}
                          <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>{row.label}</span>
                        </div>
                        <div style={{ padding: "11px 14px" }}>
                          <span style={{ fontSize: "11px", color: "#374151", lineHeight: 1.5 }}>{row.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Privacy notice link */}
                  <button
                    onClick={() => setShowNotice(true)}
                    style={{
                      background: "#f0f5ff", border: "1px solid #c7d7fd", borderRadius: "10px",
                      padding: "11px 16px", cursor: "pointer", fontSize: "13px", fontWeight: "600",
                      color: BRAND.primary, display: "flex", alignItems: "center", gap: "8px",
                      fontFamily: "inherit", width: "100%",
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Read the full Privacy Notice
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: "auto" }}>
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>

              </div>

              {/* Divider */}
              <div style={{ borderTop: "1px solid #e2e8f0", marginBottom: "22px" }} />

              {/* Consent checkbox */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer", marginBottom: "20px" }}>
                <div
                  onClick={() => setChecked(v => !v)}
                  style={{
                    width: "20px", height: "20px", borderRadius: "5px", flexShrink: 0, marginTop: "2px",
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
                <span style={{ fontSize: "13px", color: "#374151", lineHeight: 1.7 }}>
                  I have read and understood the Privacy Notice. I give my <strong>explicit consent</strong> for Tax Administration Jamaica to collect and process my personal data, including biometric data, for the purpose of processing my driver's licence application.
                </span>
              </label>

              {/* Actions */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => navigate("/dashboard")}
                  style={{ padding: "11px 20px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "13px", fontWeight: "600", color: "#374151", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleContinue}
                  disabled={!checked}
                  style={{
                    flex: 1, padding: "11px 20px", borderRadius: "10px", border: "none",
                    background: checked ? BRAND.primary : "#e2e8f0",
                    color: checked ? "white" : "#94a3b8",
                    fontSize: "13px", fontWeight: "700", cursor: checked ? "pointer" : "not-allowed",
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

            </div>
          )}

          {/* Footer */}
          <div style={{ padding: "12px 32px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0, textAlign: "center" }}>
              You may withdraw consent and delete your account at any time via Account Settings, provided no application is actively in progress.
            </p>
          </div>

        </div>
      </div>
    </StepLayout>
  );
}

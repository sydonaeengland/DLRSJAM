import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../../../context/ApplicationContext";
import StepLayout from "../../../components/layout/StepLayout";
import StepCard from "../../../components/apply/StepCard";
import StepNav from "../../../components/apply/StepNav";
import InfoBanner from "../../../components/apply/InfoBanner";
import { BRAND } from "../../../config/theme";
import api from "../../../services/api";

const DOC_LABELS = {
  licence_photo:          "Passport-style Photo",
  national_id_front:      "National ID (Front)",
  national_id_back:       "National ID (Back)",
  existing_licence_front: "Current Driver's Licence (Front)",
  existing_licence_back:  "Current Driver's Licence (Back)",
  police_report:          "Police Report",
  proof_of_address:       "Proof of Address",
  trustee_letter:         "Trustee / Proxy Letter",
};

const TX_LABELS = {
  RENEWAL:     "Licence Renewal",
  REPLACEMENT: "Licence Replacement",
  AMENDMENT:   "Licence Amendment",
};

function SectionLabel({ text }) {
  return (
    <p style={{
      fontSize: "11px", fontWeight: "700", color: "#94a3b8",
      textTransform: "uppercase", letterSpacing: "0.1em",
      margin: "28px 0 8px",
    }}>
      {text}
    </p>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "10px 0",
      borderBottom: "1px solid #f1f5f9",
      gap: "16px",
    }}>
      <span style={{ fontSize: "13px", color: "#64748b", flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: "13px", fontWeight: "600",
        color: highlight === "expired" ? "#dc2626" : highlight === "amber" ? "#d97706" : "#1b1c1c",
        textAlign: "right",
      }}>
        {value || "—"}
      </span>
    </div>
  );
}

export default function Review() {
  const navigate = useNavigate();
  const { state } = useAppState();

  const [appData, setAppData] = useState(null);
  const [licence, setLicence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!state.applicationId) {
      navigate("/apply");
      return;
    }
    Promise.all([
      api.get(`/api/applicant/applications/${state.applicationId}`),
      api.get("/api/applicant/licence"),
    ])
      .then(([appRes, licRes]) => {
        setAppData(appRes.data);
        setLicence(licRes.data);
      })
      .catch(() => setError("Failed to load application details. Please try again."))
      .finally(() => setLoading(false));
  }, [state.applicationId]);

  const fmt = (dateStr) => dateStr
    ? new Date(dateStr).toLocaleDateString("en-JM", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const handleContinue = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate("/apply/declaration");
  };

  if (loading) {
    return (
      <StepLayout currentStep={5}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh", gap: "12px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: "14px", color: "#64748b" }}>Loading your application...</span>
        </div>
      </StepLayout>
    );
  }

  if (error) {
    return (
      <StepLayout currentStep={5}>
        <InfoBanner type="error" message={error} />
      </StepLayout>
    );
  }

  const isExpired = licence?.expiry_date ? new Date(licence.expiry_date) < new Date() : false;

  return (
    <StepLayout currentStep={5}>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
          Step 6 of 9
        </p>
        <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#1b1c1c", margin: "0 0 6px", letterSpacing: "-0.4px" }}>
          Review Your Application
        </h1>
        <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
          Please review all details carefully before proceeding to the declaration.
        </p>
      </div>

      <InfoBanner type="info" message="This is a read-only summary. If anything is incorrect, use the Back button to go back and make changes." />

      {/* Transaction */}
      <SectionLabel text="Transaction" />
      <StepCard>
        <Row label="Transaction Type" value={TX_LABELS[appData?.transaction_type] ?? appData?.transaction_type} />
        <Row label="Application Number" value={appData?.application_number} />
        {appData?.transaction_type === "REPLACEMENT" && (
          <Row label="Replacement Reason" value={appData?.replacement_reason} />
        )}
        <Row label="Fee" value={appData?.fee_amount ? `$${Number(appData.fee_amount).toLocaleString()} JMD` : "—"} />
      </StepCard>

      {/* Personal details */}
      <SectionLabel text="Personal Details" />
      <StepCard>
        <Row label="Full Name" value={licence ? `${licence.firstname} ${licence.lastname}` : "—"} />
        <Row label="TRN" value={licence?.trn} />
        <Row label="Date of Birth" value={fmt(licence?.date_of_birth)} />
        <Row label="Sex" value={licence?.sex} />
        <Row label="Occupation" value={licence?.occupation} />
        <Row label="Nationality" value={licence?.nationality} />
      </StepCard>

      {/* Licence details */}
      <SectionLabel text="Licence Details" />
      <StepCard>
        <Row label="Licence Class" value={licence?.licence_class} />
        <Row label="Control Number" value={licence?.control_number} />
        <Row label="Collectorate" value={licence?.collectorate} />
        <Row label="Issue Date" value={fmt(licence?.issue_date)} />
        <Row
          label="Expiry Date"
          value={fmt(licence?.expiry_date)}
          highlight={isExpired ? "expired" : null}
        />
        <Row label="Original Issue Date" value={fmt(licence?.first_issue_date)} />
        <Row label="Status" value={isExpired ? "EXPIRED" : licence?.status} highlight={isExpired ? "expired" : null} />
      </StepCard>

      {/* Address */}
      <SectionLabel text="Address" />
      <StepCard>
        {appData?.address_change_requested ? (
          <>
            <div style={{ marginBottom: "12px" }}>
              <p style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Current Address</p>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                {[licence?.address_line1, licence?.address_line2, licence?.parish].filter(Boolean).join(", ") || "—"}
              </p>
            </div>
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
              <p style={{ fontSize: "12px", fontWeight: "600", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>New Address</p>
              <p style={{ fontSize: "14px", fontWeight: "600", color: "#1b1c1c", margin: 0 }}>
                {[appData.new_address_line1, appData.new_address_line2, appData.new_parish].filter(Boolean).join(", ") || "—"}
              </p>
            </div>
          </>
        ) : (
          <Row
            label="Address"
            value={[licence?.address_line1, licence?.address_line2, licence?.parish].filter(Boolean).join(", ")}
          />
        )}
      </StepCard>

      {/* TRN flag */}
      {appData?.trn_pending_flag && (
        <>
          <SectionLabel text="Notes" />
          <StepCard>
            <InfoBanner type="warning" message="You indicated that your TRN details are pending a recent update. The officer will verify your TRN record before approving." />
          </StepCard>
        </>
      )}

      {/* Documents */}
      <SectionLabel text="Uploaded Documents" />
      <StepCard>
        {appData?.documents?.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {appData.documents.map((doc) => (
              <div key={doc.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: "10px",
                background: "#f8fafc", border: "1px solid #e2e8f0",
                gap: "12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <span style={{ fontSize: "18px", flexShrink: 0 }}>📄</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: "600", color: "#1b1c1c", margin: 0 }}>
                      {DOC_LABELS[doc.doc_type] ?? doc.doc_type}
                    </p>
                    <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.original_filename}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  {doc.ai_check_passed !== null && doc.ai_check_passed !== undefined && (
                    <span style={{
                      fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "99px",
                      background: doc.ai_check_passed ? "#f0fdf4" : "#fffbeb",
                      color: doc.ai_check_passed ? "#15803d" : "#d97706",
                      border: `1px solid ${doc.ai_check_passed ? "#bbf7d0" : "#fde68a"}`,
                    }}>
                      {doc.ai_check_passed ? `✓ AI ${doc.ai_check_score}/100` : `⚠ AI ${doc.ai_check_score}/100`}
                    </span>
                  )}
                  <span style={{
                    fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "99px",
                    background: "#eff6ff", color: BRAND.primary, border: `1px solid #bfdbfe`,
                  }}>
                    Uploaded
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0 }}>No documents uploaded.</p>
        )}
      </StepCard>

      <StepNav
        onBack={() => navigate("/apply/verification")}
        onContinue={handleContinue}
        continueLabel="Continue to Declaration"
      />
    </StepLayout>
  );
}
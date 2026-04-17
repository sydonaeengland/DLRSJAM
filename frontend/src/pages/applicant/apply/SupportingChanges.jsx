import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../../../context/ApplicationContext";
import StepLayout from "../../../components/layout/StepLayout";
import StepCard from "../../../components/apply/StepCard";
import StepNav from "../../../components/apply/StepNav";
import InfoBanner from "../../../components/apply/InfoBanner";
import { BRAND } from "../../../config/theme";
import api from "../../../services/api";

const PARISHES = [
  "Kingston", "St. Andrew", "St. Thomas", "Portland", "St. Mary",
  "St. Ann", "Trelawny", "St. James", "Hanover", "Westmoreland",
  "St. Elizabeth", "Manchester", "Clarendon", "St. Catherine",
];

const PROOF_DOC_TYPES = [
  { value: "utility_bill",         label: "Utility Bill (within 3 months)" },
  { value: "bank_statement",       label: "Bank Statement (within 3 months)" },
  { value: "lease_agreement",      label: "Rental / Lease Agreement" },
  { value: "property_tax_receipt", label: "Property Tax Receipt" },
  { value: "employer_letter",      label: "Letter from Employer" },
  { value: "jp_certified_letter",  label: "JP Certified Letter" },
];

const fieldLabel = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "#374151",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  height: "44px",
  borderRadius: "10px",
  border: "1.5px solid #e9e8e7",
  padding: "0 14px",
  fontSize: "14px",
  color: "#1b1c1c",
  background: "white",
  fontFamily: "inherit",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 0.15s",
};

const errorText = {
  fontSize: "12px",
  color: "#dc2626",
  margin: "4px 0 0",
};

export default function SupportingChanges() {
  const navigate = useNavigate();
  const { state, update } = useAppState();

  const currentAddress = [
    state.licenceRecord?.address_line1,
    state.licenceRecord?.address_line2,
    state.licenceRecord?.parish,
  ].filter(Boolean).join(", ") || "—";

  const [line1, setLine1] = useState(state.newAddressLine1 || "");
  const [line2, setLine2] = useState(state.newAddressLine2 || "");
  const [parish, setParish] = useState(state.newParish || "");
  const [proofDocType, setProofDocType] = useState(state.proofOfAddressDocType || "");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!line1.trim()) e.line1 = "Address line 1 is required";
    if (!parish) e.parish = "Parish is required";
    if (!proofDocType) e.proofDocType = "Please select a proof of address document type";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.patch(`/api/applicant/applications/${state.applicationId}`, {
        address_change_requested: true,
        new_address_line1: line1.trim(),
        new_address_line2: line2.trim(),
        new_parish: parish,
      });
      update({
        newAddressLine1: line1.trim(),
        newAddressLine2: line2.trim(),
        newParish: parish,
        proofOfAddressDocType: proofDocType,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      navigate("/apply/document-upload");
    } catch (err) {
      setErrors({ submit: "Failed to save changes. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <StepLayout currentStep={2}>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
          Step 3 of 9
        </p>
        <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#1b1c1c", margin: "0 0 6px", letterSpacing: "-0.4px" }}>
          Address Update
        </h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
          Provide your new address. This will be reflected on your renewed licence.
        </p>
      </div>

      <StepCard>
        <div style={{ marginBottom: "28px" }}>
          <label style={fieldLabel}>Current Address on Record</label>
          <div style={{
            background: "#f8fafc", border: "1px solid #e9e8e7",
            borderRadius: "10px", padding: "12px 16px",
            fontSize: "14px", color: "#64748b", lineHeight: 1.6,
          }}>
            {currentAddress}
          </div>
        </div>

        <div style={{ borderTop: "1px solid #f1f0ef", paddingTop: "24px", marginBottom: "24px" }}>
          <p style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 20px" }}>New Address</p>

          <div style={{ marginBottom: "16px" }}>
            <label style={fieldLabel}>
              Address Line 1 <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              value={line1}
              onChange={(e) => { setLine1(e.target.value); if (errors.line1) setErrors((p) => ({ ...p, line1: null })); }}
              placeholder="Street number and name"
              style={{ ...inputStyle, borderColor: errors.line1 ? "#dc2626" : "#e9e8e7" }}
              onFocus={(e) => e.target.style.borderColor = errors.line1 ? "#dc2626" : BRAND.primary}
              onBlur={(e) => e.target.style.borderColor = errors.line1 ? "#dc2626" : "#e9e8e7"}
            />
            {errors.line1 && <p style={errorText}>{errors.line1}</p>}
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={fieldLabel}>
              Address Line 2 <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "400" }}>(optional)</span>
            </label>
            <input
              type="text"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              placeholder="Apartment, district, community"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = BRAND.primary}
              onBlur={(e) => e.target.style.borderColor = "#e9e8e7"}
            />
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={fieldLabel}>
              Parish <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              value={parish}
              onChange={(e) => { setParish(e.target.value); if (errors.parish) setErrors((p) => ({ ...p, parish: null })); }}
              style={{ ...inputStyle, borderColor: errors.parish ? "#dc2626" : "#e9e8e7", color: parish ? "#1b1c1c" : "#94a3b8" }}
              onFocus={(e) => e.target.style.borderColor = errors.parish ? "#dc2626" : BRAND.primary}
              onBlur={(e) => e.target.style.borderColor = errors.parish ? "#dc2626" : "#e9e8e7"}
            >
              <option value="">Select parish</option>
              {PARISHES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.parish && <p style={errorText}>{errors.parish}</p>}
          </div>
        </div>

        <div style={{ borderTop: "1px solid #f1f0ef", paddingTop: "24px", marginBottom: "24px" }}>
          <p style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 6px" }}>Proof of Address</p>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
            Select the type of document you will upload to verify your new address.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {PROOF_DOC_TYPES.map((doc) => {
              const selected = proofDocType === doc.value;
              return (
                <div
                  key={doc.value}
                  onClick={() => { setProofDocType(doc.value); if (errors.proofDocType) setErrors((p) => ({ ...p, proofDocType: null })); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    border: `1.5px solid ${selected ? BRAND.primary : "#e9e8e7"}`,
                    borderRadius: "10px", padding: "12px 16px",
                    cursor: "pointer", background: selected ? "#eff6ff" : "white",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${selected ? BRAND.primary : "#d1d5db"}`,
                    background: selected ? BRAND.primary : "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {selected && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "white" }} />}
                  </div>
                  <span style={{ fontSize: "14px", color: selected ? BRAND.primary : "#374151", fontWeight: selected ? "600" : "400" }}>
                    {doc.label}
                  </span>
                </div>
              );
            })}
          </div>
          {errors.proofDocType && <p style={{ ...errorText, marginTop: "8px" }}>{errors.proofDocType}</p>}
        </div>

        <InfoBanner type="info" message="You will upload your proof of address document in the next step. Accepted formats: PDF, JPG, PNG (max 5MB)." />

        {errors.submit && (
          <div style={{ marginTop: "16px" }}>
            <InfoBanner type="error" message={errors.submit} />
          </div>
        )}
      </StepCard>

      <StepNav
        onBack={() => navigate("/apply/retrieve-record")}
        onContinue={handleContinue}
        loading={saving}
        continueLabel="Save & Continue"
      />
    </StepLayout>
  );
}
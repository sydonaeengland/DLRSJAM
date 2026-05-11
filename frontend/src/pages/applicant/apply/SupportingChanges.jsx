// Step 4 (amendment only) — applicant selects what they want to change (address, occupation, etc.).
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
  display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px",
};

const inputStyle = {
  width: "100%", height: "44px", borderRadius: "10px", border: "1.5px solid #e9e8e7",
  padding: "0 14px", fontSize: "14px", color: "#1b1c1c", background: "white",
  fontFamily: "inherit", boxSizing: "border-box", outline: "none", transition: "border-color 0.15s",
};

const errorText = { fontSize: "12px", color: "#dc2626", margin: "4px 0 0" };

function ChoiceButton({ selected, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      textAlign: "left", padding: "13px 16px", borderRadius: "10px", cursor: "pointer",
      border: `2px solid ${selected ? BRAND.primary : "#e2e8f0"}`,
      background: selected ? "#eff6ff" : "white",
      fontSize: "14px", fontWeight: selected ? "600" : "400",
      color: selected ? BRAND.primary : "#475569",
      fontFamily: "inherit", transition: "all 0.15s", width: "100%",
      display: "flex", alignItems: "center", gap: "10px",
    }}>
      <span style={{
        width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: selected ? BRAND.primary : "#f1f5f9",
        color: selected ? "white" : "#94a3b8", fontSize: "11px", fontWeight: "800",
        transition: "all 0.15s",
      }}>
        {selected ? "✓" : ""}
      </span>
      {children}
    </button>
  );
}

function CheckItem({ checked, onChange, label, sublabel }) {
  return (
    <div onClick={onChange} style={{
      display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px",
      borderRadius: "10px", border: `2px solid ${checked ? BRAND.primary : "#e2e8f0"}`,
      background: checked ? "#eff6ff" : "white", cursor: "pointer", transition: "all 0.15s",
    }}>
      <div style={{
        width: "20px", height: "20px", borderRadius: "5px", flexShrink: 0, marginTop: "1px",
        border: `2px solid ${checked ? BRAND.primary : "#d1d5db"}`,
        background: checked ? BRAND.primary : "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}>
        {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5L20 7" /></svg>}
      </div>
      <div>
        <p style={{ fontSize: "14px", fontWeight: checked ? "600" : "400", color: checked ? BRAND.primary : "#374151", margin: 0 }}>{label}</p>
        {sublabel && <p style={{ fontSize: "12px", color: "#9ca3af", margin: "2px 0 0" }}>{sublabel}</p>}
      </div>
    </div>
  );
}

export default function SupportingChanges() {
  const navigate = useNavigate();
  const { state, update } = useAppState();

  const currentAddress    = [state.licenceRecord?.address_line1, state.licenceRecord?.address_line2, state.licenceRecord?.parish].filter(Boolean).join(", ") || "—";
  const currentOccupation = state.licenceRecord?.occupation || "";

  // null = not answered, true = has changes, false = all correct
  const [hasChanges, setHasChanges] = useState(
    state.addressChangeRequested === true || (state.occupation && state.occupation !== currentOccupation) ? true : null
  );
  const [changeOccupation, setChangeOccupation] = useState(
    !!(state.occupation && state.occupation !== currentOccupation)
  );
  const [changeAddress, setChangeAddress] = useState(state.addressChangeRequested === true);

  const [occupation, setOccupation] = useState(state.occupation || currentOccupation);
  const [line1, setLine1]           = useState(state.newAddressLine1 || "");
  const [line2, setLine2]           = useState(state.newAddressLine2 || "");
  const [parish, setParish]         = useState(state.newParish || "");
  const [proofDocType, setProofDocType] = useState(state.proofOfAddressDocType || "");

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (changeOccupation && !occupation.trim()) e.occupation = "Please enter your occupation.";
    if (changeAddress) {
      if (!line1.trim()) e.line1 = "Address line 1 is required";
      if (!parish)       e.parish = "Parish is required";
      if (!proofDocType) e.proofDocType = "Please select a proof of address document type";
    }
    if (hasChanges && !changeOccupation && !changeAddress) e.noSelection = "Please select at least one item to update.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const occupationChanged = changeOccupation && occupation.trim() !== currentOccupation.trim();
      await api.patch(`/api/applicant/applications/${state.applicationId}`, {
        address_change_requested: changeAddress,
        ...(changeAddress ? { new_address_line1: line1.trim(), new_address_line2: line2.trim(), new_parish: parish } : {}),
        ...(occupationChanged ? { new_occupation: occupation.trim() } : {}),
      });
      update({
        addressChangeRequested: changeAddress,
        newAddressLine1:        changeAddress ? line1.trim() : "",
        newAddressLine2:        changeAddress ? line2.trim() : "",
        newParish:              changeAddress ? parish : "",
        proofOfAddressDocType:  changeAddress ? proofDocType : "",
        occupation:             changeOccupation ? occupation.trim() : currentOccupation,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      navigate("/apply/document-upload");
    } catch {
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
          Your Details
        </h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
          Confirm whether your occupation and address are still up to date.
        </p>
      </div>

      <StepCard>
        {/* Step 1 — Are details correct? */}
        <p style={{ fontSize: "15px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 6px" }}>
          Are all your details on record still correct?
        </p>
        <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
          This includes your occupation and address.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <ChoiceButton selected={hasChanges === false} onClick={() => { setHasChanges(false); setChangeOccupation(false); setChangeAddress(false); setErrors({}); }}>
            Yes, everything is correct
          </ChoiceButton>
          <ChoiceButton selected={hasChanges === true} onClick={() => { setHasChanges(true); setErrors({}); }}>
            No, I need to update something
          </ChoiceButton>
        </div>

        {/* Step 2 — What to update */}
        {hasChanges === true && (
          <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #f1f0ef" }}>
            <p style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 12px" }}>
              What would you like to update?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <CheckItem
                checked={changeOccupation}
                onChange={() => { setChangeOccupation(v => !v); setErrors({}); }}
                label="Occupation"
                sublabel={`Currently: ${currentOccupation || "—"}`}
              />
              <CheckItem
                checked={changeAddress}
                onChange={() => { setChangeAddress(v => !v); setErrors({}); }}
                label="Address"
                sublabel={`Currently: ${currentAddress}`}
              />
            </div>
            {errors.noSelection && <p style={{ ...errorText, marginTop: "10px" }}>{errors.noSelection}</p>}
          </div>
        )}

        {/* Occupation field */}
        {hasChanges === true && changeOccupation && (
          <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #f1f0ef" }}>
            <p style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 14px" }}>New Occupation</p>
            <label style={fieldLabel}>Occupation <span style={{ color: "#dc2626" }}>*</span></label>
            <input
              type="text"
              value={occupation}
              onChange={(e) => { setOccupation(e.target.value); if (errors.occupation) setErrors(p => ({ ...p, occupation: null })); }}
              placeholder="e.g. Teacher, Nurse, Driver"
              style={{ ...inputStyle, borderColor: errors.occupation ? "#dc2626" : "#e9e8e7" }}
              onFocus={(e) => e.target.style.borderColor = BRAND.primary}
              onBlur={(e) => e.target.style.borderColor = errors.occupation ? "#dc2626" : "#e9e8e7"}
            />
            {errors.occupation && <p style={errorText}>{errors.occupation}</p>}
          </div>
        )}

        {/* Address fields */}
        {hasChanges === true && changeAddress && (
          <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #f1f0ef" }}>
            <p style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 14px" }}>New Address</p>

            <div style={{ marginBottom: "16px" }}>
              <label style={fieldLabel}>Address Line 1 <span style={{ color: "#dc2626" }}>*</span></label>
              <input type="text" value={line1}
                onChange={(e) => { setLine1(e.target.value); if (errors.line1) setErrors(p => ({ ...p, line1: null })); }}
                placeholder="Street number and name"
                style={{ ...inputStyle, borderColor: errors.line1 ? "#dc2626" : "#e9e8e7" }}
                onFocus={(e) => e.target.style.borderColor = errors.line1 ? "#dc2626" : BRAND.primary}
                onBlur={(e) => e.target.style.borderColor = errors.line1 ? "#dc2626" : "#e9e8e7"}
              />
              {errors.line1 && <p style={errorText}>{errors.line1}</p>}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={fieldLabel}>Address Line 2 <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "400" }}>(optional)</span></label>
              <input type="text" value={line2} onChange={(e) => setLine2(e.target.value)}
                placeholder="Apartment, district, community"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = BRAND.primary}
                onBlur={(e) => e.target.style.borderColor = "#e9e8e7"}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={fieldLabel}>Parish <span style={{ color: "#dc2626" }}>*</span></label>
              <select value={parish}
                onChange={(e) => { setParish(e.target.value); if (errors.parish) setErrors(p => ({ ...p, parish: null })); }}
                style={{ ...inputStyle, borderColor: errors.parish ? "#dc2626" : "#e9e8e7", color: parish ? "#1b1c1c" : "#94a3b8" }}
                onFocus={(e) => e.target.style.borderColor = errors.parish ? "#dc2626" : BRAND.primary}
                onBlur={(e) => e.target.style.borderColor = errors.parish ? "#dc2626" : "#e9e8e7"}
              >
                <option value="">Select parish</option>
                {PARISHES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.parish && <p style={errorText}>{errors.parish}</p>}
            </div>

            <div style={{ borderTop: "1px solid #f1f0ef", paddingTop: "20px" }}>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 6px" }}>Proof of Address</p>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 14px" }}>Select the document type you will upload to verify your new address.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {PROOF_DOC_TYPES.map((doc) => {
                  const selected = proofDocType === doc.value;
                  return (
                    <div key={doc.value}
                      onClick={() => { setProofDocType(doc.value); if (errors.proofDocType) setErrors(p => ({ ...p, proofDocType: null })); }}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        border: `1.5px solid ${selected ? BRAND.primary : "#e9e8e7"}`,
                        borderRadius: "10px", padding: "12px 16px",
                        cursor: "pointer", background: selected ? "#eff6ff" : "white", transition: "all 0.15s",
                      }}>
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
              <div style={{ marginTop: "14px" }}>
                <InfoBanner type="info" message="You will upload your proof of address document in the next step. Accepted formats: PDF, JPG, PNG (max 5MB)." />
              </div>
            </div>
          </div>
        )}

        {errors.submit && (
          <div style={{ marginTop: "16px" }}>
            <InfoBanner type="error" message={errors.submit} />
          </div>
        )}
      </StepCard>

      <StepNav
        onBack={() => navigate("/apply/retrieve-record")}
        onContinue={handleContinue}
        continueDisabled={hasChanges === null}
        loading={saving}
        continueLabel="Save & Continue"
      />
    </StepLayout>
  );
}

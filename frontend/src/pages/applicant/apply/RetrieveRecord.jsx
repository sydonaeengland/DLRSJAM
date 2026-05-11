// Step 2 — confirms the licence record pulled from the TAJ system.
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StepLayout from "../../../components/layout/StepLayout";
import StepCard from "../../../components/apply/StepCard";
import StepNav from "../../../components/apply/StepNav";
import InfoBanner from "../../../components/apply/InfoBanner";
import { useAppState } from "../../../context/ApplicationContext";
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

const errText = { fontSize: "12px", color: "#dc2626", margin: "4px 0 0" };

function SectionLabel({ text }) {
  return (
    <p style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", margin: "24px 0 8px" }}>
      {text}
    </p>
  );
}

function calculateFee(transactionType, licenceClass, isExpired) {
  if (transactionType === "AMENDMENT")    return 4140;
  if (transactionType === "REPLACEMENT")  return 3000;
  if (transactionType === "RENEWAL") {
    if (licenceClass === "B") return 5400;
    if (licenceClass === "C") return 7200;
    return 7200;
  }
  return null;
}

function ChoiceBtn({ selected, onClick, children }) {
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
        background: selected ? BRAND.primary : "#f1f5f9",
        color: selected ? "white" : "#94a3b8",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "11px", fontWeight: "800", transition: "all 0.15s",
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
      display: "flex", alignItems: "flex-start", gap: "12px", padding: "13px 16px",
      borderRadius: "10px", border: `2px solid ${checked ? BRAND.primary : "#e2e8f0"}`,
      background: checked ? "#eff6ff" : "white", cursor: "pointer", transition: "all 0.15s",
    }}>
      <div style={{
        width: "20px", height: "20px", borderRadius: "5px", flexShrink: 0, marginTop: "1px",
        border: `2px solid ${checked ? BRAND.primary : "#d1d5db"}`,
        background: checked ? BRAND.primary : "white",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
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

export default function RetrieveRecord() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, update, reset } = useAppState();

  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [record, setRecord]       = useState(null);
  const [trnFlag, setTrnFlag]     = useState(null);
  const [hovered, setHovered]     = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Details update state — only relevant for RENEWAL
  const [hasChanges, setHasChanges]           = useState(null); // null | true | false
  const [changeOccupation, setChangeOccupation] = useState(false);
  const [changeAddress, setChangeAddress]       = useState(false);
  const [occupation, setOccupation]             = useState("");
  const [line1, setLine1]                       = useState("");
  const [line2, setLine2]                       = useState("");
  const [parish, setParish]                     = useState("");
  const [proofDocType, setProofDocType]         = useState("");

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  useEffect(() => {
    const resumeId = searchParams.get("resume");
    if (resumeId && !state.applicationId) {
      api.get("/api/applicant/applications")
        .then((res) => {
          const apps = res.data.applications ?? [];
          const draft = apps.find((a) => a.id === parseInt(resumeId));
          if (draft) {
            update({ applicationId: draft.id, applicationNumber: draft.application_number, transactionType: draft.transaction_type });
          }
        })
        .catch((err) => console.error("Resume error:", err));
    }
  }, []);

  useEffect(() => {
    const fetchLicence = async () => {
      try {
        const res = await api.get("/api/applicant/licence");
        const licence = res.data;

        if (state.transactionType === "AMENDMENT") {
          if (new Date(licence.expiry_date) < new Date()) {
            setError("Your licence is expired. Amendment is not available. Please go back and select Renewal instead.");
            setLoading(false);
            return;
          }
        }

        setRecord(licence);
        setOccupation(licence.occupation || "");
        update({ licenceRecord: licence, telephone: licence.telephone || "", email: licence.email || "", occupation: licence.occupation || "" });
      } catch (err) {
        setError(
          err.response?.status === 404
            ? "No licence record found for your account. Please contact TAJ."
            : "Something went wrong loading your record. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchLicence();
  }, []);

  const today      = new Date();
  const expiryDate = record ? new Date(record.expiry_date) : null;
  const isExpired  = expiryDate ? expiryDate < today : false;
  const isRenewal  = state.transactionType === "RENEWAL";

  const currentOccupation = record?.occupation || "";
  const currentAddress    = [record?.address_line1, record?.address_line2, record?.parish].filter(Boolean).join(", ") || "—";

  const validateDetails = () => {
    const e = {};
    if (hasChanges === true) {
      if (!changeOccupation && !changeAddress) { e.noSelection = "Please select at least one item to update."; }
      if (changeOccupation && !occupation.trim()) e.occupation = "Please enter your occupation.";
      if (changeAddress) {
        if (!line1.trim()) e.line1 = "Address line 1 is required";
        if (!parish)       e.parish = "Parish is required";
        if (!proofDocType) e.proofDocType = "Please select a proof of address document type";
      }
    }
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = async () => {
    if (!validateDetails()) return;
    setSaving(true);

    const fee = calculateFee(state.transactionType, record?.licence_class, isExpired);
    const addrChange   = hasChanges === true && changeAddress;
    const occuChanged  = hasChanges === true && changeOccupation && occupation.trim() !== currentOccupation.trim();

    try {
      if (state.applicationId) {
        await api.patch(`/api/applicant/applications/${state.applicationId}`, {
          fee_amount:               fee,
          trn_pending_flag:         trnFlag === "pending",
          address_change_requested: addrChange,
          ...(addrChange  ? { new_address_line1: line1.trim(), new_address_line2: line2.trim(), new_parish: parish } : {}),
          ...(occuChanged ? { new_occupation: occupation.trim() } : {}),
        });
      }

      update({
        trnPendingFlag:         trnFlag === "pending",
        feeAmount:              fee,
        addressChangeRequested: addrChange,
        newAddressLine1:        addrChange ? line1.trim() : "",
        newAddressLine2:        addrChange ? line2.trim() : "",
        newParish:              addrChange ? parish : "",
        proofOfAddressDocType:  addrChange ? proofDocType : "",
        occupation:             hasChanges === true && changeOccupation ? occupation.trim() : currentOccupation,
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
      navigate("/apply/document-upload");
    } catch {
      setFieldErrors({ submit: "Failed to save. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleExit = () => {
    if (window.confirm("Exit application? Your progress will not be saved.")) {
      reset();
      navigate("/dashboard");
    }
  };

  const fmt = (dateStr) => dateStr
    ? new Date(dateStr).toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  const CardIcon = ({ color = BRAND.primary }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );

  const OptionButton = ({ value, label, icon }) => {
    const isSelected = trnFlag === value;
    const isHov      = hovered === `trn_${String(value)}`;
    return (
      <button onClick={() => setTrnFlag(value)}
        onMouseEnter={() => setHovered(`trn_${String(value)}`)}
        onMouseLeave={() => setHovered(null)}
        style={{
          textAlign: "left", padding: "14px 16px", borderRadius: "10px", cursor: "pointer",
          border: `2px solid ${isSelected ? BRAND.primary : isHov ? "#cbd5e1" : "#e2e8f0"}`,
          background: isSelected ? "#eff6ff" : isHov ? "#f8fafc" : "white",
          fontSize: "14px", fontWeight: isSelected ? "600" : "400",
          color: isSelected ? BRAND.primary : "#475569",
          display: "flex", alignItems: "center", gap: "12px",
          transition: "all 0.15s", width: "100%",
          boxShadow: isSelected ? `0 0 0 3px ${BRAND.primary}18` : isHov ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        }}>
        <span style={{
          width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: isSelected ? BRAND.primary : "#f1f5f9",
          color: isSelected ? "white" : "#64748b",
          fontSize: "13px", fontWeight: "700", transition: "all 0.15s",
        }}>
          {isSelected ? "✓" : icon}
        </span>
        {label}
      </button>
    );
  };

  const detailsAnswered = hasChanges !== null;
  const canContinue     = record && trnFlag !== null && detailsAnswered;

  return (
    <StepLayout currentStep={1} onExit={handleExit}>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
          Step 2 of 8
        </p>
        <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#1b1c1c", margin: "0 0 6px", letterSpacing: "-0.4px" }}>
          Your Licence Record
        </h1>
        <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
          Review your current licence details before continuing.
        </p>
      </div>

      {/* Card 1 — Licence record */}
      <SectionLabel text="Your Current Licence" />
      <StepCard>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px", gap: "12px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: "14px", color: "#64748b" }}>Loading your record...</span>
          </div>
        ) : error ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <InfoBanner type="error" message={error} />
            <button onClick={() => navigate("/apply")}
              style={{ height: "44px", borderRadius: "10px", border: `1px solid ${BRAND.primary}`, background: "white", color: BRAND.primary, fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
              ← Back to Transaction Selection
            </button>
          </div>
        ) : record && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ background: `linear-gradient(135deg, ${BRAND.primaryDeep} 0%, ${BRAND.primary} 100%)`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "17px", fontWeight: "800", color: "white", margin: "0 0 2px", letterSpacing: "-0.3px" }}>{record.firstname} {record.lastname}</p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", margin: 0 }}>TRN: {record.trn}</p>
                </div>
                <span style={{ fontSize: "11px", fontWeight: "700", padding: "5px 12px", borderRadius: "20px", background: isExpired ? "#dc2626" : "rgba(255,255,255,0.2)", color: "white", letterSpacing: "0.05em" }}>
                  {isExpired ? "EXPIRED" : "ACTIVE"}
                </span>
              </div>

              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                  <CardIcon color={BRAND.primary} />
                  <span style={{ fontSize: "10px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.08em" }}>Front of Card</span>
                  <div style={{ position: "relative" }}>
                    <span onMouseEnter={() => setShowTooltip("front")} onMouseLeave={() => setShowTooltip(false)} style={{ cursor: "default", color: "#94a3b8", fontSize: "12px", marginLeft: "4px" }}>ⓘ</span>
                    {showTooltip === "front" && (
                      <div style={{ position: "absolute", left: "18px", top: "-4px", background: "#1b1c1c", color: "white", fontSize: "11px", padding: "6px 10px", borderRadius: "6px", whiteSpace: "nowrap", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                        These fields appear on the front of your physical licence
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid #f1f5f9" }}>
                  {[
                    { label: "Licence Class",  value: record.licence_class },
                    { label: "Control Number", value: record.control_number },
                    { label: "Collectorate",   value: record.collectorate || "—" },
                    { label: "Date Issued",    value: fmt(record.issue_date) },
                    { label: "Expiry Date",    value: fmt(record.expiry_date), expired: isExpired },
                    { label: "Status",         value: record.status },
                    { label: "Date of Birth",  value: fmt(record.date_of_birth) },
                    { label: "Sex",            value: record.sex || "—" },
                    { label: "Occupation",     value: record.occupation || "—" },
                  ].map(({ label, value, expired }, i) => (
                    <div key={label} style={{ padding: "10px 14px", borderRight: i % 3 !== 2 ? "1px solid #f1f5f9" : "none", borderBottom: "1px solid #f1f5f9" }}>
                      <p style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 3px" }}>{label}</p>
                      <p style={{ fontSize: "13px", fontWeight: "600", color: expired ? "#dc2626" : "#1b1c1c", margin: 0 }}>
                        {value}
                        {expired && <span style={{ fontSize: "10px", marginLeft: "5px", background: "#fef2f2", color: "#dc2626", padding: "1px 5px", borderRadius: "3px", fontWeight: "700" }}>EXPIRED</span>}
                      </p>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
                  <p style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 3px" }}>Address</p>
                  <p style={{ fontSize: "13px", fontWeight: "600", color: "#1b1c1c", margin: 0 }}>{[record.address_line1, record.address_line2, record.parish].filter(Boolean).join(", ") || "—"}</p>
                </div>
              </div>

              <div style={{ padding: "14px 20px", background: "#fafbfc" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                  <CardIcon color="#64748b" />
                  <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Back of Card</span>
                  <div style={{ position: "relative" }}>
                    <span onMouseEnter={() => setShowTooltip("back")} onMouseLeave={() => setShowTooltip(false)} style={{ cursor: "default", color: "#94a3b8", fontSize: "12px", marginLeft: "4px" }}>ⓘ</span>
                    {showTooltip === "back" && (
                      <div style={{ position: "absolute", left: "18px", top: "-4px", background: "#1b1c1c", color: "white", fontSize: "11px", padding: "6px 10px", borderRadius: "6px", whiteSpace: "nowrap", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                        These fields appear on the back of your physical licence
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid #e9e8e7" }}>
                  {[
                    { label: "Original Issue Date", value: fmt(record.first_issue_date) },
                    { label: "Nationality",         value: record.nationality || "—" },
                  ].map(({ label, value }, i) => (
                    <div key={label} style={{ padding: "10px 14px", borderRight: i === 0 ? "1px solid #e9e8e7" : "none" }}>
                      <p style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 3px" }}>{label}</p>
                      <p style={{ fontSize: "13px", fontWeight: "600", color: "#1b1c1c", margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {isExpired && isRenewal && (
              <InfoBanner type="warning" message="Your licence is expired. You can still proceed with a Renewal." />
            )}
            <InfoBanner type="info" message="If any of these details are incorrect, please visit your nearest TAJ office to have your record updated before proceeding." />
          </div>
        )}
      </StepCard>

      {/* Card 2 — TRN flag */}
      {record && (
        <>
          <SectionLabel text="Confirm Details" />
          <StepCard>
            <p style={{ fontSize: "15px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 4px" }}>Are these details correct?</p>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>Let us know if your TRN record has a pending update.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <OptionButton value="correct" label="Yes, my details are correct — proceed" icon="✓" />
              <OptionButton value="pending" label="No, my TRN details are pending a recent update" icon="⏳" />
            </div>
            {trnFlag === "pending" && (
              <div style={{ marginTop: "12px" }}>
                <InfoBanner type="warning" message="A note will be added to your application for the officer to verify your TRN record before approving." />
              </div>
            )}
          </StepCard>
        </>
      )}

      {/* Card 3 — Update details */}
      {record && (
        <>
          <SectionLabel text="Update Details" />
          <StepCard>
            <p style={{ fontSize: "15px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 4px" }}>
              Has your occupation or address changed?
            </p>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
              Any updates will be reviewed by an officer and applied to your renewed licence.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <ChoiceBtn selected={hasChanges === false} onClick={() => { setHasChanges(false); setChangeOccupation(false); setChangeAddress(false); setFieldErrors({}); }}>
                No, everything is up to date
              </ChoiceBtn>
              <ChoiceBtn selected={hasChanges === true} onClick={() => { setHasChanges(true); setFieldErrors({}); }}>
                Yes, I need to update something
              </ChoiceBtn>
            </div>

            {/* What to update */}
            {hasChanges === true && (
              <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #f1f0ef" }}>
                <p style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 10px" }}>What would you like to update?</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <CheckItem checked={changeOccupation} onChange={() => { setChangeOccupation(v => !v); setFieldErrors({}); }}
                    label="Occupation" sublabel={`Currently: ${currentOccupation || "—"}`} />
                  <CheckItem checked={changeAddress} onChange={() => { setChangeAddress(v => !v); setFieldErrors({}); }}
                    label="Address" sublabel={`Currently: ${currentAddress}`} />
                </div>
                {fieldErrors.noSelection && <p style={{ ...errText, marginTop: "10px" }}>{fieldErrors.noSelection}</p>}
              </div>
            )}

            {/* Occupation field */}
            {hasChanges === true && changeOccupation && (
              <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #f1f0ef" }}>
                <p style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 12px" }}>New Occupation</p>
                <label style={fieldLabel}>Occupation <span style={{ color: "#dc2626" }}>*</span></label>
                <input type="text" value={occupation}
                  onChange={(e) => { setOccupation(e.target.value); if (fieldErrors.occupation) setFieldErrors(p => ({ ...p, occupation: null })); }}
                  placeholder="e.g. Teacher, Nurse, Driver"
                  style={{ ...inputStyle, borderColor: fieldErrors.occupation ? "#dc2626" : "#e9e8e7" }}
                  onFocus={(e) => e.target.style.borderColor = BRAND.primary}
                  onBlur={(e) => e.target.style.borderColor = fieldErrors.occupation ? "#dc2626" : "#e9e8e7"}
                />
                {fieldErrors.occupation && <p style={errText}>{fieldErrors.occupation}</p>}
              </div>
            )}

            {/* Address fields */}
            {hasChanges === true && changeAddress && (
              <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #f1f0ef" }}>
                <p style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 12px" }}>New Address</p>

                <div style={{ marginBottom: "14px" }}>
                  <label style={fieldLabel}>Address Line 1 <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="text" value={line1}
                    onChange={(e) => { setLine1(e.target.value); if (fieldErrors.line1) setFieldErrors(p => ({ ...p, line1: null })); }}
                    placeholder="Street number and name"
                    style={{ ...inputStyle, borderColor: fieldErrors.line1 ? "#dc2626" : "#e9e8e7" }}
                    onFocus={(e) => e.target.style.borderColor = fieldErrors.line1 ? "#dc2626" : BRAND.primary}
                    onBlur={(e) => e.target.style.borderColor = fieldErrors.line1 ? "#dc2626" : "#e9e8e7"}
                  />
                  {fieldErrors.line1 && <p style={errText}>{fieldErrors.line1}</p>}
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={fieldLabel}>Address Line 2 <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "400" }}>(optional)</span></label>
                  <input type="text" value={line2} onChange={(e) => setLine2(e.target.value)}
                    placeholder="Apartment, district, community" style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = BRAND.primary}
                    onBlur={(e) => e.target.style.borderColor = "#e9e8e7"}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={fieldLabel}>Parish <span style={{ color: "#dc2626" }}>*</span></label>
                  <select value={parish}
                    onChange={(e) => { setParish(e.target.value); if (fieldErrors.parish) setFieldErrors(p => ({ ...p, parish: null })); }}
                    style={{ ...inputStyle, borderColor: fieldErrors.parish ? "#dc2626" : "#e9e8e7", color: parish ? "#1b1c1c" : "#94a3b8" }}
                    onFocus={(e) => e.target.style.borderColor = fieldErrors.parish ? "#dc2626" : BRAND.primary}
                    onBlur={(e) => e.target.style.borderColor = fieldErrors.parish ? "#dc2626" : "#e9e8e7"}
                  >
                    <option value="">Select parish</option>
                    {PARISHES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {fieldErrors.parish && <p style={errText}>{fieldErrors.parish}</p>}
                </div>

                <div style={{ borderTop: "1px solid #f1f0ef", paddingTop: "18px" }}>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 6px" }}>Proof of Address</p>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 12px" }}>Select the document type you will upload to verify your new address.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {PROOF_DOC_TYPES.map((doc) => {
                      const sel = proofDocType === doc.value;
                      return (
                        <div key={doc.value}
                          onClick={() => { setProofDocType(doc.value); if (fieldErrors.proofDocType) setFieldErrors(p => ({ ...p, proofDocType: null })); }}
                          style={{ display: "flex", alignItems: "center", gap: "12px", border: `1.5px solid ${sel ? BRAND.primary : "#e9e8e7"}`, borderRadius: "10px", padding: "12px 16px", cursor: "pointer", background: sel ? "#eff6ff" : "white", transition: "all 0.15s" }}>
                          <div style={{ width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0, border: `2px solid ${sel ? BRAND.primary : "#d1d5db"}`, background: sel ? BRAND.primary : "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {sel && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "white" }} />}
                          </div>
                          <span style={{ fontSize: "14px", color: sel ? BRAND.primary : "#374151", fontWeight: sel ? "600" : "400" }}>{doc.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  {fieldErrors.proofDocType && <p style={{ ...errText, marginTop: "8px" }}>{fieldErrors.proofDocType}</p>}
                  <div style={{ marginTop: "14px" }}>
                    <InfoBanner type="info" message="You will upload your proof of address document in the next step. Accepted formats: PDF, JPG, PNG (max 5MB)." />
                  </div>
                </div>
              </div>
            )}

            {fieldErrors.submit && (
              <div style={{ marginTop: "14px" }}>
                <InfoBanner type="error" message={fieldErrors.submit} />
              </div>
            )}
          </StepCard>
        </>
      )}

      <StepNav
        onBack={() => navigate("/apply")}
        onContinue={handleContinue}
        continueDisabled={!canContinue}
        loading={saving || loading}
      />
    </StepLayout>
  );
}

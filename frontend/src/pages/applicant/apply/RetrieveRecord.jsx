import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StepLayout from "../../../components/layout/StepLayout";
import StepCard from "../../../components/apply/StepCard";
import StepNav from "../../../components/apply/StepNav";
import InfoBanner from "../../../components/apply/InfoBanner";
import { useAppState } from "../../../context/ApplicationContext";
import { BRAND } from "../../../config/theme";
import api from "../../../services/api";

function SectionLabel({ text }) {
  return (
    <p style={{
      fontSize: "11px", fontWeight: "700", color: "#94a3b8",
      textTransform: "uppercase", letterSpacing: "0.1em",
      margin: "24px 0 8px",
    }}>
      {text}
    </p>
  );
}

function calculateFee(transactionType, licenceClass, isExpired) {
  if (transactionType === "AMENDMENT") return 4140;
  if (transactionType === "REPLACEMENT") return isExpired ? 7140 : 3000;
  if (transactionType === "RENEWAL") {
    if (licenceClass === "B") return 5400;
    if (licenceClass === "C") return 7200;
    return 7200; // default fallback
  }
  return null;
}

export default function RetrieveRecord() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, update, reset } = useAppState();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [record, setRecord] = useState(null);
  const [trnFlag, setTrnFlag] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  useEffect(() => {
    const resumeId = searchParams.get("resume");
    if (resumeId && !state.applicationId) {
      api.get("/api/applicant/applications")
        .then((res) => {
          const apps = res.data.applications ?? [];
          const draft = apps.find((a) => a.id === parseInt(resumeId));
          if (draft) {
            update({
              applicationId: draft.id,
              applicationNumber: draft.application_number,
              transactionType: draft.transaction_type,
            });
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
        update({
          licenceRecord: licence,
          telephone: licence.telephone || "",
          email: licence.email || "",
          occupation: licence.occupation || "",
        });
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

  const today = new Date();
  const expiryDate = record ? new Date(record.expiry_date) : null;
  const isExpired = expiryDate ? expiryDate < today : false;

  const handleContinue = () => {
    const fee = calculateFee(state.transactionType, record?.licence_class, isExpired);

    update({
      trnPendingFlag: trnFlag === "pending",
      feeAmount: fee,
    });

    // PATCH fee and TRN flag to backend
    if (state.applicationId) {
      api.patch(`/api/applicant/applications/${state.applicationId}`, {
        fee_amount: fee,
        trn_pending_flag: trnFlag === "pending",
      }).catch(() => {});
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    if (state.addressChangeRequested === true) {
      navigate("/apply/supporting-changes");
    } else {
      navigate("/apply/document-upload");
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

  const OptionButton = ({ value, label, icon, group }) => {
    const isSelected = group === "trn"
      ? trnFlag === value
      : state.addressChangeRequested === value;
    const isHov = hovered === `${group}_${String(value)}`;
    return (
      <button
        onClick={() => {
          if (group === "trn") setTrnFlag(value);
          else update({ addressChangeRequested: value });
        }}
        onMouseEnter={() => setHovered(`${group}_${String(value)}`)}
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
        }}
      >
        <span style={{
          width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: isSelected ? BRAND.primary : "#f1f5f9",
          color: isSelected ? "white" : "#64748b",
          fontSize: "13px", fontWeight: "700",
          transition: "all 0.15s",
        }}>
          {isSelected ? "✓" : icon}
        </span>
        {label}
      </button>
    );
  };

  const canContinue =
    record &&
    trnFlag !== null &&
    state.addressChangeRequested !== null &&
    state.addressChangeRequested !== undefined;

  return (
    <StepLayout currentStep={1} onExit={handleExit}>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
          Step 2 of 9
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
            <button
              onClick={() => navigate("/apply")}
              style={{ height: "44px", borderRadius: "10px", border: `1px solid ${BRAND.primary}`, background: "white", color: BRAND.primary, fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
            >
              ← Back to Transaction Selection
            </button>
          </div>
        ) : record && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>

              {/* Header */}
              <div style={{ background: `linear-gradient(135deg, ${BRAND.primaryDeep} 0%, ${BRAND.primary} 100%)`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "17px", fontWeight: "800", color: "white", margin: "0 0 2px", letterSpacing: "-0.3px" }}>
                    {record.firstname} {record.lastname}
                  </p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", margin: 0 }}>TRN: {record.trn}</p>
                </div>
                <span style={{
                  fontSize: "11px", fontWeight: "700", padding: "5px 12px", borderRadius: "20px",
                  background: isExpired ? "#dc2626" : "rgba(255,255,255,0.2)",
                  color: "white", letterSpacing: "0.05em",
                }}>
                  {isExpired ? "EXPIRED" : "ACTIVE"}
                </span>
              </div>

              {/* Front of card */}
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                  <CardIcon color={BRAND.primary} />
                  <span style={{ fontSize: "10px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.08em" }}>Front of Card</span>
                  <div style={{ position: "relative" }}>
                    <span
                      onMouseEnter={() => setShowTooltip("front")}
                      onMouseLeave={() => setShowTooltip(false)}
                      style={{ cursor: "default", color: "#94a3b8", fontSize: "12px", marginLeft: "4px" }}
                    >ⓘ</span>
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
                    <div key={label} style={{
                      padding: "10px 14px",
                      borderRight: i % 3 !== 2 ? "1px solid #f1f5f9" : "none",
                      borderBottom: "1px solid #f1f5f9",
                    }}>
                      <p style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 3px" }}>{label}</p>
                      <p style={{ fontSize: "13px", fontWeight: "600", color: expired ? "#dc2626" : "#1b1c1c", margin: 0 }}>
                        {value}
                        {expired && (
                          <span style={{ fontSize: "10px", marginLeft: "5px", background: "#fef2f2", color: "#dc2626", padding: "1px 5px", borderRadius: "3px", fontWeight: "700" }}>
                            EXPIRED
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                <div style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
                  <p style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 3px" }}>Address</p>
                  <p style={{ fontSize: "13px", fontWeight: "600", color: "#1b1c1c", margin: 0 }}>
                    {[record.address_line1, record.address_line2, record.parish].filter(Boolean).join(", ") || "—"}
                  </p>
                </div>
              </div>

              {/* Back of card */}
              <div style={{ padding: "14px 20px", background: "#fafbfc" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                  <CardIcon color="#64748b" />
                  <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Back of Card</span>
                  <div style={{ position: "relative" }}>
                    <span
                      onMouseEnter={() => setShowTooltip("back")}
                      onMouseLeave={() => setShowTooltip(false)}
                      style={{ cursor: "default", color: "#94a3b8", fontSize: "12px", marginLeft: "4px" }}
                    >ⓘ</span>
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

            {isExpired && state.transactionType === "RENEWAL" && (
              <InfoBanner type="warning" message="Your licence is expired. You can still proceed with a Renewal." />
            )}

            <InfoBanner type="info" message="If any of these details are incorrect, please visit your nearest TAJ office to have your record updated before proceeding." />
          </div>
        )}
      </StepCard>

      {/* Card 2 — Address change */}
      {record && (
        <>
          <SectionLabel text="Address" />
          <StepCard>
            <p style={{ fontSize: "15px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 4px" }}>
              Do you need to update your address?
            </p>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
              Your current address is shown above. Select yes if you have moved.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <OptionButton value={false} label="No, my address is correct" icon="✓" group="addr" />
              <OptionButton value={true}  label="Yes, I need to update my address" icon="📍" group="addr" />
            </div>
          </StepCard>
        </>
      )}

      {/* Card 3 — TRN flag */}
      {record && (
        <>
          <SectionLabel text="Confirm Details" />
          <StepCard>
            <p style={{ fontSize: "15px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 4px" }}>
              Are these details correct?
            </p>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
              Let us know if your TRN record has a pending update.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <OptionButton value="correct" label="Yes, my details are correct — proceed" icon="✓" group="trn" />
              <OptionButton value="pending" label="No, my TRN details are pending a recent update" icon="⏳" group="trn" />
            </div>
            {trnFlag === "pending" && (
              <div style={{ marginTop: "12px" }}>
                <InfoBanner type="warning" message="A note will be added to your application for the officer to verify your TRN record before approving." />
              </div>
            )}
          </StepCard>
        </>
      )}

      <StepNav
        onBack={() => navigate("/apply")}
        onContinue={handleContinue}
        continueDisabled={!canContinue}
        loading={loading}
      />
    </StepLayout>
  );
}
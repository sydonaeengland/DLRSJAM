import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StepLayout from "../../../components/layout/StepLayout";
import StepNav from "../../../components/apply/StepNav";
import InfoBanner from "../../../components/apply/InfoBanner";
import { useAppState } from "../../../context/ApplicationContext";
import { BRAND } from "../../../config/theme";
import api from "../../../services/api";

const TX_LABELS = {
  RENEWAL:     "Licence Renewal",
  REPLACEMENT: "Licence Replacement",
  AMENDMENT:   "Licence Amendment",
};

const TRANSACTIONS = [
  {
    id: "RENEWAL",
    title: "Licence Renewal",
    description: "Renew your driver's licence before or after it expires. Valid for 5 years from date of issue.",
    badge: "Most Common",
    badgeBg: "#dbeafe",
    badgeColor: "#1e40af",
    iconBg: "#2563eb",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
      </svg>
    ),
    docs: ["National ID (front & back)", "Existing licence (if no digital on file)", "Licence photo"],
    fee: "Class B: $5,400  ·  Class C: $7,200",
  },
  {
    id: "REPLACEMENT",
    title: "Licence Replacement",
    description: "Replace a lost or damaged licence. ITA verification required for lost licences.",
    badge: "Lost / Damaged",
    badgeBg: "#ffedd5",
    badgeColor: "#92400e",
    iconBg: "#f97316",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    docs: ["National ID (front & back)", "Existing licence if available", "Police report (optional)", "Licence photo"],
    fee: "Lost (valid): $3,000  ·  Lost (expired): $7,140",
  },
  {
    id: "AMENDMENT",
    title: "Licence Amendment",
    description: "Update your name on your licence after a TRN name change. Licence must not be expired.",
    badge: "Name Change",
    badgeBg: "#d1fae5",
    badgeColor: "#065f46",
    iconBg: "#10b981",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    docs: ["National ID (front & back)", "Licence photo"],
    fee: "Flat fee: $4,140",
  },
];

export default function TransactionSelection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, update } = useAppState();

  const [selected,    setSelected]    = useState(state.transactionType || null);
  const [hovered,     setHovered]     = useState(null);
  const [creating,    setCreating]    = useState(false);
  const [createError, setCreateError] = useState("");
  const [existingApp, setExistingApp] = useState(null); // { id, number, type }
  const [resuming,    setResuming]    = useState(false);

  useEffect(() => {
    const resumeId  = searchParams.get("resume");
    const typeParam = searchParams.get("type");

    if (resumeId) {
      setResuming(true);
      api.get("/api/applicant/applications")
        .then((res) => {
          const apps = res.data.applications ?? [];
          const draft = apps.find((a) => a.id === parseInt(resumeId));
          if (draft) {
            return api.get(`/api/applicant/applications/${draft.id}`)
              .then((detailRes) => {
                const d = detailRes.data;
                update({
                  applicationId:          d.id,
                  applicationNumber:      d.application_number,
                  transactionType:        d.transaction_type,
                  replacementReason:      d.replacement_reason      || null,
                  addressChangeRequested: d.address_change_requested || false,
                  newAddressLine1:        d.new_address_line1        || "",
                  newAddressLine2:        d.new_address_line2        || "",
                  newParish:              d.new_parish               || "",
                  trusteeCollection:      d.trustee_collection       || false,
                  trusteeName:            d.trustee_name             || "",
                  trusteeContact:         d.trustee_contact          || "",
                  pickupCollectorateCode: d.pickup_collectorate_code || "",
                  feeAmount:              d.fee_amount               || null,
                });
                navigate("/apply/retrieve-record");
              });
          } else {
            setResuming(false);
          }
        })
        .catch(() => setResuming(false));
    }

    if (typeParam) {
      const t = typeParam.toUpperCase();
      if (["RENEWAL", "REPLACEMENT", "AMENDMENT"].includes(t)) setSelected(t);
    }
  }, []);

  // Clear the duplicate block if user changes selection
  const handleSelect = (id) => {
    setSelected(id);
    setExistingApp(null);
    setCreateError("");
  };

  const handleContinue = async () => {
    if (!selected) return;
    setCreating(true);
    setCreateError("");
    setExistingApp(null);
    try {
      const res = await api.post("/api/applicant/applications", {
        transaction_type: selected,
      });
      update({
        transactionType:   selected,
        applicationId:     res.data.id,
        applicationNumber: res.data.application_number,
      });
      navigate("/apply/retrieve-record");
    } catch (err) {
      if (err.response?.status === 409) {
        // Duplicate — block and show info
        setExistingApp({
          id:     err.response.data.existing_application_id,
          number: err.response.data.existing_application_number,
          type:   selected,
        });
      } else {
        setCreateError(err.response?.data?.error || "Could not create application. Please try again.");
      }
    } finally {
      setCreating(false);
    }
  };

  if (resuming) {
    return (
      <StepLayout currentStep={0}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh", gap: "12px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: "14px", color: "#64748b" }}>Resuming your application...</span>
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout currentStep={0}>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
          Step 1 of 9
        </p>
        <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#1b1c1c", margin: "0 0 6px", letterSpacing: "-0.4px" }}>
          Select Transaction Type
        </h1>
        <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
          Choose the transaction you would like to complete.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {TRANSACTIONS.map((t) => {
          const isSelected = selected === t.id;
          const isHovered  = hovered === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                textAlign: "left", background: "white", borderRadius: "14px", padding: "22px",
                border: `2px solid ${isSelected ? BRAND.primary : isHovered ? "#cbd5e1" : "#e9e8e7"}`,
                boxShadow: isSelected
                  ? `0 0 0 3px ${BRAND.primary}22`
                  : isHovered ? "0 4px 16px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
                cursor: "pointer", transition: "all 0.15s", position: "relative",
              }}
            >
              {isSelected && (
                <div style={{ position: "absolute", top: "14px", right: "14px", width: "20px", height: "20px", borderRadius: "50%", background: BRAND.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}

              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: t.iconBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
                {t.icon}
              </div>

              <span style={{ fontSize: "10px", fontWeight: "700", padding: "3px 8px", borderRadius: "4px", background: t.badgeBg, color: t.badgeColor, letterSpacing: "0.04em" }}>
                {t.badge}
              </span>

              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1b1c1c", margin: "10px 0 6px" }}>{t.title}</h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 14px", lineHeight: 1.6 }}>{t.description}</p>

              <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 12px", marginBottom: "10px" }}>
                <p style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Documents</p>
                {t.docs.map((d) => (
                  <div key={d} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: BRAND.primary, flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: "#475569" }}>{d}</span>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>
                <span style={{ fontWeight: "600", color: "#475569" }}>Fee: </span>{t.fee}
              </p>
            </button>
          );
        })}
      </div>

      <InfoBanner type="info" message="Make sure your TRN details are up to date before proceeding. Name changes take up to 48 hours to sync from the TRN system." />

      {/* ── Duplicate block ── */}
      {existingApp && (
        <div style={{ marginTop: "16px", background: "#fefce8", border: "1.5px solid #fde047", borderRadius: "12px", padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fef08a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "14px", fontWeight: "800", color: "#78350f", margin: "0 0 4px" }}>
                You already have an active {TX_LABELS[existingApp.type]}
              </p>
              <p style={{ fontSize: "13px", color: "#92400e", margin: "0 0 14px", lineHeight: 1.6 }}>
                Application <strong style={{ fontFamily: "monospace" }}>{existingApp.number}</strong> is currently in progress.
                You cannot start a new {TX_LABELS[existingApp.type].toLowerCase()} until the existing one is completed or cancelled.
              </p>
              <button
                onClick={() => navigate(`/applications/${existingApp.id}`)}
                style={{
                  padding: "9px 20px", borderRadius: "8px", border: "none",
                  background: "#d97706", color: "white",
                  fontSize: "13px", fontWeight: "700", cursor: "pointer",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#b45309"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#d97706"}
              >
                View Existing Application →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Generic error ── */}
      {createError && (
        <div style={{ marginTop: "16px" }}>
          <InfoBanner type="error" message={createError} />
        </div>
      )}

      <StepNav
        onBack={() => navigate("/dashboard")}
        backLabel="Back to Dashboard"
        onContinue={handleContinue}
        continueDisabled={!selected || creating || !!existingApp}
        loading={creating}
        continueLabel="Continue"
      />
    </StepLayout>
  );
}
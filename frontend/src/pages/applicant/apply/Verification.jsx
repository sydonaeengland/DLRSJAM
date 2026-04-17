import { useNavigate } from "react-router-dom";
import StepLayout from "../../../components/layout/StepLayout";
import StepCard from "../../../components/apply/StepCard";
import StepNav from "../../../components/apply/StepNav";
import { BRAND } from "../../../config/theme";

export default function Verification() {
  const navigate = useNavigate();

  return (
    <StepLayout currentStep={4}>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
          Step 5 of 9
        </p>
        <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#1b1c1c", margin: "0 0 6px", letterSpacing: "-0.4px" }}>
          Identity Verification
        </h1>
        <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
          Live liveness check and face match against your National ID.
        </p>
      </div>

      <StepCard>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: "16px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#1b1c1c", margin: 0 }}>
            Verification Coming Soon
          </h2>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, maxWidth: "380px", lineHeight: 1.6 }}>
            Live liveness check and face match will be implemented here. For now, click Continue to proceed.
          </p>
        </div>
      </StepCard>

      <StepNav
        onBack={() => navigate("/apply/document-upload")}
        onContinue={() => { window.scrollTo({ top: 0, behavior: "smooth" }); navigate("/apply/review"); }}
        continueLabel="Continue to Review"
      />
    </StepLayout>
  );
}
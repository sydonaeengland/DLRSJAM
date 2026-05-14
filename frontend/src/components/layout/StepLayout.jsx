// Wrapper used by each apply-flow step — consistent padding and background.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BRAND } from "../../config/theme";
import coatOfArms from "../../assets/coat-of-arms.png";
import { useAppState } from "../../context/ApplicationContext";

const STEPS = [
  "Transaction",
  "Retrieve Record",
  "Documents",
  "Verification",
  "Review",
  "Declaration",
  "Payment",
  "Success",
];

export default function StepLayout({ children, currentStep, onExit }) {
  const navigate = useNavigate();
  const { state, reset } = useAppState();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const handleExit = () => {
    if (onExit) {
      // Step has its own exit handler (e.g. pre-application steps)
      onExit();
    } else if (state.applicationId) {
      // Draft exists in DB — just navigate, no data loss
      navigate("/dashboard");
    } else {
      // No draft yet — warn before discarding
      if (window.confirm("Exit application? Your progress will not be saved.")) {
        reset();
        navigate("/dashboard");
      }
    }
  };

  const exitLabel = state.applicationId ? "Save & Exit" : "Exit";

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#f5f6f8" }}>
      <header style={{ background: "white", borderBottom: "1px solid #e9e8e7", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
          <button onClick={() => navigate("/dashboard")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", padding: 0 }}>
            <img src={coatOfArms} alt="" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: "15px", fontWeight: "800", color: "#1b1c1c", letterSpacing: "-0.3px", lineHeight: 1 }}>DLRSJAM</div>
              <div style={{ fontSize: "9px", fontWeight: "600", color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.4 }}>New Application</div>
            </div>
          </button>
          <button
            onClick={handleExit}
            style={{ background: "none", border: "1px solid #e9e8e7", borderRadius: "8px", padding: "6px 14px", fontSize: "13px", color: "#64748b", cursor: "pointer", fontWeight: "500" }}
          >
            {exitLabel}
          </button>
        </div>
      </header>

      <div style={{ background: "#f5f6f8", padding: "14px 24px 0" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", background: "white", borderRadius: "12px", padding: "14px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", alignItems: "center" }}>
          {STEPS.map((label, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: "700",
                    background: done ? BRAND.primary : active ? BRAND.primary : "#eef0f3",
                    color: done || active ? "white" : "#94a3b8",
                    boxShadow: active ? `0 0 0 4px ${BRAND.primary}28` : "none",
                    transition: "all 0.2s",
                  }}>
                    {done ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <span style={{
                    fontSize: "9px", fontWeight: active ? "700" : "500",
                    color: active ? BRAND.primary : done ? "#475569" : "#b0b7c3",
                    whiteSpace: "nowrap",
                  }}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: "2px", margin: "0 4px 14px", background: done ? BRAND.primary : "#e9e8e7", transition: "background 0.3s" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "clamp(16px,4vw,32px) clamp(12px,4vw,24px) 64px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
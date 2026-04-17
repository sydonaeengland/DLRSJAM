import { useNavigate } from "react-router-dom";
import { BRAND } from "../../config/theme";
import coatOfArms from "../../assets/coat-of-arms.png";
import { useAppState } from "../../context/ApplicationContext";

const STEPS = [
  "Transaction",
  "Retrieve Record",
  "Changes",
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
      <header style={{ background: "white", borderBottom: "1px solid #e9e8e7", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px" }}>
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

      <div style={{ background: "white", borderBottom: "1px solid #f1f0ef", padding: "14px 24px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", display: "flex", alignItems: "center" }}>
          {STEPS.map((label, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{
                    width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "10px", fontWeight: "700",
                    background: done || active ? BRAND.primary : "#f1f0ef",
                    color: done || active ? "white" : "#94a3b8",
                    boxShadow: active ? `0 0 0 3px ${BRAND.primary}33` : "none",
                    transition: "all 0.2s",
                  }}>
                    {done ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <span style={{ fontSize: "8px", fontWeight: active ? "700" : "400", color: active ? BRAND.primary : done ? "#64748b" : "#94a3b8", whiteSpace: "nowrap" }}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: "2px", margin: "0 3px", marginBottom: "14px", background: done ? BRAND.primary : "#e9e8e7", transition: "background 0.3s" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 24px 64px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
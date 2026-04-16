import { BRAND } from "../../config/theme";

const STEPS = ["Verify", "Confirm", "Create"];

export default function StepIndicator({ step }) {
  return (
    <div className="flex items-center my-5">
      {STEPS.map((label, i) => {
        const num = i + 1;
        const isDone = step > num;
        const isActive = step === num;
        return (
          <div key={i} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? "1" : "0" }}>
            <div className="flex items-center gap-1.5">
              <div style={{
                width: "20px", height: "20px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px", fontWeight: "700", flexShrink: 0,
                backgroundColor: isDone || isActive ? BRAND.primary : "#f3f4f6",
                color: isDone || isActive ? "white" : "#9ca3af",
                transition: "all 0.3s ease",
              }}>
                {isDone ? (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : num}
              </div>
              <span style={{
                fontSize: "11px",
                fontWeight: isActive ? "600" : "400",
                color: isActive ? BRAND.primary : isDone ? "#6b7280" : "#d1d5db",
                transition: "color 0.3s ease",
              }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: "1.5px", margin: "0 8px",
                backgroundColor: isDone ? BRAND.primary : "#f3f4f6",
                transition: "background-color 0.3s ease",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
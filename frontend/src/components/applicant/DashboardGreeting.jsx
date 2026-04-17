import { useNavigate } from "react-router-dom";
import { BRAND } from "../../config/theme";

export default function DashboardGreeting({ firstName, isExpired, isExpiringSoon, daysUntilExpiry, expiryLabel }) {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const canRenew = isExpired || isExpiringSoon;

  const headline = hour < 12
    ? `Good morning, ${firstName}`
    : hour < 17
    ? `Good afternoon, ${firstName}`
    : `Good evening, ${firstName}`;

  return (
    <>
      <style>{`
        @keyframes greetingSlideIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-4px); }
          30%       { transform: translateX(4px); }
          45%       { transform: translateX(-3px); }
          60%       { transform: translateX(3px); }
          75%       { transform: translateX(-2px); }
          90%       { transform: translateX(2px); }
        }
        .greeting-card {
          animation: greetingSlideIn 0.35s ease both;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .greeting-card:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.08) !important;
          transform: translateY(-1px);
        }
      `}</style>

      <div
        className="greeting-card"
        style={{
          background: "white",
          border: "1px solid #e9e8e7",
          borderRadius: "16px",
          padding: "24px 28px",
          marginBottom: "28px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          display: "flex", alignItems: "center",
          justifyContent: "space-between", flexWrap: "wrap", gap: "16px",
          position: "relative", overflow: "hidden",
        }}
      >
        {/* Subtle decorative accent */}
        <div style={{
          position: "absolute", top: "-40px", right: "-40px",
          width: "160px", height: "160px", borderRadius: "50%",
          background: `radial-gradient(circle, ${BRAND.primary}0d 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <div>
          <h1 style={{
            fontSize: "clamp(18px, 2.5vw, 26px)", fontWeight: "800",
            color: "#1b1c1c", letterSpacing: "-0.4px", margin: "0 0 6px", lineHeight: 1.2,
          }}>
            {headline}
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 2px", lineHeight: 1.6 }}>
            Your licence is on file and your account is active. Have a great {timeOfDay}.
          </p>
          <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>
            {new Date().toLocaleDateString("en-JM", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <button
          onClick={canRenew ? () => navigate("/apply") : undefined}
          disabled={!canRenew}
          style={{
            background: canRenew ? BRAND.primary : "#e2e8f0",
            color: canRenew ? "white" : "#94a3b8",
            border: "none", borderRadius: "10px", padding: "11px 22px",
            fontSize: "14px", fontWeight: "700", flexShrink: 0,
            cursor: canRenew ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: "6px",
            boxShadow: canRenew ? "0 2px 10px rgba(37,99,235,0.3)" : "none",
            transition: "background 0.15s, box-shadow 0.15s",
            animation: isExpired ? "shake 0.6s ease 0.4s 1" : isExpiringSoon ? "shake 0.6s ease 0.8s 1" : "none",
          }}
          onMouseEnter={(e) => { if (canRenew) { e.currentTarget.style.background = BRAND.primaryDark; e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.4)"; } }}
          onMouseLeave={(e) => { if (canRenew) { e.currentTarget.style.background = BRAND.primary; e.currentTarget.style.boxShadow = "0 2px 10px rgba(37,99,235,0.3)"; } }}
        >
          Renew Licence
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </>
  );
}
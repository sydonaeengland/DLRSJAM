import { useNavigate } from "react-router-dom";
import { BRAND } from "../../config/theme";

export default function LicenceStatusCard({
  isExpired, isExpiringSoon, daysUntilExpiry, expiryLabel, expiryDate, issueDate, today,
}) {
  const navigate = useNavigate();
  const canRenew = isExpired || isExpiringSoon;

  const accentColor = isExpired ? "#dc2626" : isExpiringSoon ? "#d97706" : "#15803d";
  const bgColor = isExpired ? "#fef2f2" : isExpiringSoon ? "#fffbeb" : "white";
  const borderColor = isExpired ? "#fecaca" : isExpiringSoon ? "#fde68a" : "#e9e8e7";
  const iconBg = isExpired ? "#fee2e2" : isExpiringSoon ? "#fef3c7" : "#dcfce7";

  // Progress bar
  let pct = null;
  if (!isExpired && !isExpiringSoon && expiryDate) {
    const issued = issueDate
      ? new Date(issueDate)
      : new Date(expiryDate.getFullYear() - 5, expiryDate.getMonth(), expiryDate.getDate());
    const total = expiryDate.getTime() - issued.getTime();
    const elapsed = today.getTime() - issued.getTime();
    pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  // Days countdown display
  const daysDisplay = daysUntilExpiry !== null && daysUntilExpiry > 0 ? daysUntilExpiry : null;

  return (
    <div style={{
      background: bgColor, borderRadius: "14px",
      border: `1px solid ${borderColor}`,
      padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      overflow: "hidden", position: "relative",
    }}>
      {/* Subtle glow for valid state */}
      {!canRenew && (
        <div style={{
          position: "absolute", top: "-30px", right: "-30px",
          width: "120px", height: "120px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
      )}

      {/* Icon — top */}
      <div style={{
        width: "44px", height: "44px", borderRadius: "50%",
        background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: accentColor, marginBottom: "14px",
      }}>
        {canRenew ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        )}
      </div>

      {/* Title + days countdown */}
      <div style={{ marginBottom: "8px" }}>
        <p style={{ fontSize: "16px", fontWeight: "800", color: "#1b1c1c", margin: "0 0 2px", letterSpacing: "-0.2px" }}>
          {isExpired ? "Licence Expired" : isExpiringSoon ? "Expiring Soon" : "Licence is Valid"}
        </p>
        {/* Days counter — prominent when nearing expiry or valid */}
        {daysDisplay !== null && (
          <p style={{ fontSize: "26px", fontWeight: "800", color: accentColor, margin: "4px 0 0", letterSpacing: "-1px", lineHeight: 1 }}>
            {daysDisplay}
            <span style={{ fontSize: "13px", fontWeight: "600", color: accentColor, marginLeft: "5px", letterSpacing: "0" }}>
              days remaining
            </span>
          </p>
        )}
      </div>

      <p style={{ fontSize: "13px", color: isExpired ? "#991b1b" : isExpiringSoon ? "#92400e" : "#64748b", margin: "0 0 14px", lineHeight: 1.5 }}>
        {isExpired
          ? "You cannot legally drive. Please renew your licence immediately to avoid penalties."
          : isExpiringSoon
          ? `Licence expires ${expiryLabel}. Renew early to skip the last-minute rush.`
          : `Valid until ${expiryLabel} — no action needed right now.`}
      </p>

      {/* Progress bar — valid state only */}
      {pct !== null && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>Term progress</span>
            <span style={{ fontSize: "11px", fontWeight: "600", color: "#15803d" }}>{pct}% used</span>
          </div>
          <div style={{ height: "5px", borderRadius: "99px", background: "#e9e8e7", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`, borderRadius: "99px",
              background: "linear-gradient(90deg, #22c55e, #15803d)",
              transition: "width 0.6s ease",
            }} />
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={canRenew ? () => navigate("/apply") : undefined}
        disabled={!canRenew}
        style={{
          background: isExpired ? "#dc2626" : isExpiringSoon ? "#d97706" : "#f1f5f9",
          color: canRenew ? "white" : "#94a3b8",
          border: "none", borderRadius: "8px", padding: "9px 18px",
          fontSize: "13px", fontWeight: "700",
          cursor: canRenew ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", gap: "5px",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { if (isExpired) e.currentTarget.style.background = "#b91c1c"; else if (isExpiringSoon) e.currentTarget.style.background = "#b45309"; }}
        onMouseLeave={(e) => { if (isExpired) e.currentTarget.style.background = "#dc2626"; else if (isExpiringSoon) e.currentTarget.style.background = "#d97706"; }}
      >
        {canRenew ? (
          <>
            Renew Now
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </>
        ) : (
          <>
            Renewal not due yet
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
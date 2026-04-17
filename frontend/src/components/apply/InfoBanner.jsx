const VARIANTS = {
  info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", icon: "ℹ" },
  warning: { bg: "#fffbeb", border: "#fde68a", color: "#92400e", icon: "⚠" },
  error:   { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", icon: "✕" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#14532d", icon: "✓" },
};

export default function InfoBanner({ type = "info", message, children }) {
  const v = VARIANTS[type];
  return (
    <div style={{
      background: v.bg, border: `1px solid ${v.border}`,
      borderLeft: `4px solid ${v.border}`,
      borderRadius: "10px", padding: "14px 16px",
      display: "flex", gap: "10px", alignItems: "flex-start",
    }}>
      <span style={{ fontSize: "14px", color: v.color, fontWeight: "700", flexShrink: 0, marginTop: "1px" }}>{v.icon}</span>
      <div style={{ fontSize: "14px", color: v.color, lineHeight: 1.6 }}>
        {message || children}
      </div>
    </div>
  );
}
export default function FieldGroup({ label, required, error, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <label style={{ fontSize: "14px", fontWeight: "600", color: "#1b1c1c" }}>
          {label}
          {required && <span style={{ color: "#dc2626", marginLeft: "3px" }}>*</span>}
        </label>
      )}
      {hint && <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>{hint}</p>}
      {children}
      {error && (
        <p style={{ fontSize: "12px", color: "#dc2626", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
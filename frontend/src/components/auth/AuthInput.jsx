import { useState } from "react";
import { BRAND } from "../../config/theme";

export default function AuthInput({
  label, type = "text", name, value, onChange,
  placeholder, required = false, right, style: extraStyle, autoComplete,
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  const inputStyle = {
    width: "100%",
    padding: isPassword ? "8px 34px 8px 12px" : "8px 12px",
    fontSize: "13px",
    borderRadius: "8px",
    border: `1px solid ${focused ? BRAND.primary : "#e5e7eb"}`,
    outline: "none",
    color: "#111827",
    backgroundColor: "white",
    fontFamily: "inherit",
    boxSizing: "border-box",
    boxShadow: focused ? `0 0 0 3px ${BRAND.primary}22` : "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    ...extraStyle,
  };

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-600">{label}</label>
          {right && <span>{right}</span>}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <input
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          style={inputStyle}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: "absolute", right: "10px", top: "50%",
              transform: "translateY(-50%)", background: "none",
              border: "none", cursor: "pointer", padding: 0,
              color: "#9ca3af", display: "flex", alignItems: "center",
            }}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
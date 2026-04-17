import { BRAND } from "../../config/theme";

export default function StepNav({ onBack, onContinue, loading, continueLabel = "Continue", backLabel = "Back", continueDisabled = false }) {
  return (
    <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
      {onBack && (
        <button
          onClick={onBack}
          disabled={loading}
          style={{
            flex: 1, height: "48px", borderRadius: "10px",
            border: "1px solid #e9e8e7", background: "white",
            fontSize: "15px", fontWeight: "600", color: "#64748b",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#f5f6f8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
        >
          ← {backLabel}
        </button>
      )}
      <button
        onClick={onContinue}
        disabled={loading || continueDisabled}
        style={{
          flex: 2, height: "48px", borderRadius: "10px",
          border: "none", background: loading || continueDisabled ? "#94a3b8" : BRAND.primary,
          fontSize: "15px", fontWeight: "700", color: "white",
          cursor: loading || continueDisabled ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { if (!loading && !continueDisabled) e.currentTarget.style.background = BRAND.primaryDark; }}
        onMouseLeave={(e) => { if (!loading && !continueDisabled) e.currentTarget.style.background = BRAND.primary; }}
      >
        {loading ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Processing...
          </>
        ) : `${continueLabel} →`}
      </button>
    </div>
  );
}
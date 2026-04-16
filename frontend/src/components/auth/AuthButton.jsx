import { BRAND } from "../../config/theme";

export default function AuthButton({ children, loading, loadingText, onClick, variant = "primary" }) {
  const isSecondary = variant === "secondary";
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={loading}
      className="w-full py-2 rounded-lg text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: isSecondary ? "white" : `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%)`,
        color: isSecondary ? "#6b7280" : "white",
        border: isSecondary ? "1px solid #e5e7eb" : "none",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.9"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          {loadingText}
        </span>
      ) : children}
    </button>
  );
}
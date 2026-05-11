import { useState } from "react";
import api from "../../services/api";

const INPUT_STYLE = {
  width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "10px",
  padding: "10px 12px", fontSize: "14px", fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};

export default function ChangePasswordModal({ onClose }) {
  const [currentPw,    setCurrentPw]    = useState("");
  const [newPw,        setNewPw]        = useState("");
  const [confirmNewPw, setConfirmNewPw] = useState("");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState(null);
  const [success,      setSuccess]      = useState(false);

  const canSave = currentPw && newPw && confirmNewPw;

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await api.post("/api/auth/change-password", {
        current_password: currentPw,
        new_password: newPw,
        confirm_password: confirmNewPw,
      });
      setCurrentPw(""); setNewPw(""); setConfirmNewPw("");
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
      onClick={onClose}
    >
      <div
        style={{ background: "white", borderRadius: "16px", padding: "28px", maxWidth: "400px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <p style={{ fontSize: "16px", fontWeight: "800", color: "#111827", margin: 0 }}>Change Password</p>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: "2px 0 0" }}>Update your account password</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#374151", display: "block", marginBottom: "6px" }}>Current password</label>
            <input type="password" value={currentPw} onChange={e => { setCurrentPw(e.target.value); setError(null); setSuccess(false); }}
              placeholder="Enter current password" style={INPUT_STYLE} autoFocus />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#374151", display: "block", marginBottom: "6px" }}>New password</label>
            <input type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setError(null); setSuccess(false); }}
              placeholder="At least 8 characters" style={INPUT_STYLE} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#374151", display: "block", marginBottom: "6px" }}>Confirm new password</label>
            <input type="password" value={confirmNewPw} onChange={e => { setConfirmNewPw(e.target.value); setError(null); setSuccess(false); }}
              placeholder="Re-enter new password" style={INPUT_STYLE} />
          </div>
        </div>

        {error && (
          <p style={{ fontSize: "12px", color: "#dc2626", marginTop: "12px", padding: "10px 12px", background: "#fef2f2", borderRadius: "8px" }}>{error}</p>
        )}
        {success && (
          <p style={{ fontSize: "12px", color: "#15803d", marginTop: "12px", padding: "10px 12px", background: "#f0fdf4", borderRadius: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l5 5L20 7" /></svg>
            Password changed successfully.
          </p>
        )}

        <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "13px", fontWeight: "600", color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
            {success ? "Close" : "Cancel"}
          </button>
          <button onClick={save} disabled={saving || !canSave}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: saving || !canSave ? "#94a3b8" : "#1e3a8a", color: "white", fontSize: "13px", fontWeight: "700", cursor: saving || !canSave ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "Updating…" : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

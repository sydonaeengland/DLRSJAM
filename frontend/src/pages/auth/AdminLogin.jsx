import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { login as loginService } from "../../services/authService"
import AuthInput from "../../components/auth/AuthInput"
import AuthButton from "../../components/auth/AuthButton"

export default function AdminLogin() {
  const [adminId, setAdminId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const data = await loginService(adminId, password)
      if (data.user.role !== "admin") {
        setError("Access denied. Admin credentials required.")
        return
      }
      login(data.user, data.token)
      navigate("/admin")
    } catch (err) {
      setError(err.response?.data?.error || "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: "100vh", width: "100vw", background: "#030712", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", fontFamily: "monospace", position: "relative" }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } input::placeholder { color: rgba(255,255,255,0.2); } input { font-family: monospace; }`}</style>

      {/* Grid */}
      <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", opacity: 0.04, pointerEvents: "none" }}>
        {Array.from({ length: 40 }).map((_, i) => <line key={`h${i}`} x1="0" y1={`${i * 2.5}%`} x2="100%" y2={`${i * 2.5}%`} stroke="#dc2626" strokeWidth="0.5" />)}
        {Array.from({ length: 60 }).map((_, i) => <line key={`v${i}`} x1={`${i * 1.67}%`} y1="0" x2={`${i * 1.67}%`} y2="100%" stroke="#dc2626" strokeWidth="0.5" />)}
      </svg>

      {/* Orbs */}
      <div style={{ position: "fixed", width: "40vw", height: "40vw", borderRadius: "50%", background: "rgba(220,38,38,0.04)", top: "-10%", left: "-10%", pointerEvents: "none" }} />
      <div style={{ position: "fixed", width: "30vw", height: "30vw", borderRadius: "50%", background: "rgba(220,38,38,0.05)", bottom: "-8%", right: "-8%", pointerEvents: "none" }} />

      {/* Top bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, background: "rgba(0,0,0,0.8)", borderBottom: "1px solid rgba(220,38,38,0.2)", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "10px", letterSpacing: "2px" }}>DLRSJAM SYSTEM</span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#dc2626" }} />
          <span style={{ color: "rgba(220,38,38,0.6)", fontSize: "10px", letterSpacing: "2px" }}>RESTRICTED</span>
        </div>
      </div>

      {/* Card */}
      <div style={{ background: "#0a0a0a", border: "1px solid rgba(220,38,38,0.2)", borderTop: "2px solid #dc2626", borderRadius: "4px", padding: "clamp(24px,4vh,40px) clamp(24px,3vw,40px)", width: "100%", maxWidth: "360px", position: "relative", zIndex: 1, boxShadow: "0 0 60px rgba(220,38,38,0.08)" }}>

        {/* Lock icon */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ width: "44px", height: "44px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "4px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <p style={{ color: "#dc2626", fontSize: "10px", letterSpacing: "3px", fontWeight: "bold", marginBottom: "6px" }}>SYSTEM ADMINISTRATION</p>
          <h1 style={{ color: "white", fontSize: "22px", fontWeight: "800", letterSpacing: "1px", marginBottom: "3px" }}>DLRSJAM</h1>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px" }}>Administrative Control Interface</p>
        </div>

        {/* Warning */}
        <div style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.18)", borderRadius: "4px", padding: "9px 12px", marginBottom: "20px" }}>
          <p style={{ color: "rgba(220,38,38,0.75)", fontSize: "11px", letterSpacing: "0.3px" }}>HIGH SECURITY ZONE — All access attempts are logged and monitored</p>
        </div>

        <AuthInput label="Administrator ID" type="email" value={adminId} onChange={(e) => setAdminId(e.target.value)} placeholder="admin@taj.gov.jm" required dark />
        <AuthInput label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" required dark />

        {error && (
          <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#f87171", fontSize: "12px", borderRadius: "4px", padding: "8px 12px", marginBottom: "14px" }}>
            {error}
          </div>
        )}

        <AuthButton loading={loading} loadingText="AUTHENTICATING..." color="#7f1d1d">AUTHENTICATE</AuthButton>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.1)", fontSize: "10px", marginTop: "14px", letterSpacing: "1px" }}>
          SESSION MONITORED • ALL ACTIONS LOGGED
        </p>
      </div>

      <p style={{ color: "rgba(255,255,255,0.08)", fontSize: "10px", marginTop: "16px", letterSpacing: "1px", position: "relative", zIndex: 1 }}>
        © 2026 TAX ADMINISTRATION JAMAICA — CONFIDENTIAL
      </p>
    </div>
  )
}
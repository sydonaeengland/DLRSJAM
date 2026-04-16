import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { login as loginService } from "../../services/authService"
import AuthInput from "../../components/auth/AuthInput"
import AuthButton from "../../components/auth/AuthButton"
import CoatOfArms from "../../components/auth/CoatOfArms"

export default function StaffLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const data = await loginService(email, password)
      const role = data.user.role
      if (role !== "officer" && role !== "supervisor") {
        setError("Access denied. This portal is for TAJ staff only.")
        return
      }
      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem("token", data.token)
      storage.setItem("user", JSON.stringify(data.user))
      login(data.user, data.token)
      if (role === "supervisor") navigate("/supervisor")
      else navigate("/officer")
    } catch (err) {
      setError(err.response?.data?.error || "Invalid staff credentials")
    } finally {
      setLoading(false)
    }
  }

  const FormContent = () => (
    <form onSubmit={handleLogin}>
      {/* Warning banner */}
      <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "8px", padding: "10px 14px", marginBottom: "20px", display: "flex", gap: "8px", alignItems: "center" }}>
        <span style={{ color: "#d97706" }}>⚠</span>
        <span style={{ color: "#92400e", fontSize: "12px", fontWeight: "600" }}>Restricted Access — Authorized Personnel Only</span>
      </div>

      <AuthInput label="Staff Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="officer@taj.gov.jm" required />
      <AuthInput label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" required />

      {/* Remember me */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", marginTop: "-8px" }}>
        <input type="checkbox" id="rm-staff" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
          style={{ width: "15px", height: "15px", accentColor: "#006B3F", cursor: "pointer" }} />
        <label htmlFor="rm-staff" style={{ fontSize: "13px", color: "#666", cursor: "pointer" }}>Remember me</label>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "13px", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      <AuthButton loading={loading} loadingText="Authenticating..." color="#006B3F">Secure Sign In</AuthButton>

      <p style={{ textAlign: "center", fontSize: "12px", color: "#aaa", marginTop: "14px" }}>
        Forgot credentials?{" "}
        <span style={{ color: "#1a3a7a", fontWeight: "700", cursor: "pointer" }}>Contact IT Support</span>
      </p>
    </form>
  )

  // ── MOBILE ──────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ height: "100vh", width: "100vw", background: "#060d1f", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } input::placeholder { color: #bbb; } input { font-family: inherit; }`}</style>

        {/* Top bar */}
        <div style={{ background: "#0a1628", borderBottom: "1px solid rgba(255,215,0,0.12)", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CoatOfArms size={24} />
            <span style={{ color: "white", fontWeight: "800", fontSize: "14px" }}>DLRS<span style={{ color: "#FFD700" }}>JAM</span></span>
          </div>
          <span style={{ color: "#FFD700", fontSize: "9px", letterSpacing: "2px" }}>STAFF PORTAL</span>
        </div>

        {/* Crawler */}
        <div style={{ background: "rgba(255,215,0,0.07)", borderBottom: "1px solid rgba(255,215,0,0.1)", padding: "5px 0", overflow: "hidden", flexShrink: 0 }}>
          <style>{`@keyframes crawl { from { transform: translateX(100vw); } to { transform: translateX(-100%); } }`}</style>
          <div style={{ display: "inline-block", whiteSpace: "nowrap", color: "#FFD700", fontSize: "9px", letterSpacing: "2px", fontWeight: "bold", animation: "crawl 20s linear infinite" }}>
            &nbsp;&nbsp;&nbsp;TAJ STAFF PORTAL — AUTHORIZED PERSONNEL ONLY &nbsp;•&nbsp; SESSION MONITORED &nbsp;•&nbsp; ALL ACTIONS LOGGED &nbsp;&nbsp;&nbsp;
          </div>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflow: "auto", padding: "28px 24px" }}>
          <h1 style={{ color: "white", fontSize: "24px", fontWeight: "800", marginBottom: "4px" }}>TAJ Staff Portal</h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px", marginBottom: "24px" }}>Licence Operations & Review System</p>
          <div style={{ background: "white", borderRadius: "12px", padding: "24px" }}>
            <FormContent />
          </div>
        </div>
      </div>
    )
  }

  // ── DESKTOP ─────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", width: "100vw", background: "#060d1f", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes crawl { from { transform: translateX(100vw); } to { transform: translateX(-100%); } }
        input::placeholder { color: #bbb; } input { font-family: inherit; }
      `}</style>

      {/* Top nav */}
      <div style={{ background: "#0a1628", borderBottom: "1px solid rgba(255,215,0,0.12)", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <CoatOfArms size={30} />
          <span style={{ color: "white", fontWeight: "800", fontSize: "16px", letterSpacing: "1px" }}>DLRS<span style={{ color: "#FFD700" }}>JAM</span></span>
        </div>
        <span style={{ color: "#FFD700", fontSize: "10px", letterSpacing: "3px", fontWeight: "bold" }}>TAJ INTERNAL SYSTEM</span>
      </div>

      {/* Crawler */}
      <div style={{ background: "rgba(255,215,0,0.07)", borderBottom: "1px solid rgba(255,215,0,0.1)", padding: "6px 0", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ display: "inline-block", whiteSpace: "nowrap", color: "#FFD700", fontSize: "10px", letterSpacing: "2.5px", fontWeight: "bold", animation: "crawl 22s linear infinite" }}>
          &nbsp;&nbsp;&nbsp;TAJ STAFF PORTAL — AUTHORIZED PERSONNEL ONLY &nbsp;•&nbsp; SESSION MONITORED &nbsp;•&nbsp; ALL ACTIONS LOGGED &nbsp;•&nbsp; ENCRYPTION: AES-256 &nbsp;&nbsp;&nbsp;
        </div>
      </div>

      {/* Background grid */}
      <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", opacity: 0.03, pointerEvents: "none", zIndex: 0 }}>
        {Array.from({ length: 30 }).map((_, i) => <line key={`h${i}`} x1="0" y1={`${i * 3.33}%`} x2="100%" y2={`${i * 3.33}%`} stroke="#FFD700" strokeWidth="0.5" />)}
        {Array.from({ length: 40 }).map((_, i) => <line key={`v${i}`} x1={`${i * 2.5}%`} y1="0" x2={`${i * 2.5}%`} y2="100%" stroke="#FFD700" strokeWidth="0.5" />)}
      </svg>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", zIndex: 1, overflow: "hidden" }}>
        <h1 style={{ color: "white", fontSize: "clamp(22px,3vw,36px)", fontWeight: "800", marginBottom: "6px", textAlign: "center" }}>TAJ Staff Portal</h1>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px", marginBottom: "28px", textAlign: "center" }}>Licence Operations & Review System</p>

        {/* Two column card */}
        <div style={{ display: "flex", borderRadius: "14px", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", border: "1px solid rgba(255,215,0,0.12)", width: "100%", maxWidth: "680px" }}>
          {/* Left dark panel */}
          <div style={{ width: "40%", background: "#1a3a7a", padding: "32px 24px", display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,215,0,0.15)" }}>
            <div style={{ color: "#FFD700", fontSize: "10px", letterSpacing: "3px", fontWeight: "bold", marginBottom: "20px" }}>AUTHORIZED ACCESS</div>
            <div style={{ flex: 1 }}>
              {[
                "Review and process licence applications",
                "Verify applicant documents and identity",
                "Approve, return or escalate decisions",
                "Coordinate ITA clearance requests",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "14px", alignItems: "flex-start" }}>
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#FFD700", marginTop: "5px", flexShrink: 0 }} />
                  <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px", letterSpacing: "1px" }}>SESSION ENCRYPTION: AES-256</span>
              </div>
            </div>
          </div>

          {/* Right white panel */}
          <div style={{ flex: 1, background: "white", padding: "32px 28px" }}>
            <FormContent />
          </div>
        </div>

        <p style={{ color: "rgba(255,255,255,0.12)", fontSize: "10px", marginTop: "20px", letterSpacing: "1px" }}>
          © 2026 Tax Administration Jamaica — Confidential
        </p>
      </div>
    </div>
  )
}
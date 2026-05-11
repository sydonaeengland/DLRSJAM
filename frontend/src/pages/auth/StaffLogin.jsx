// Shared login page for officers and supervisors.
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { staffLogin } from "../../services/authService";
import coatOfArms from "../../assets/coat-of-arms.png";
import { BRAND } from "../../config/theme";
import styles from "./StaffLogin.module.css";

export default function StaffLogin() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [mounted,  setMounted]  = useState(false);
  const [authStep, setAuthStep] = useState(0); // 0=idle 1=verifying 2=granted


  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setAuthStep(1);
    try {
      const data = await staffLogin(email, password);
      const role = data.user.role;

      if (role !== "officer" && role !== "supervisor") {
        setAuthStep(0);
        setLoading(false);
        setError(
          role === "admin"
            ? "Administrators must use the admin portal to sign in."
            : "Access denied. This portal is for TAJ staff only."
        );
        return;
      }

      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      login(data.user, data.token, true);
      setAuthStep(2);

      setTimeout(() => {
        if (role === "supervisor") navigate("/supervisor");
        else navigate("/officer");
      }, 2800);

    } catch (err) {
      setAuthStep(0);
      setLoading(false);
      setError(err.response?.data?.error || "Invalid staff credentials. Please try again.");
    }
  };

  const FEATURES = [
    { d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",                                                                                       text: "Secure, role-based access control" },
    { d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", text: "Review and process licence applications" },
    { d: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",                              text: "Authorised TAJ personnel only" },
  ];

  const INFO_CARDS = [
    { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",                                                                                    title: "Encrypted",  sub: "TLS 1.3 in transit" },
    { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", title: "Role-based", sub: "Auto-routed by role" },
  ];

  return (
    <div className={styles.root}>

      {/* Auth overlay */}
      {authStep > 0 && (
        <div className={styles.overlay}>
          <div className={styles.overlayCard}>

            {authStep === 1 && <div className={styles.scanLine} />}

            <div className={styles.spinnerWrap}>
              {authStep === 1 ? (
                <>
                  <svg width="88" height="88" viewBox="0 0 88 88" className={styles.ringOuter}>
                    <circle cx="44" cy="44" r="40" fill="none" stroke={BRAND.primary} strokeWidth="2.5"
                      strokeDasharray="62 190" strokeLinecap="round" />
                  </svg>
                  <svg width="88" height="88" viewBox="0 0 88 88" className={styles.ringInner}>
                    <circle cx="44" cy="44" r="30" fill="none" stroke={`${BRAND.primary}25`} strokeWidth="1.5"
                      strokeDasharray="22 166" strokeLinecap="round" />
                  </svg>
                  <div className={styles.crestCircle}>
                    <img src={coatOfArms} alt="" className={styles.crestImg} />
                  </div>
                </>
              ) : (
                <div className={styles.checkCircle}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </div>

            <p className={styles.overlayTitle}>
              {authStep === 1 ? "Authenticating" : "Access Granted"}
            </p>
            <p className={styles.overlaySub}>
              {authStep === 1
                ? <>Verifying your TAJ credentials<br />and establishing a secure session…</>
                : <>Identity confirmed. Redirecting you<br />to your dashboard now…</>}
            </p>

            <div className={styles.progressWrap}>
              {authStep === 1
                ? <div className={styles.progressBar} />
                : <div className={styles.progressGranted} />}
            </div>

            <div className={styles.overlayFooter}>
              {authStep === 2 ? (
                <div>
                  {[
                    { label: "Session",     badge: "ACTIVE", isLabel: true },
                    { label: "Authority",   val: "Tax Administration Jamaica" },
                    { label: "Encryption",  val: "TLS 1.3" },
                    { label: "Established", val: new Date().toLocaleTimeString("en-JM", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) },
                  ].map((row, i) => (
                    <div key={i} className={styles.sessionRow}>
                      {row.isLabel ? (
                        <>
                          <span className={styles.sessionLabel}>{row.label}</span>
                          <span className={styles.sessionBadge}>{row.badge}</span>
                        </>
                      ) : (
                        <>
                          <span className={styles.sessionKey}>{row.label}</span>
                          <span className={styles.sessionVal}>{row.val}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.securedRow}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span className={styles.securedText}>SECURED · TAX ADMINISTRATION JAMAICA</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Left panel */}
      <div className={`${styles.left} ${mounted ? styles.mounted : ""}`}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
        <div className={styles.ring} />
        <div className={styles.grid} />

        <div className={styles.leftTopbar}>
          <img src={coatOfArms} alt="" className={styles.leftLogoImg} />
          <span className={styles.leftLogo}>DLRSJAM</span>
        </div>

        <div className={styles.leftMain}>
          <div className={styles.coaWrap}>
            <div className={styles.coaPulse1} />
            <div className={styles.coaPulse2} />
            <div className={styles.coaCircle}>
              <img src={coatOfArms} alt="Government of Jamaica" className={styles.coaImg} />
            </div>
          </div>

          <h1 className={styles.leftTitle}>Tax Administration<br />Jamaica</h1>
          <p className={styles.leftSub}>Driver's Licence Renewal System</p>
          <div className={styles.leftDivider} />

          <div className={styles.featureList}>
            {FEATURES.map((item, i) => (
              <div key={i} className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.d} />
                  </svg>
                </div>
                <p className={styles.featureText}>{item.text}</p>
              </div>
            ))}
          </div>

          <div className={styles.statsRow}>
            {[{ value: "14", label: "Collectorates" }, { value: "99.9%", label: "Uptime" }, { value: "24/7", label: "Monitoring" }].map((s, i) => (
              <div key={i} className={styles.statCard}>
                <p className={styles.statVal}>{s.value}</p>
                <p className={styles.statLabel}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.leftFooter}>
          <p className={styles.leftFooterText}>© 2026 Tax Administration Jamaica · DLRSJAM v1.0</p>
        </div>
      </div>

      {/* Right panel */}
      <div className={`${styles.right} ${mounted ? styles.mounted : ""}`}>

        <div className={styles.rightTopbar}>
          <div className={styles.statusWrap}>
            <div className={styles.statusDot} />
            <span className={styles.statusText}>All systems operational</span>
          </div>
          <span className={styles.portalLabel}>DLRSJAM Staff Portal</span>
        </div>

        <div className={styles.rightForm}>
          <div className={styles.formInner}>

            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>Staff Access</h2>
              <p className={styles.formSub}>Enter your TAJ credentials to access the portal.</p>
              <div className={styles.badgeRow}>
                <span className={styles.roleBadge}>Officer</span>
                <span className={styles.roleBadge}>Supervisor</span>
              </div>
            </div>

            <div className={styles.restrictedBanner}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className={styles.restrictedText}>Restricted access — authorised personnel only</span>
            </div>

            <form className={styles.form} onSubmit={handleLogin}>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Staff Email</label>
                <input
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="firstname.lastname@taj.gov.jm"
                  required
                  autoComplete="email"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Password</label>
                <div className={styles.pwWrap}>
                  <input
                    className={`${styles.input} ${styles.inputWithIcon}`}
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button type="button" className={styles.pwToggle} onClick={() => setShowPw(v => !v)}>
                    {showPw ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className={styles.forgotRow}>
                <span className={styles.forgotText}>
                  Forgot password? <strong className={styles.forgotStrong}>Contact IT Support</strong>
                </span>
              </div>

              {error && (
                <div className={styles.errorBox}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: "1px" }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span className={styles.errorText}>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className={styles.submitBtn}>
                Sign in →
              </button>
            </form>

            <div className={styles.infoCards}>
              {INFO_CARDS.map((card, i) => (
                <div key={i} className={styles.infoCard}>
                  <div className={styles.infoCardIcon}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={card.d} />
                    </svg>
                  </div>
                  <div>
                    <p className={styles.infoCardTitle}>{card.title}</p>
                    <p className={styles.infoCardSub}>{card.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.applicantRow}>
              <span className={styles.applicantText}>Applying for a licence?</span>
              <Link to="/login" className={styles.applicantLink}>Applicant portal →</Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
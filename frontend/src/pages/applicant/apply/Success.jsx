import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppState } from "../../../context/ApplicationContext";
import { BRAND } from "../../../config/theme";
import api from "../../../services/api";
import coatOfArms from "../../../assets/coat-of-arms.png";

export default function Success() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, reset } = useAppState();
  const receiptRef = useRef(null);

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const appId = searchParams.get("appId") || state.applicationId;
  const printTime = new Date().toLocaleString("en-JM", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!appId) { setError("Application not found."); setLoading(false); return; }
    api.get(`/api/applicant/applications/${appId}`)
      .then((res) => { setApp(res.data); setLoading(false); })
      .catch(() => { setError("Could not load confirmation."); setLoading(false); });
  }, [appId]);

  const TX = {
    RENEWAL: "Licence Renewal",
    REPLACEMENT: "Licence Replacement",
    AMENDMENT: "Licence Amendment",
  };

  const downloadAsPdf = async () => {
    if (!receiptRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js");
      const { jsPDF } = await import("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js");
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
      pdf.save(`DLRSJAM-Receipt-${app.application_number}.pdf`);
    } catch { alert("Could not download PDF. Try Print instead."); }
    finally { setDownloading(false); }
  };

  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f6f8", flexDirection: "column", gap: "16px" }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
        <path d="M21 12a9 9 0 11-6.219-8.56" />
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>Loading confirmation…</p>
    </div>
  );

  if (error || !app) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f6f8", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "15px", color: "#dc2626" }}>{error || "Something went wrong."}</p>
      <button onClick={() => navigate("/dashboard")} style={{ padding: "10px 24px", borderRadius: "10px", background: BRAND.primary, color: "white", border: "none", fontWeight: "700", cursor: "pointer" }}>
        Go to Dashboard
      </button>
    </div>
  );

  const txLabel = TX[app.transaction_type] || app.transaction_type;
  const fee = app.fee_amount
    ? `$${parseFloat(app.fee_amount).toLocaleString("en-JM", { minimumFractionDigits: 2 })}`
    : "—";
  const subDate = app.submitted_at
    ? new Date(app.submitted_at).toLocaleDateString("en-JM", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-JM", { day: "numeric", month: "long", year: "numeric" });
  const appName = state.licenceRecord
    ? `${state.licenceRecord.firstname} ${state.licenceRecord.lastname}`
    : "—";
  const trn = state.licenceRecord?.trn || "—";
  const cls = state.licenceRecord?.licence_class || "—";
  const addr = state.licenceRecord
    ? [state.licenceRecord.address_line1, state.licenceRecord.address_line2, state.licenceRecord.parish].filter(Boolean).join(", ")
    : "—";

  return (
    <div style={{ minHeight: "100dvh", background: "#f5f6f8" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @media print {
          body * { visibility: hidden !important; }
          #receipt-printable, #receipt-printable * { visibility: visible !important; }
          #receipt-printable { position: fixed !important; top: 0; left: 0; width: 100%; padding: 16mm !important; box-sizing: border-box; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      {/* Minimal header */}
      <header style={{ background: "white", borderBottom: "1px solid #e9e8e7", height: "60px", display: "flex", alignItems: "center", padding: "0 24px" }}>
        <button onClick={() => { reset(); navigate("/dashboard"); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", padding: 0 }}>
          <img src={coatOfArms} alt="" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#1b1c1c", letterSpacing: "-0.3px", lineHeight: 1 }}>DLRSJAM</div>
            <div style={{ fontSize: "9px", fontWeight: "600", color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.4 }}>Driver's Licence Renewal System</div>
          </div>
        </button>
      </header>

      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "40px 24px 80px", animation: "fadeUp 0.4s ease forwards" }}>

        {/* ── Hero ── */}
        <div style={{
          background: `linear-gradient(135deg, #0f172a 0%, ${BRAND.primaryDeep} 50%, ${BRAND.primary} 100%)`,
          borderRadius: "20px", padding: "32px", marginBottom: "20px",
          position: "relative", overflow: "hidden",
          boxShadow: `0 16px 48px rgba(30,58,138,0.3)`,
        }}>
          <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
          <div style={{ position: "absolute", bottom: "-30px", left: "25%", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />

          {/* Check + title */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "24px", position: "relative" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 8px rgba(34,197,94,0.15)" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 14l6.5 6.5 13.5-13" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 4px", fontWeight: "700" }}>
                Application Submitted Successfully
              </p>
              <h1 style={{ fontSize: "22px", fontWeight: "900", color: "white", margin: "0 0 4px", letterSpacing: "-0.4px" }}>
                {txLabel}
              </h1>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", margin: 0 }}>Submitted {subDate}</p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Amount Paid</p>
              <p style={{ fontSize: "28px", fontWeight: "900", color: "#86efac", margin: 0, letterSpacing: "-0.5px" }}>{fee}</p>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", margin: 0 }}>JMD</p>
            </div>
          </div>

          {/* Reference */}
          <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "14px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", margin: "0 0 5px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Reference Number</p>
              <p style={{ fontSize: "22px", fontWeight: "900", color: "white", margin: 0, fontFamily: "monospace", letterSpacing: "0.06em" }}>
                {app.application_number}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", background: "rgba(34,197,94,0.18)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "999px", padding: "6px 16px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: "12px", fontWeight: "800", color: "#86efac", letterSpacing: "0.06em" }}>SUBMITTED</span>
            </div>
          </div>
        </div>

        {/* ── Transaction summary ── */}
        <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e9e8e7", overflow: "hidden", marginBottom: "16px" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
            <p style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Transaction Summary</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
            {[
              { label: "Transaction", value: txLabel },
              { label: "Applicant", value: appName },
              { label: "Licence Class", value: `Class ${cls}` },
              { label: "Amount Paid", value: `${fee} JMD`, accent: true },
            ].map(({ label, value, accent }, i) => (
              <div key={label} style={{ padding: "14px 20px", borderBottom: i < 2 ? "1px solid #f3f4f6" : "none", borderRight: i % 2 === 0 ? "1px solid #f3f4f6" : "none" }}>
                <p style={{ fontSize: "10px", color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
                <p style={{ fontSize: "14px", fontWeight: "700", color: accent ? BRAND.primary : "#111827", margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
          {app.pickup_collectorate && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid #f3f4f6", display: "flex", gap: "8px", alignItems: "center", background: "#f8fafc" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <p style={{ fontSize: "13px", color: "#374151", margin: 0 }}>
                Pickup at: <strong>{app.pickup_collectorate}</strong>
              </p>
            </div>
          )}
        </div>

        {/* ── What happens next ── */}
        <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e9e8e7", padding: "24px", marginBottom: "16px" }}>
          <p style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 20px" }}>
            What Happens Next
          </p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              { n: 1, title: "Officer Review", desc: "A TAJ officer reviews your application and documents.", time: "1–2 business days" },
              { n: 2, title: "Document Verification", desc: "Your uploaded documents are verified for authenticity.", time: "1–2 business days" },
              { n: 3, title: "Licence Processing", desc: "Your new licence is printed and prepared.", time: "3–5 business days" },
              { n: 4, title: "Ready for Collection", desc: "You will be notified when your licence is ready to collect.", time: "At your TAJ office" },
            ].map((step, i) => (
              <div key={step.n} style={{ display: "flex", gap: "16px", paddingBottom: i < 3 ? "20px" : "0", position: "relative" }}>
                {i < 3 && <div style={{ position: "absolute", left: "15px", top: "34px", width: "2px", height: "calc(100% - 14px)", background: "#e2e8f0" }} />}
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                  background: i === 0 ? BRAND.primary : "#f1f5f9",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: "800",
                  color: i === 0 ? "white" : "#94a3b8",
                  position: "relative", zIndex: 1,
                  border: i === 0 ? "none" : "2px solid #e2e8f0",
                }}>
                  {step.n}
                </div>
                <div style={{ paddingTop: "5px", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: "#1b1c1c", margin: 0 }}>{step.title}</p>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>{step.time}</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "20px", padding: "14px 16px", background: "#f0fdf4", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
            <p style={{ fontSize: "13px", color: "#166534", margin: 0, lineHeight: 1.7 }}>
              <strong>When collecting:</strong> Bring valid photo ID, reference number <strong>{app.application_number}</strong>, and your payment confirmation.
            </p>
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          <button
            onClick={() => { reset(); navigate("/dashboard"); }}
            style={{ flex: 2, height: "50px", borderRadius: "12px", border: "none", background: BRAND.primary, color: "white", fontSize: "15px", fontWeight: "700", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.background = BRAND.primaryDark}
            onMouseLeave={(e) => e.currentTarget.style.background = BRAND.primary}
          >
            Go to Dashboard →
          </button>
          <button
            onClick={() => { reset(); navigate(`/applications/${appId}`); }}
            style={{ flex: 1, height: "50px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "14px", fontWeight: "600", color: "#374151", cursor: "pointer" }}
          >
            View Application
          </button>
        </div>

        {/* ── Receipt (on demand) ── */}
        <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e9e8e7", overflow: "hidden" }}>
          <div
            onClick={() => setShowReceipt(v => !v)}
            style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 1px" }}>Official Receipt</p>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Download or print a copy for your records</p>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
              <polyline points={showReceipt ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
            </svg>
          </div>

          {showReceipt && (
            <div style={{ borderTop: "1px solid #f3f4f6" }}>
              {/* Download/print buttons */}
              <div style={{ padding: "12px 20px", display: "flex", gap: "8px", justifyContent: "flex-end", borderBottom: "1px solid #f3f4f6" }}>
                <button
                  onClick={() => window.print()}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "12px", fontWeight: "600", color: "#374151", cursor: "pointer" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print
                </button>
                <button
                  onClick={downloadAsPdf}
                  disabled={downloading}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", border: "none", background: BRAND.primary, fontSize: "12px", fontWeight: "700", color: "white", cursor: downloading ? "wait" : "pointer" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {downloading ? "Generating..." : "Download PDF"}
                </button>
              </div>

              {/* Receipt content */}
              <div ref={receiptRef} id="receipt-printable" style={{ padding: "28px", background: "white" }}>
                {/* Header */}
                <div style={{ background: `linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)`, borderRadius: "12px", padding: "18px 22px", marginBottom: "18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: "8px", fontWeight: "700", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.16em", margin: "0 0 3px" }}>Government of Jamaica</p>
                    <p style={{ fontSize: "15px", fontWeight: "900", color: "white", margin: "0 0 1px" }}>Tax Administration Jamaica</p>
                    <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", margin: 0 }}>Driver's Licence Renewal System</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "8px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>Official Receipt</p>
                    <p style={{ fontSize: "13px", fontWeight: "900", color: "white", margin: "0 0 2px", fontFamily: "monospace" }}>{app.application_number}</p>
                    <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.45)", margin: 0 }}>{printTime}</p>
                  </div>
                </div>

                {/* Confirmation strip */}
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "12px 16px", marginBottom: "18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M4 13l6 6 10-10" /></svg>
                    </div>
                    <div>
                      <p style={{ fontSize: "12px", fontWeight: "800", color: "#15803d", margin: "0 0 1px" }}>Payment Confirmed — Application Submitted</p>
                      <p style={{ fontSize: "10px", color: "#16a34a", margin: 0 }}>Under review by a TAJ officer · {subDate}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: "8px", color: "#6b7280", margin: "0 0 1px", textTransform: "uppercase" }}>Amount Paid</p>
                    <p style={{ fontSize: "18px", fontWeight: "900", color: "#15803d", margin: 0 }}>{fee} <span style={{ fontSize: "10px" }}>JMD</span></p>
                  </div>
                </div>

                {/* Two column */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{ background: BRAND.primaryDeep, padding: "7px 14px" }}>
                      <p style={{ fontSize: "8px", fontWeight: "800", color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.14em", margin: 0 }}>Applicant</p>
                    </div>
                    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {[["Full Name", appName], ["TRN", trn], ["Licence Class", `Class ${cls}`], ["Date of Birth", state.licenceRecord?.date_of_birth || "—"], ["Address", addr]].map(([k, v]) => (
                        <div key={k}>
                          <p style={{ fontSize: "7px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>{k}</p>
                          <p style={{ fontSize: "11px", fontWeight: "600", color: "#111827", margin: 0, lineHeight: 1.4 }}>{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
                      <div style={{ background: "#374151", padding: "7px 14px" }}>
                        <p style={{ fontSize: "8px", fontWeight: "800", color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.14em", margin: 0 }}>Application</p>
                      </div>
                      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {[
                          ["Transaction", txLabel],
                          ["Reference", app.application_number],
                          ["Date", subDate],
                          ["Status", "SUBMITTED"],
                          ...(app.pickup_collectorate ? [["Pickup", app.pickup_collectorate]] : []),
                        ].map(([k, v]) => (
                          <div key={k}>
                            <p style={{ fontSize: "7px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>{k}</p>
                            <p style={{ fontSize: "11px", fontWeight: "600", color: k === "Status" ? "#16a34a" : "#111827", margin: 0 }}>{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
                      <div style={{ background: "#065f46", padding: "7px 14px" }}>
                        <p style={{ fontSize: "8px", fontWeight: "800", color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.14em", margin: 0 }}>Payment</p>
                      </div>
                      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {[["Amount", `${fee} JMD`], ["Method", "Card (Stripe)"], ["Status", "PAID"], ["Date", subDate]].map(([k, v]) => (
                          <div key={k}>
                            <p style={{ fontSize: "7px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>{k}</p>
                            <p style={{ fontSize: k === "Amount" ? "13px" : "11px", fontWeight: "700", color: k === "Status" ? "#16a34a" : k === "Amount" ? BRAND.primaryDeep : "#111827", margin: 0 }}>{v}</p>
                          </div>
                        ))}
                        {app.payment_reference && (
                          <div>
                            <p style={{ fontSize: "7px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>Payment Ref</p>
                            <p style={{ fontSize: "9px", color: "#6b7280", fontFamily: "monospace", margin: 0, wordBreak: "break-all" }}>{app.payment_reference}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collection notice */}
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px" }}>
                  <p style={{ fontSize: "8px", fontWeight: "800", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>When Collecting Your Licence</p>
                  <p style={{ fontSize: "10px", color: "#78350f", margin: 0, lineHeight: 1.7 }}>
                    Bring this receipt · Valid photo ID · Reference: <strong>{app.application_number}</strong> · Processing takes 5–7 business days after approval.
                  </p>
                </div>

                {/* Footer */}
                <div style={{ borderTop: "2px solid #1e3a8a", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: "9px", fontWeight: "800", color: "#1e3a8a", margin: "0 0 2px" }}>Tax Administration Jamaica — DLRSJAM</p>
                    <p style={{ fontSize: "8px", color: "#6b7280", margin: 0 }}>support@dlrsjam.gov.jm · 1-876-XXX-XXXX · Mon–Fri 8AM–4PM</p>
                  </div>
                  <p style={{ fontSize: "8px", color: "#9ca3af", margin: 0, textAlign: "right" }}>
                    Official government receipt<br />Printed {printTime}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
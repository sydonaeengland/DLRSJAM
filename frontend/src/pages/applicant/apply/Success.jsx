// Confirmation page shown after a successful submission.
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppState } from "../../../context/ApplicationContext";
import { BRAND } from "../../../config/theme";
import api from "../../../services/api";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import coatOfArms from "../../../assets/coat-of-arms.png";
import ReceiptDocument from "../../../components/applicant/ReceiptDocument";

export default function Success() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, reset } = useAppState();
  const receiptRef = useRef(null);

  const [app, setApp] = useState(null);
  const [licence, setLicence] = useState(state.licenceRecord || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const appId = searchParams.get("appId") || state.applicationId;
  const printTime = new Date().toLocaleString("en-JM", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (!appId) { setError("Application not found."); setLoading(false); return; }
    const fetches = [api.get(`/api/applicant/applications/${appId}`)];
    if (!licence) fetches.push(api.get("/api/applicant/licence"));
    Promise.all(fetches)
      .then(([appRes, licRes]) => {
        setApp(appRes.data);
        if (licRes) setLicence(licRes.data);
        setLoading(false);
      })
      .catch(() => { setError("Could not load confirmation."); setLoading(false); });
  }, [appId]);

  const TX = { RENEWAL: "Licence Renewal", REPLACEMENT: "Licence Replacement", AMENDMENT: "Licence Amendment" };

  const downloadAsPdf = async () => {
    if (!receiptRef.current) return;
    setDownloading(true);
    try {
      const el = receiptRef.current;

      // Move off-screen at full letter width so html2canvas doesn't capture the squished column size
      const saved = el.getAttribute("style") || "";
      el.style.cssText = `${saved}; position: fixed; left: -9999px; top: 0; width: 740px; z-index: -1;`;

      await new Promise((r) => requestAnimationFrame(r));

      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });

      el.setAttribute("style", saved);

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pdfW) / canvas.width;

      // Scale down if taller than one page, otherwise centre vertically
      if (imgH <= pdfH) {
        const topMargin = (pdfH - imgH) / 2;
        pdf.addImage(imgData, "JPEG", 0, topMargin, pdfW, imgH);
      } else {
        const scale = pdfH / imgH;
        const scaledW = pdfW * scale;
        pdf.addImage(imgData, "JPEG", (pdfW - scaledW) / 2, 0, scaledW, pdfH);
      }

      pdf.save(`DLRSJAM-Receipt-${app.application_number}.pdf`);
    } catch { alert("Could not generate PDF. Try Print instead."); }
    finally { setDownloading(false); }
  };

  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f6f8", flexDirection: "column", gap: "16px" }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
        <path d="M21 12a9 9 0 11-6.219-8.56" />
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>Loading…</p>
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
  const fee     = app.fee_amount ? `$${parseFloat(app.fee_amount).toLocaleString("en-JM", { minimumFractionDigits: 2 })}` : "—";
  const subDate = app.submitted_at ? new Date(app.submitted_at.endsWith("Z") ? app.submitted_at : app.submitted_at + "Z").toLocaleDateString("en-JM", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Jamaica" }) : new Date().toLocaleDateString("en-JM", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Jamaica" });
  const appName = licence
    ? [licence.firstname, licence.middlename, licence.lastname].filter(Boolean).join(" ")
    : "—";
  const cls     = licence?.licence_class || "—";

  return (
    <div style={{ minHeight: "100dvh", background: "#f5f6f8", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media print {
          body * { visibility: hidden !important; }
          #receipt-printable, #receipt-printable * { visibility: visible !important; }
          #receipt-printable { position: fixed !important; top: 0; left: 0; width: 100%; padding: 14mm; box-sizing: border-box; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      {/* Header */}
      <header style={{ background: "white", borderBottom: "1px solid #e9e8e7", height: "60px", display: "flex", alignItems: "center", padding: "0 24px", flexShrink: 0 }}>
        <button onClick={() => { reset(); navigate("/dashboard"); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", padding: 0 }}>
          <img src={coatOfArms} alt="" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#1b1c1c", letterSpacing: "-0.3px", lineHeight: 1 }}>DLRSJAM</div>
            <div style={{ fontSize: "9px", fontWeight: "600", color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.4 }}>Driver's Licence Renewal System</div>
          </div>
        </button>
      </header>

      {/* Two-column body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", maxWidth: "1100px", width: "100%", margin: "0 auto", padding: "32px 24px 48px", boxSizing: "border-box", alignItems: "start", animation: "fadeUp 0.35s ease forwards" }}>

        {/* LEFT: Confirmation */}
        <div style={{ paddingRight: "28px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Hero */}
          <div style={{ background: `linear-gradient(135deg, #0f172a 0%, ${BRAND.primaryDeep} 55%, ${BRAND.primary} 100%)`, borderRadius: "18px", padding: "24px", position: "relative", overflow: "hidden", boxShadow: "0 12px 40px rgba(30,58,138,0.28)" }}>
            <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "160px", height: "160px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
            <div style={{ position: "absolute", bottom: "-20px", left: "30%", width: "100px", height: "100px", borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />

            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px", position: "relative" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 6px rgba(34,197,94,0.18)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 13l6 6 10-10" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 3px", fontWeight: "700" }}>Submitted Successfully</p>
                <h1 style={{ fontSize: "18px", fontWeight: "900", color: "white", margin: 0, letterSpacing: "-0.3px" }}>{txLabel}</h1>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", position: "relative" }}>
              <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 14px" }}>
                <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.45)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Amount Paid</p>
                <p style={{ fontSize: "20px", fontWeight: "900", color: "#86efac", margin: 0, letterSpacing: "-0.4px" }}>{fee}</p>
                <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", margin: 0 }}>JMD</p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 14px" }}>
                <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.45)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Reference</p>
                <p style={{ fontSize: "13px", fontWeight: "900", color: "white", margin: "0 0 6px", fontFamily: "monospace", letterSpacing: "0.04em", lineHeight: 1.2 }}>{app.application_number}</p>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(34,197,94,0.2)", borderRadius: "999px", padding: "2px 8px" }}>
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ fontSize: "9px", fontWeight: "800", color: "#86efac" }}>SUBMITTED</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e9e8e7", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
              <p style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Summary</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {[
                { label: "Applicant",   value: appName },
                { label: "Transaction", value: txLabel },
                { label: "Class",       value: `Class ${cls}` },
                { label: "Paid",        value: `${fee} JMD`, blue: true },
              ].map(({ label, value, blue }, i) => (
                <div key={label} style={{ padding: "12px 16px", borderBottom: i < 2 ? "1px solid #f3f4f6" : "none", borderRight: i % 2 === 0 ? "1px solid #f3f4f6" : "none" }}>
                  <p style={{ fontSize: "10px", color: "#9ca3af", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: blue ? BRAND.primary : "#1b1c1c", margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
            {app.pickup_collectorate && (
              <div style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", background: "#f8fafc", display: "flex", gap: "7px", alignItems: "center" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <p style={{ fontSize: "12px", color: "#374151", margin: 0 }}>Collect at: <strong>{app.pickup_collectorate}</strong></p>
              </div>
            )}
          </div>

          {/* Steps */}
          <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e9e8e7", padding: "16px" }}>
            <p style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 14px" }}>What Happens Next</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { n: 1, title: "Officer Review",    time: "1–2 days" },
                { n: 2, title: "Verification",      time: "1–2 days" },
                { n: 3, title: "Licence Printed",   time: "3–5 days" },
                { n: 4, title: "Ready to Collect",  time: "TAJ office" },
              ].map((s) => (
                <div key={s.n} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: s.n === 1 ? BRAND.primary : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", color: s.n === 1 ? "white" : "#94a3b8", flexShrink: 0, border: s.n === 1 ? "none" : "2px solid #e2e8f0" }}>
                    {s.n}
                  </div>
                  <p style={{ fontSize: "13px", fontWeight: "600", color: "#1b1c1c", margin: 0, flex: 1 }}>{s.title}</p>
                  <span style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>{s.time}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "14px", padding: "12px 14px", background: "#f0fdf4", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
              <p style={{ fontSize: "12px", color: "#166534", margin: 0, lineHeight: 1.7 }}>
                <strong>When collecting:</strong> Bring valid photo ID, reference <strong>{app.application_number}</strong>, and your payment confirmation.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => { reset(); navigate("/dashboard"); }}
              style={{ flex: 2, height: "46px", borderRadius: "10px", border: "none", background: BRAND.primary, color: "white", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}
              onMouseEnter={(e) => e.currentTarget.style.background = BRAND.primaryDark}
              onMouseLeave={(e) => e.currentTarget.style.background = BRAND.primary}>
              Go to Dashboard →
            </button>
            <button onClick={() => { reset(); navigate(`/applications/${appId}/view`); }}
              style={{ flex: 1, height: "46px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "13px", fontWeight: "600", color: "#374151", cursor: "pointer" }}>
              View Application
            </button>
          </div>
        </div>

        {/* RIGHT: Receipt */}
        <div style={{ paddingLeft: "28px", borderLeft: "1px solid #e9e8e7" }}>
          <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e9e8e7", overflow: "hidden" }}>

            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 1px" }}>Official Receipt</p>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>Save a copy for your records</p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => window.print()}
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 12px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "12px", fontWeight: "600", color: "#374151", cursor: "pointer" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Print
                </button>
                <button onClick={downloadAsPdf} disabled={downloading}
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 12px", borderRadius: "8px", border: "none", background: BRAND.primary, fontSize: "12px", fontWeight: "700", color: "white", cursor: downloading ? "wait" : "pointer" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {downloading ? "Generating…" : "PDF"}
                </button>
              </div>
            </div>

            <div style={{ padding: "20px" }} id="receipt-printable">
              <ReceiptDocument ref={receiptRef} app={app} licence={licence} printTime={printTime} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
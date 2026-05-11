// Static privacy notice — linked from registration and the consent step.
import { useNavigate } from "react-router-dom";
import { BRAND } from "../../config/theme";
import coatOfArms from "../../assets/coat-of-arms.png";

const Section = ({ title, children }) => (
  <div style={{ marginBottom: "28px" }}>
    <h2 style={{ fontSize: "15px", fontWeight: "800", color: "#1b1c1c", margin: "0 0 10px", letterSpacing: "-0.2px" }}>
      {title}
    </h2>
    <div style={{ fontSize: "14px", color: "#374151", lineHeight: 1.75 }}>
      {children}
    </div>
  </div>
);

const Row = ({ label, value }) => (
  <div style={{ display: "flex", gap: "12px", padding: "9px 0", borderBottom: "1px solid #f1f0ef" }}>
    <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", minWidth: "160px", flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: "13px", color: "#374151" }}>{value}</span>
  </div>
);

export default function PrivacyNotice({ embedded = false, onClose }) {
  const navigate = useNavigate();

  const content = (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>

      <div style={{ marginBottom: "32px" }}>
        <p style={{ fontSize: "12px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
          Data Protection Act, 2020 — Jamaica
        </p>
        <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#1b1c1c", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
          Privacy Notice
        </h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 4px" }}>
          Digital Licence Renewal System — Tax Administration Jamaica (TAJ)
        </p>
        <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
          Last updated: May 2025
        </p>
      </div>

      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "16px 20px", marginBottom: "28px" }}>
        <p style={{ fontSize: "13px", color: "#1e40af", margin: 0, lineHeight: 1.65 }}>
          This notice explains what personal information TAJ collects when you use the DLRSJAM portal,
          why it is collected, how long it is kept, and your rights under the Data Protection Act, 2020.
          Please read it carefully before submitting an application.
        </p>
      </div>

      <Section title="1. Who is collecting your data?">
        <p style={{ margin: "0 0 8px" }}>
          <strong>Data Controller:</strong> Tax Administration Jamaica (TAJ), operating under the Ministry of Finance and the Public Service, Jamaica.
        </p>
        <p style={{ margin: 0 }}>
          TAJ is responsible for determining how and why your personal data is processed through this system.
        </p>
      </Section>

      <Section title="2. What data we collect">
        <p style={{ margin: "0 0 12px" }}>The following categories of data are collected during registration and the application process:</p>
        <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "4px 16px" }}>
          <Row label="Identity data" value="Full name, date of birth, sex, TRN, nationality, Tax Registration Number" />
          <Row label="Contact data" value="Email address, phone number, residential address, parish" />
          <Row label="Licence data" value="Licence class, control number, expiry date, collectorate, issue dates" />
          <Row label="Identity documents" value="National ID (front and back), existing driver's licence (front and back)" />
          <Row label="Biometric data" value="Webcam photo taken during liveness verification; 128-dimension facial descriptor computed from that photo and your ID image" />
          <Row label="Liveness signals" value="Face depth score, texture score, micro-motion score, eye specular score, estimated heart rate (rPPG), iris movement, and overall liveness score" />
          <Row label="Deepfake score" value="Anti-spoof analysis result from the liveness verification step" />
          <Row label="Payment data" value="Stripe payment reference and confirmation timestamp (card details are never stored — handled by Stripe)" />
          <Row label="Usage data" value="Application events, officer decisions, notification history" />
        </div>
      </Section>

      <Section title="3. Why we collect it and the lawful basis">
        <p style={{ margin: "0 0 12px" }}>
          All personal data collected is used solely for processing your driver's licence application. The specific purposes are:
        </p>
        <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <li><strong>Identity verification</strong> — to confirm you are the holder of the licence record before allowing you to register and submit an application.</li>
          <li><strong>Document review</strong> — to allow TAJ officers to review your uploaded identity documents as part of the standard renewal process.</li>
          <li><strong>Liveness verification</strong> — to confirm a live person is present at the time of submission and that the person matches the uploaded ID, preventing fraud and impersonation.</li>
          <li><strong>Payment processing</strong> — to record payment of the prescribed licence fee.</li>
          <li><strong>Audit and compliance</strong> — to maintain a record of decisions made on your application for legal and regulatory purposes.</li>
        </ul>
        <p style={{ marginTop: "12px", marginBottom: 0 }}>
          <strong>Lawful basis:</strong> Processing is carried out in exercise of a public function — the administration of driver's licences under the Road Traffic Act — and, in the case of biometric data, with your explicit consent given at the start of each application.
        </p>
      </Section>

      <Section title="4. Who your data may be shared with">
        <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <li><strong>Island Traffic Authority (ITA)</strong> — traffic clearance requests are sent to ITA for replacement licence applications as required by law.</li>
          <li><strong>Stripe, Inc.</strong> — payment processing only. Stripe receives payment information directly. TAJ does not receive or store card details.</li>
          <li><strong>TAJ officers and supervisors</strong> — assigned TAJ staff review your application, documents, and liveness results as part of normal processing.</li>
        </ul>
        <p style={{ marginTop: "12px", marginBottom: 0 }}>
          Your data is not sold, rented, or shared with any third party for marketing or commercial purposes.
        </p>
      </Section>

      <Section title="5. How long we keep your data">
        <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "4px 16px" }}>
          <Row label="Approved applications" value="7 years from date of approval — required for audit and regulatory purposes" />
          <Row label="Rejected applications" value="7 years from date of rejection" />
          <Row label="Abandoned drafts" value="30 days from creation, then permanently deleted" />
          <Row label="Biometric data" value="Anonymised after the applicable retention period — verification photos and facial descriptors are not kept beyond 7 years" />
        </div>
        <p style={{ marginTop: "12px", marginBottom: 0 }}>
          After the retention period, biometric fields are permanently anonymised and document files are deleted. Application reference data is retained in anonymised form for statistical purposes only.
        </p>
      </Section>

      <Section title="6. Your rights under the Data Protection Act, 2020">
        <p style={{ margin: "0 0 12px" }}>As a data subject you have the following rights:</p>
        <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <li><strong>Right of access</strong> — you may request a copy of all personal data held about you. Use the <em>Download My Data</em> option in Account Settings.</li>
          <li><strong>Right to erasure</strong> — you may request deletion of your account and personal data, subject to there being no active application in progress. Use the <em>Delete Account</em> option in Account Settings.</li>
          <li><strong>Right to rectification</strong> — you may correct your contact details via Account Settings at any time.</li>
          <li><strong>Right to object</strong> — you may object to processing by contacting TAJ directly.</li>
          <li><strong>Right to lodge a complaint</strong> — you may complain to the Office of the Information Commissioner of Jamaica if you believe your data has been mishandled.</li>
        </ul>
      </Section>

      <Section title="7. Contact">
        <p style={{ margin: "0 0 6px" }}>To exercise your rights or raise a data protection concern, contact TAJ:</p>
        <p style={{ margin: "0 0 4px" }}>
          <strong>Email:</strong> <a href="mailto:dataprotection@taj.gov.jm" style={{ color: BRAND.primary }}>dataprotection@taj.gov.jm</a>
        </p>
        <p style={{ margin: "0 0 4px" }}>
          <strong>Phone:</strong> <a href="tel:18769265780" style={{ color: BRAND.primary }}>1-876-926-5780</a>
        </p>
        <p style={{ margin: 0 }}>
          <strong>Office of the Information Commissioner:</strong>{" "}
          <a href="https://www.oic.gov.jm" target="_blank" rel="noreferrer" style={{ color: BRAND.primary }}>www.oic.gov.jm</a>
        </p>
      </Section>

    </div>
  );

  if (embedded) {
    return (
      <div style={{ padding: "4px 0" }}>
        {content}
        {onClose && (
          <div style={{ textAlign: "center", marginTop: "28px" }}>
            <button onClick={onClose}
              style={{ padding: "10px 28px", borderRadius: "8px", border: "none", background: BRAND.primary, color: "white", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
              Close
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f5f6f8" }}>
      {/* Header */}
      <header style={{ background: "white", borderBottom: "1px solid #e9e8e7", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", gap: "12px" }}>
          <img src={coatOfArms} alt="" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
          <span style={{ fontSize: "15px", fontWeight: "800", color: "#1b1c1c" }}>DLRSJAM</span>
          <span style={{ fontSize: "13px", color: "#94a3b8", marginLeft: "auto", cursor: "pointer" }} onClick={() => navigate(-1)}>
            ← Back
          </span>
        </div>
      </header>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 32px 80px" }}>
        {content}
      </div>
    </div>
  );
}

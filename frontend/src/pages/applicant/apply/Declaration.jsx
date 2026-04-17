import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../../../context/ApplicationContext";
import StepLayout from "../../../components/layout/StepLayout";
import StepCard from "../../../components/apply/StepCard";
import StepNav from "../../../components/apply/StepNav";
import InfoBanner from "../../../components/apply/InfoBanner";
import { BRAND } from "../../../config/theme";
import api from "../../../services/api";

const DECLARATION_TEXTS = {
  RENEWAL: `I hereby declare that the information provided in this application is true, accurate and complete to the best of my knowledge and belief. I understand that any false or misleading information may result in the rejection of my application and may constitute an offence under the Road Traffic Act of Jamaica. I confirm that I am the person named in this application and that I am entitled to hold a driver's licence in Jamaica.`,
  REPLACEMENT: `I hereby declare that the information provided in this application is true, accurate and complete to the best of my knowledge and belief. I confirm that my driver's licence has been lost or damaged as stated and that I have not wilfully destroyed or disposed of my licence. I understand that any false declaration may result in rejection of this application, cancellation of any licence issued, and may constitute a criminal offence. I confirm that I am the person named in this application.`,
  AMENDMENT: `I hereby declare that the information provided in this application is true, accurate and complete to the best of my knowledge and belief. I confirm that my name has been legally changed through the Tax Administration Jamaica TRN system and that the updated name reflected in this application is my current legal name. I understand that any false or misleading information may result in rejection of this application and may constitute an offence under the Road Traffic Act of Jamaica.`,
};

const PARISHES = [
  "KINGSTON", "ST. ANDREW", "ST. THOMAS", "PORTLAND", "ST. MARY",
  "ST. ANN", "TRELAWNY", "ST. JAMES", "HANOVER", "WESTMORELAND",
  "ST. ELIZABETH", "MANCHESTER", "CLARENDON", "ST. CATHERINE",
];

const inputStyle = {
  width: "100%", height: "44px", borderRadius: "10px",
  border: "1.5px solid #e9e8e7", padding: "0 14px",
  fontSize: "14px", color: "#1b1c1c", background: "white",
  fontFamily: "inherit", boxSizing: "border-box",
  outline: "none", transition: "border-color 0.15s",
};

const fieldLabel = {
  display: "block", fontSize: "13px", fontWeight: "600",
  color: "#374151", marginBottom: "6px",
};

const errorText = {
  fontSize: "12px", color: "#dc2626", margin: "4px 0 0",
};

function SectionLabel({ text }) {
  return (
    <p style={{
      fontSize: "11px", fontWeight: "700", color: "#94a3b8",
      textTransform: "uppercase", letterSpacing: "0.1em",
      margin: "28px 0 8px",
    }}>
      {text}
    </p>
  );
}

export default function Declaration() {
  const navigate = useNavigate();
  const { state, update } = useAppState();
  const canvasRef = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [fullName, setFullName] = useState("");
  const [collectorates, setCollectorates] = useState([]);
  const [selectedParish, setSelectedParish] = useState("");
  const [collectorate, setCollectorate] = useState(state.pickupCollectorateCode || "");
  const [trusteeCollection, setTrusteeCollection] = useState(state.trusteeCollection || false);
  const [trusteeName, setTrusteeName] = useState(state.trusteeName || "");
  const [trusteeContact, setTrusteeContact] = useState(state.trusteeContact || "");
  const [trusteeUploading, setTrusteeUploading] = useState(false);
  const [trusteeUpload, setTrusteeUpload] = useState(null);
  const [trusteeError, setTrusteeError] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const trusteeFileRef = useRef(null);

  const declarationText = DECLARATION_TEXTS[state.transactionType] ?? DECLARATION_TEXTS.RENEWAL;
  const expectedName = state.licenceRecord
    ? `${state.licenceRecord.firstname} ${state.licenceRecord.lastname}`.toUpperCase()
    : "";

  const parishCollectorates = collectorates.filter(
    (c) => !selectedParish || c.parish === selectedParish
  );
  const selectedCollectorate = collectorates.find((c) => c.code === collectorate);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  useEffect(() => {
    api.get("/api/collectorates")
      .then((res) => setCollectorates(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1b1c1c";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = (e) => {
    e.preventDefault();
    setIsDrawing(false);
    setHasSignature(true);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleTrusteeFile = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setTrusteeError("File too large. Max 5MB."); return; }
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) { setTrusteeError("Invalid file type. Use JPG, PNG or PDF."); return; }

    setTrusteeError("");
    setTrusteeUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", "trustee_letter");
      const res = await api.post(
        `/api/applicant/applications/${state.applicationId}/documents`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setTrusteeUpload({
        id: res.data.id,
        filename: res.data.original_filename,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      });
    } catch (err) {
      setTrusteeError(err.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setTrusteeUploading(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!fullName.trim()) {
      e.fullName = "Please type your full legal name";
    } else if (fullName.trim().toUpperCase() !== expectedName) {
      e.fullName = `Name must match exactly: ${expectedName}`;
    }
    if (!hasSignature) e.signature = "Please draw your signature";
    if (!collectorate) e.collectorate = "Please select a pickup location";
    if (trusteeCollection) {
      if (!trusteeName.trim()) e.trusteeName = "Trustee name is required";
      if (!trusteeContact.trim()) e.trusteeContact = "Trustee contact number is required";
      if (!trusteeUpload) e.trusteeFile = "Please upload a trustee letter";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) return;
    setSaving(true);
    const signatureDataUrl = canvasRef.current.toDataURL("image/png");
    try {
      await api.patch(`/api/applicant/applications/${state.applicationId}`, {
        declaration: declarationText,
        pickup_collectorate_code: collectorate,
        trustee_collection: trusteeCollection,
        trustee_name: trusteeCollection ? trusteeName.trim() : null,
        trustee_contact: trusteeCollection ? trusteeContact.trim() : null,
      });
      update({
        declarationText,
        signatureDataUrl,
        pickupCollectorateCode: collectorate,
        trusteeCollection,
        trusteeName: trusteeCollection ? trusteeName.trim() : "",
        trusteeContact: trusteeCollection ? trusteeContact.trim() : "",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      navigate("/apply/payment");
    } catch {
      setErrors((p) => ({ ...p, submit: "Failed to save declaration. Please try again." }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <StepLayout currentStep={6}>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
          Step 7 of 9
        </p>
        <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#1b1c1c", margin: "0 0 6px", letterSpacing: "-0.4px" }}>
          Declaration
        </h1>
        <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
          Read the declaration carefully, then sign and confirm your details.
        </p>
      </div>

      {/* Declaration + signature */}
      <SectionLabel text="Declaration" />
      <StepCard>
        <div style={{
          background: "#f8fafc", border: "1px solid #e2e8f0",
          borderRadius: "10px", padding: "18px 20px",
          fontSize: "14px", color: "#374151", lineHeight: 1.8,
          marginBottom: "20px",
        }}>
          {declarationText}
        </div>

        {/* Full name */}
        <div style={{ marginBottom: "20px" }}>
          <label style={fieldLabel}>
            Type your full legal name to confirm <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 8px" }}>
            Must match exactly: <strong style={{ color: "#1b1c1c" }}>{expectedName}</strong>
          </p>
          <input
            type="text"
            value={fullName}
            onChange={(e) => { setFullName(e.target.value.toUpperCase()); if (errors.fullName) setErrors((p) => ({ ...p, fullName: null })); }}
            placeholder="TYPE YOUR FULL NAME"
            style={{ ...inputStyle, borderColor: errors.fullName ? "#dc2626" : "#e9e8e7", textTransform: "uppercase", letterSpacing: "0.05em" }}
            onFocus={(e) => e.target.style.borderColor = errors.fullName ? "#dc2626" : BRAND.primary}
            onBlur={(e) => e.target.style.borderColor = errors.fullName ? "#dc2626" : "#e9e8e7"}
          />
          {errors.fullName && <p style={errorText}>{errors.fullName}</p>}
        </div>

        {/* Signature */}
        <div>
          <label style={fieldLabel}>
            Draw your signature <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <div style={{ position: "relative", border: `1.5px solid ${errors.signature ? "#dc2626" : "#e9e8e7"}`, borderRadius: "10px", overflow: "hidden", background: "white" }}>
            <canvas
              ref={canvasRef}
              style={{ display: "block", width: "100%", height: "160px", cursor: "crosshair", touchAction: "none" }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            {!hasSignature && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <p style={{ fontSize: "13px", color: "#cbd5e1", fontStyle: "italic" }}>Draw your signature here</p>
              </div>
            )}
            {hasSignature && (
              <button
                onClick={clearSignature}
                style={{ position: "absolute", top: "8px", right: "8px", background: "white", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", color: "#64748b", cursor: "pointer", fontWeight: "500" }}
              >
                Clear
              </button>
            )}
          </div>
          {errors.signature && <p style={errorText}>{errors.signature}</p>}
        </div>
      </StepCard>

      {/* Pickup location */}
      <SectionLabel text="Licence Pickup Location" />
      <StepCard>
        <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px", lineHeight: 1.6 }}>
          Choose the TAJ Revenue Centre where you'll collect your physical licence card.
        </p>

        {/* Parish pill tabs */}
        <div style={{ marginBottom: "20px" }}>
          <p style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Filter by Parish</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {["", ...PARISHES].map((p) => {
              const active = selectedParish === p;
              return (
                <button
                  key={p || "all"}
                  onClick={() => { setSelectedParish(p); setCollectorate(""); }}
                  style={{
                    padding: "5px 12px", borderRadius: "999px", cursor: "pointer",
                    fontSize: "12px", fontWeight: "600",
                    border: `1.5px solid ${active ? BRAND.primary : "#e2e8f0"}`,
                    background: active ? BRAND.primary : "white",
                    color: active ? "white" : "#64748b",
                    transition: "all 0.15s", whiteSpace: "nowrap",
                    letterSpacing: "0.01em",
                  }}
                >
                  {p || "All"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Office cards */}
        <div style={{
          display: "flex", flexDirection: "column", gap: "10px",
          maxHeight: "420px", overflowY: "auto",
          paddingRight: "6px", marginBottom: "4px",
        }}>
          {collectorates.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <p style={{ fontSize: "13px", color: "#94a3b8" }}>Loading offices…</p>
            </div>
          )}
          {collectorates.length > 0 && parishCollectorates.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <p style={{ fontSize: "13px", color: "#94a3b8" }}>No offices in <strong>{selectedParish}</strong>.</p>
            </div>
          )}
          {parishCollectorates.map((c) => {
            const isSelected = collectorate === c.code;
            return (
              <div
                key={c.code}
                onClick={() => { setCollectorate(c.code); if (errors.collectorate) setErrors((p) => ({ ...p, collectorate: null })); }}
                style={{
                  border: `1.5px solid ${isSelected ? BRAND.primary : "#e9e8e7"}`,
                  borderRadius: "12px", padding: "16px 18px", cursor: "pointer",
                  background: isSelected ? `${BRAND.primary}08` : "white",
                  transition: "all 0.15s",
                  boxShadow: isSelected ? `0 0 0 3px ${BRAND.primary}20` : "0 1px 3px rgba(0,0,0,0.04)",
                  position: "relative",
                }}
              >
                {/* Selected checkmark top-right */}
                {isSelected && (
                  <div style={{
                    position: "absolute", top: "14px", right: "14px",
                    width: "22px", height: "22px", borderRadius: "50%",
                    background: BRAND.primary,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}

                {/* Office name + parish badge */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", paddingRight: isSelected ? "32px" : "0" }}>
                  <p style={{ fontSize: "14px", fontWeight: "700", color: isSelected ? BRAND.primary : "#1b1c1c", margin: 0, lineHeight: 1.3 }}>
                    {c.name}
                  </p>
                  <span style={{
                    fontSize: "10px", fontWeight: "700", padding: "2px 7px",
                    borderRadius: "999px", whiteSpace: "nowrap",
                    background: isSelected ? `${BRAND.primary}18` : "#f1f5f9",
                    color: isSelected ? BRAND.primary : "#64748b",
                    letterSpacing: "0.04em",
                  }}>
                    {c.parish}
                  </span>
                </div>

                {/* Details row */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {c.address && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                      <span style={{ fontSize: "13px", flexShrink: 0, marginTop: "1px" }}>📍</span>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>{c.address}</p>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "2px" }}>
                    {c.phone && (
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontSize: "12px" }}>📞</span>
                        <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>{c.phone}</p>
                      </div>
                    )}
                    {c.hours && (
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontSize: "12px" }}>🕐</span>
                        <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>{c.hours}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected confirmation */}
        {selectedCollectorate && (
          <div style={{
            marginTop: "14px", padding: "14px 16px", borderRadius: "12px",
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            border: "1.5px solid #86efac",
            display: "flex", alignItems: "center", gap: "12px",
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "#22c55e", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8l4 4 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#14532d", margin: "0 0 2px" }}>
                {selectedCollectorate.name}
              </p>
              <p style={{ fontSize: "12px", color: "#166534", margin: 0 }}>
                {selectedCollectorate.address}
              </p>
            </div>
          </div>
        )}

        {errors.collectorate && <p style={{ ...errorText, marginTop: "10px" }}>{errors.collectorate}</p>}
      </StepCard>

      {/* Trustee collection */}
      <SectionLabel text="Collection" />
      <StepCard>
        <p style={{ fontSize: "15px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 4px" }}>
          Will someone else collect your licence on your behalf?
        </p>
        <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
          A notarized letter (overseas) or JP-witnessed letter (local) is required.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: trusteeCollection ? "20px" : "0" }}>
          {[
            { value: false, label: "No, I will collect my licence personally" },
            { value: true,  label: "Yes, someone else will collect on my behalf" },
          ].map((opt) => {
            const isSelected = trusteeCollection === opt.value;
            return (
              <button
                key={String(opt.value)}
                onClick={() => setTrusteeCollection(opt.value)}
                style={{
                  textAlign: "left", padding: "12px 16px", borderRadius: "10px", cursor: "pointer",
                  border: `2px solid ${isSelected ? BRAND.primary : "#e2e8f0"}`,
                  background: isSelected ? "#eff6ff" : "white",
                  fontSize: "14px", fontWeight: isSelected ? "600" : "400",
                  color: isSelected ? BRAND.primary : "#475569",
                  display: "flex", alignItems: "center", gap: "12px",
                  transition: "all 0.15s",
                }}
              >
                <span style={{
                  width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${isSelected ? BRAND.primary : "#d1d5db"}`,
                  background: isSelected ? BRAND.primary : "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {isSelected && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "white" }} />}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>

        {trusteeCollection && (
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <InfoBanner type="warning" message="You must upload a notarized letter (if overseas) or JP-witnessed letter (if local). The officer will validate this before approving." />

            {/* Trustee name */}
            <div>
              <label style={fieldLabel}>Trustee Full Name <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                type="text"
                value={trusteeName}
                onChange={(e) => { setTrusteeName(e.target.value); if (errors.trusteeName) setErrors((p) => ({ ...p, trusteeName: null })); }}
                placeholder="Full name of the person collecting"
                style={{ ...inputStyle, borderColor: errors.trusteeName ? "#dc2626" : "#e9e8e7" }}
                onFocus={(e) => e.target.style.borderColor = BRAND.primary}
                onBlur={(e) => e.target.style.borderColor = errors.trusteeName ? "#dc2626" : "#e9e8e7"}
              />
              {errors.trusteeName && <p style={errorText}>{errors.trusteeName}</p>}
            </div>

            {/* Trustee contact */}
            <div>
              <label style={fieldLabel}>Trustee Contact Number <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                type="tel"
                value={trusteeContact}
                onChange={(e) => { setTrusteeContact(e.target.value); if (errors.trusteeContact) setErrors((p) => ({ ...p, trusteeContact: null })); }}
                placeholder="e.g. 876-XXX-XXXX"
                style={{ ...inputStyle, borderColor: errors.trusteeContact ? "#dc2626" : "#e9e8e7" }}
                onFocus={(e) => e.target.style.borderColor = BRAND.primary}
                onBlur={(e) => e.target.style.borderColor = errors.trusteeContact ? "#dc2626" : "#e9e8e7"}
              />
              {errors.trusteeContact && <p style={errorText}>{errors.trusteeContact}</p>}
            </div>

            {/* Trustee letter upload */}
            <div>
              <label style={fieldLabel}>Upload Trustee Letter <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                style={{ display: "none" }}
                ref={trusteeFileRef}
                onChange={(e) => handleTrusteeFile(e.target.files[0])}
              />

              {!trusteeUpload && !trusteeUploading && (
                <div
                  onClick={() => trusteeFileRef.current?.click()}
                  style={{
                    border: `2px dashed ${errors.trusteeFile ? "#dc2626" : "#d1d5db"}`,
                    borderRadius: "12px", padding: "28px 16px",
                    textAlign: "center", cursor: "pointer",
                    background: errors.trusteeFile ? "#fef2f2" : "white",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = BRAND.primary; e.currentTarget.style.background = "#eff6ff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = errors.trusteeFile ? "#dc2626" : "#d1d5db"; e.currentTarget.style.background = errors.trusteeFile ? "#fef2f2" : "white"; }}
                >
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>📄</div>
                  <p style={{ fontSize: "13px", fontWeight: "600", color: "#374151", margin: "0 0 4px" }}>Click to upload trustee letter</p>
                  <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>JPG, PNG or PDF · max 5MB</p>
                </div>
              )}

              {trusteeUploading && (
                <div style={{ border: "1.5px solid #c7d2fe", borderRadius: "12px", padding: "24px", textAlign: "center", background: "#eff6ff" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <p style={{ fontSize: "13px", color: BRAND.primary, margin: "8px 0 0", fontWeight: "600" }}>Uploading...</p>
                </div>
              )}

              {trusteeUpload && !trusteeUploading && (
                <div style={{ border: "1.5px solid #bbf7d0", borderRadius: "12px", overflow: "hidden", background: "#f0fdf4" }}>
                  {trusteeUpload.previewUrl && (
                    <div style={{ width: "100%", height: "120px", overflow: "hidden", background: "#e5e7eb" }}>
                      <img src={trusteeUpload.previewUrl} alt="Trustee letter" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "20px" }}>✓</span>
                      <p style={{ fontSize: "12px", fontWeight: "600", color: "#14532d", margin: 0 }}>{trusteeUpload.filename}</p>
                    </div>
                    <button
                      onClick={() => { setTrusteeUpload(null); if (trusteeFileRef.current) trusteeFileRef.current.value = ""; }}
                      style={{ background: "none", border: "none", fontSize: "12px", color: "#dc2626", cursor: "pointer", fontWeight: "600" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {trusteeError && <p style={errorText}>{trusteeError}</p>}
              {errors.trusteeFile && <p style={errorText}>{errors.trusteeFile}</p>}
            </div>
          </div>
        )}
      </StepCard>

      {errors.submit && (
        <div style={{ marginTop: "16px" }}>
          <InfoBanner type="error" message={errors.submit} />
        </div>
      )}

      <StepNav
        onBack={() => navigate("/apply/review")}
        onContinue={handleContinue}
        loading={saving}
        continueLabel="Proceed to Payment"
      />
    </StepLayout>
  );
}
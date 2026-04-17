import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../../../context/ApplicationContext";
import StepLayout from "../../../components/layout/StepLayout";
import StepCard from "../../../components/apply/StepCard";
import StepNav from "../../../components/apply/StepNav";
import InfoBanner from "../../../components/apply/InfoBanner";
import { BRAND } from "../../../config/theme";
import api from "../../../services/api";

function getRequiredDocs(transactionType, addressChangeRequested, proofOfAddressDocType, hasDigitalLicence) {
  const docs = [
    { key: "licence_photo",     label: "Passport-style Photo", side: null,    required: true },
    { key: "national_id_front", label: "National ID",          side: "Front", required: true },
    { key: "national_id_back",  label: "National ID",          side: "Back",  required: true },
  ];

  if (transactionType !== "AMENDMENT" && !hasDigitalLicence) {
    docs.push(
      { key: "existing_licence_front", label: "Current Driver's Licence", side: "Front", required: true },
      { key: "existing_licence_back",  label: "Current Driver's Licence", side: "Back",  required: true }
    );
  }

  if (transactionType === "REPLACEMENT") {
    docs.push({ key: "police_report", label: "Police Report", side: null, required: false });
  }

  if (addressChangeRequested === true && proofOfAddressDocType) {
    docs.push({ key: "proof_of_address", label: "Proof of Address", side: null, required: true, subtype: proofOfAddressDocType });
  }

  return docs;
}

async function assessDocumentQuality(file) {
  if (file.type === "application/pdf") {
    return { quality: "good", score: 100, message: "PDF uploaded — quality check skipped." };
  }
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(
    "/api/applicant/documents/quality-check",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data;
}

export default function DocumentUpload() {
  const navigate = useNavigate();
  const { state, update } = useAppState();

  const [recovering, setRecovering] = useState(false);
  const [uploads, setUploads] = useState({});
  const [uploading, setUploading] = useState({});
  const [quality, setQuality] = useState({});
  const [errors, setErrors] = useState({});
  const fileRefs = useRef({});

  const [hasDigitalLicence, setHasDigitalLicence] = useState(false);
  useEffect(() => {
    api.get("/api/applicant/digital-licence/latest")
      .then((res) => setHasDigitalLicence(!!res.data.digital_licence))
      .catch(() => {});
  }, []);

  // Recover application if context lost
  useEffect(() => {
    if (!state.applicationId) {
      setRecovering(true);
      api.get("/api/applicant/applications")
        .then((res) => {
          const apps = res.data.applications ?? [];
          const draft = apps.find(
            (a) => a.status === "DRAFT" &&
              (state.transactionType ? a.transaction_type === state.transactionType : true)
          );
          if (draft) {
            update({
              applicationId: draft.id,
              applicationNumber: draft.application_number,
              transactionType: draft.transaction_type,
            });
          } else {
            navigate("/apply");
          }
        })
        .catch(() => navigate("/apply"))
        .finally(() => setRecovering(false));
    }
  }, []);

  // Restore already-uploaded documents + previews + AI results on mount
  useEffect(() => {
    if (!state.applicationId) return;
    api.get(`/api/applicant/applications/${state.applicationId}`)
      .then(async (res) => {
        const docs = res.data.documents ?? [];
        const restored = {};
        const restoredQuality = {};

        await Promise.all(
          docs.filter((d) => d.is_current).map(async (d) => {
            restored[d.doc_type] = {
              id: d.id,
              filename: d.original_filename,
              uploadedAt: d.uploaded_at,
              previewUrl: null,
            };

            if (d.ai_check_passed !== null && d.ai_check_passed !== undefined) {
              restoredQuality[d.doc_type] = {
                quality: d.ai_check_passed
                  ? (d.ai_check_score >= 90 ? "good" : "warning")
                  : "poor",
                score: d.ai_check_score ?? null,
                message: d.ai_check_comment ?? "",
              };
            }

            try {
              const fileRes = await api.get(
                `/api/applicant/applications/${state.applicationId}/documents/${d.id}/file`,
                { responseType: "blob" }
              );
              if (fileRes.data.type.startsWith("image/")) {
                restored[d.doc_type].previewUrl = URL.createObjectURL(fileRes.data);
              }
            } catch {
              // Preview fetch failed — show filename only
            }
          })
        );

        if (Object.keys(restored).length > 0) {
          setUploads(restored);
          setQuality(restoredQuality);
        }
      })
      .catch(() => {});
  }, [state.applicationId]);

  const requiredDocs = getRequiredDocs(
    state.transactionType,
    state.addressChangeRequested,
    state.proofOfAddressDocType,
    hasDigitalLicence
  );

  const allRequiredUploaded = requiredDocs
    .filter((d) => d.required)
    .every((doc) => uploads[doc.key]);

  const handleFileChange = async (docKey, subtype, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((p) => ({ ...p, [docKey]: "File too large. Maximum size is 5MB." }));
      return;
    }
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setErrors((p) => ({ ...p, [docKey]: "Invalid file type. Use JPG, PNG or PDF." }));
      return;
    }

    setErrors((p) => ({ ...p, [docKey]: null }));
    setUploading((p) => ({ ...p, [docKey]: true }));
    setQuality((p) => ({ ...p, [docKey]: null }));

    try {
      const qualityResult = await assessDocumentQuality(file);
      setQuality((p) => ({ ...p, [docKey]: qualityResult }));

      if (qualityResult.quality === "poor") {
        setUploading((p) => ({ ...p, [docKey]: false }));
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", docKey);
      if (subtype) formData.append("doc_subtype", subtype);

      const res = await api.post(
        `/api/applicant/applications/${state.applicationId}/documents`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      // Save AI result to backend
      await api.patch(
        `/api/applicant/applications/${state.applicationId}/documents/${res.data.id}/ai-result`,
        {
          ai_check_passed:  qualityResult.quality !== "poor",
          ai_check_score:   qualityResult.score ?? null,
          ai_check_comment: qualityResult.message ?? null,
        }
      ).catch(() => {});

      setUploads((p) => ({
        ...p,
        [docKey]: {
          id: res.data.id,
          filename: res.data.original_filename,
          uploadedAt: res.data.uploaded_at,
          previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        },
      }));
    } catch (err) {
      setErrors((p) => ({
        ...p,
        [docKey]: err.response?.data?.error || "Upload failed. Please try again.",
      }));
    } finally {
      setUploading((p) => ({ ...p, [docKey]: false }));
    }
  };

  const handleRemove = (docKey) => {
    if (uploads[docKey]?.previewUrl) URL.revokeObjectURL(uploads[docKey].previewUrl);
    setUploads((p) => { const n = { ...p }; delete n[docKey]; return n; });
    setQuality((p) => { const n = { ...p }; delete n[docKey]; return n; });
    if (fileRefs.current[docKey]) fileRefs.current[docKey].value = "";
  };

  const handleBack = () => {
    if (state.addressChangeRequested === true) {
      navigate("/apply/supporting-changes");
    } else {
      navigate("/apply/retrieve-record");
    }
  };

  const handleContinue = () => {
    if (!allRequiredUploaded) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate("/apply/verification");
  };

  const stepNumber = state.addressChangeRequested === true ? 4 : 3;
  const currentStep = state.addressChangeRequested === true ? 3 : 2;

  const groups = requiredDocs.reduce((acc, doc) => {
    if (!acc[doc.label]) acc[doc.label] = [];
    acc[doc.label].push(doc);
    return acc;
  }, {});

  if (recovering) {
    return (
      <StepLayout currentStep={currentStep}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh", gap: "12px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: "14px", color: "#64748b" }}>Recovering your application...</span>
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout currentStep={currentStep}>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
          Step {stepNumber} of 9
        </p>
        <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#1b1c1c", margin: "0 0 6px", letterSpacing: "-0.4px" }}>
          Upload Documents
        </h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
          Upload clear photos or scans of each required document. AI will verify the quality of each upload.
        </p>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <InfoBanner type="info" message="Both front and back of each document are required where applicable. Ensure all four corners are visible, use good lighting, and avoid glare and blur. Passport-style photo must have a plain background with face clearly visible. Accepted formats: JPG, PNG, PDF — max 5MB per file." />
      </div>

      {hasDigitalLicence && state.transactionType !== "AMENDMENT" && (
        <div style={{ marginBottom: "20px" }}>
          <InfoBanner type="success" message="A digital licence is already on file — you do not need to upload your existing licence." />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {Object.entries(groups).map(([label, docs]) => {
          const requiredGroup = docs.some((d) => d.required);
          const allGroupDone = docs.filter((d) => d.required).every((d) => uploads[d.key]);
          const anyGroupDone = docs.some((d) => uploads[d.key]);

          return (
            <StepCard key={label}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 3px" }}>
                    {label}
                    {requiredGroup
                      ? <span style={{ color: "#dc2626" }}> *</span>
                      : <span style={{ fontSize: "12px", fontWeight: "400", color: "#94a3b8", marginLeft: "6px" }}>(optional)</span>
                    }
                  </h3>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                    {label === "Passport-style Photo"
                      ? "Plain background, face clearly visible, good lighting"
                      : label === "Police Report"
                      ? "Optional but recommended for lost licence applications"
                      : docs.length > 1
                      ? "Upload both front and back"
                      : "Upload a clear photo or scan"}
                  </p>
                </div>
                {(requiredGroup ? allGroupDone : anyGroupDone) && (
                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "99px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
                    ✓ Complete
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: docs.length > 1 ? "1fr 1fr" : "1fr", gap: "16px" }}>
                {docs.map((doc) => (
                  <UploadSlot
                    key={doc.key}
                    docKey={doc.key}
                    side={doc.side}
                    uploaded={uploads[doc.key]}
                    uploading={uploading[doc.key]}
                    qualityResult={quality[doc.key]}
                    error={errors[doc.key]}
                    fileRef={(el) => fileRefs.current[doc.key] = el}
                    onChange={(file) => handleFileChange(doc.key, doc.subtype, file)}
                    onRemove={() => handleRemove(doc.key)}
                  />
                ))}
              </div>
            </StepCard>
          );
        })}
      </div>

      {!allRequiredUploaded && (
        <div style={{ marginTop: "20px" }}>
          <InfoBanner type="warning" message="Please upload all required documents before continuing." />
        </div>
      )}

      <StepNav
        onBack={handleBack}
        onContinue={handleContinue}
        continueDisabled={!allRequiredUploaded}
        continueLabel="Continue to Verification"
      />
    </StepLayout>
  );
}

function UploadSlot({ docKey, side, uploaded, uploading, qualityResult, error, fileRef, onChange, onRemove }) {
  return (
    <div>
      {side && (
        <p style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>{side}</p>
      )}

      <input
        id={`file-input-${docKey}`}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        style={{ display: "none" }}
        ref={fileRef}
        onChange={(e) => onChange(e.target.files[0])}
      />

      {!uploaded && !uploading && (
        <div
          onClick={() => document.getElementById(`file-input-${docKey}`)?.click()}
          style={{
            border: `2px dashed ${error ? "#dc2626" : qualityResult?.quality === "poor" ? "#dc2626" : "#d1d5db"}`,
            borderRadius: "12px", padding: "32px 16px",
            textAlign: "center", cursor: "pointer",
            background: error || qualityResult?.quality === "poor" ? "#fef2f2" : "white",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = BRAND.primary; e.currentTarget.style.background = "#eff6ff"; }}
          onMouseLeave={(e) => {
            const isPoor = qualityResult?.quality === "poor";
            e.currentTarget.style.borderColor = error || isPoor ? "#dc2626" : "#d1d5db";
            e.currentTarget.style.background = error || isPoor ? "#fef2f2" : "white";
          }}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            {qualityResult?.quality === "poor" ? "🔄" : "📎"}
          </div>
          <p style={{ fontSize: "13px", fontWeight: "600", color: "#374151", margin: "0 0 4px" }}>
            {qualityResult?.quality === "poor" ? "Retake and upload again" : "Click to upload"}
          </p>
          <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>JPG, PNG or PDF · max 5MB</p>
        </div>
      )}

      {uploading && (
        <div style={{
          borderRadius: "12px", padding: "28px 16px", textAlign: "center",
          background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)",
          border: "1.5px solid #c7d2fe",
        }}>
          <div style={{ position: "relative", width: "48px", height: "48px", margin: "0 auto 14px" }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ position: "absolute", inset: 0, animation: "spin 1.2s linear infinite" }}>
              <circle cx="24" cy="24" r="20" stroke="#c7d2fe" strokeWidth="3" />
              <path d="M24 4 a20 20 0 0 1 20 20" stroke={BRAND.primary} strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🔍</div>
          </div>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes bounce {
              0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
              40% { transform: scale(1); opacity: 1; }
            }
          `}</style>
          <p style={{ fontSize: "14px", color: BRAND.primaryDeep, fontWeight: "700", margin: "0 0 4px" }}>
            AI is reviewing your document
          </p>
          <p style={{ fontSize: "12px", color: "#6366f1", margin: "0 0 12px" }}>
            Checking clarity, lighting and readability...
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: BRAND.primary,
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        </div>
      )}

      {uploaded && !uploading && (
        <div style={{ border: "1.5px solid #bbf7d0", borderRadius: "12px", overflow: "hidden", background: "#f0fdf4" }}>
          {uploaded.previewUrl && (
            <div style={{ width: "100%", height: "140px", overflow: "hidden", background: "#e5e7eb" }}>
              <img src={uploaded.previewUrl} alt="Document preview" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          )}
          <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "14px" }}>✓</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "12px", fontWeight: "600", color: "#14532d", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {uploaded.filename}
                </p>
                <p style={{ fontSize: "11px", color: "#16a34a", margin: 0 }}>Uploaded successfully</p>
              </div>
            </div>
            <button
              onClick={onRemove}
              style={{ background: "none", border: "none", fontSize: "12px", color: "#dc2626", cursor: "pointer", fontWeight: "600", flexShrink: 0, padding: "4px 8px", borderRadius: "6px" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
              onMouseLeave={(e) => e.currentTarget.style.background = "none"}
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {qualityResult && (
        <div style={{
          marginTop: "10px", padding: "14px 16px", borderRadius: "10px",
          background: qualityResult.quality === "good"
            ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
            : qualityResult.quality === "warning"
            ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)"
            : "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
          border: `1.5px solid ${
            qualityResult.quality === "good" ? "#86efac"
            : qualityResult.quality === "warning" ? "#fcd34d"
            : "#fca5a5"
          }`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px",
                background: qualityResult.quality === "good" ? "#22c55e" : qualityResult.quality === "warning" ? "#f59e0b" : "#ef4444",
                color: "white", fontWeight: "700",
              }}>
                {qualityResult.quality === "good" ? "✓" : qualityResult.quality === "warning" ? "!" : "✕"}
              </div>
              <p style={{
                fontSize: "13px", fontWeight: "700", margin: 0,
                color: qualityResult.quality === "good" ? "#14532d" : qualityResult.quality === "warning" ? "#92400e" : "#991b1b",
              }}>
                {qualityResult.quality === "good" ? "Quality Verified"
                  : qualityResult.quality === "warning" ? "Accepted with Warning"
                  : "Quality Check Failed"}
              </p>
            </div>
            {qualityResult.score !== undefined && qualityResult.score !== null && (
              <div style={{ textAlign: "right" }}>
                <span style={{
                  fontSize: "20px", fontWeight: "800", letterSpacing: "-0.5px",
                  color: qualityResult.quality === "good" ? "#15803d" : qualityResult.quality === "warning" ? "#d97706" : "#dc2626",
                }}>
                  {qualityResult.score}
                </span>
                <span style={{
                  fontSize: "11px", fontWeight: "600",
                  color: qualityResult.quality === "good" ? "#16a34a" : qualityResult.quality === "warning" ? "#a16207" : "#dc2626",
                }}>/100</span>
              </div>
            )}
          </div>

          {qualityResult.score !== undefined && qualityResult.score !== null && (
            <div style={{ height: "5px", borderRadius: "99px", background: "rgba(0,0,0,0.08)", marginBottom: "10px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${qualityResult.score}%`, borderRadius: "99px",
                background: qualityResult.quality === "good"
                  ? "linear-gradient(90deg, #22c55e, #15803d)"
                  : qualityResult.quality === "warning"
                  ? "linear-gradient(90deg, #fbbf24, #d97706)"
                  : "linear-gradient(90deg, #f87171, #dc2626)",
                transition: "width 0.8s ease",
              }} />
            </div>
          )}

          <p style={{
            fontSize: "12px", margin: 0, lineHeight: 1.6,
            color: qualityResult.quality === "good" ? "#166534" : qualityResult.quality === "warning" ? "#92400e" : "#991b1b",
          }}>
            {qualityResult.message}
          </p>

          {qualityResult.quality === "warning" && (
            <p style={{ fontSize: "11px", color: "#a16207", margin: "6px 0 0", fontStyle: "italic" }}>
              Accepted — an officer may request a clearer copy during review.
            </p>
          )}

          {qualityResult.quality === "poor" && (
            <p style={{ fontSize: "12px", fontWeight: "600", color: "#dc2626", margin: "8px 0 0" }}>
              🔄 Please retake the photo and upload again.
            </p>
          )}
        </div>
      )}

      {error && <p style={{ fontSize: "12px", color: "#dc2626", margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppState } from "../../context/ApplicationContext";
import api from "../../services/api";
import { BRAND } from "../../config/theme";

// Maps application status to the furthest step the citizen can go to
function getResumeRoute(app) {
  switch (app.status) {
    case "DRAFT":
      // Figure out how far they got based on what data exists
      if (app.payment_reference) return "/apply/success";
      if (app.declaration)        return "/apply/payment";
      if (app.fee_amount)         return "/apply/declaration";
      // Default draft entry point
      return "/apply/retrieve-record";
    case "ACTION_REQUIRED":
    case "WAITING_ON_APPLICANT":
      return "/apply/retrieve-record"; // resubmission flow — TBD
    default:
      return "/dashboard"; // SUBMITTED, APPROVED, REJECTED etc — no resume
  }
}

export default function ApplicationRouter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { update } = useAppState();

  useEffect(() => {
    api.get(`/api/applicant/applications/${id}`)
      .then((res) => {
        const app = res.data;
        // Load draft data back into context
        update({
          applicationId:          app.id,
          applicationNumber:      app.application_number,
          transactionType:        app.transaction_type,
          replacementReason:      app.replacement_reason || null,
          addressChangeRequested: app.address_change_requested || false,
          newAddressLine1:        app.new_address_line1 || "",
          newAddressLine2:        app.new_address_line2 || "",
          newParish:              app.new_parish || "",
          feeAmount:              app.fee_amount || null,
          paymentReference:       app.payment_reference || null,
        });
        navigate(getResumeRoute(app), { replace: true });
      })
      .catch(() => navigate("/dashboard", { replace: true }));
  }, [id]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", gap: "12px" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
        <path d="M21 12a9 9 0 11-6.219-8.56" />
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: "14px", color: "#64748b" }}>Loading application...</span>
    </div>
  );
}
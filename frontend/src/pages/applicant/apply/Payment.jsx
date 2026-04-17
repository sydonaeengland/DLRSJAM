import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../../../context/ApplicationContext";
import StepLayout from "../../../components/layout/StepLayout";
import StepCard from "../../../components/apply/StepCard";
import StepNav from "../../../components/apply/StepNav";
import InfoBanner from "../../../components/apply/InfoBanner";
import { BRAND } from "../../../config/theme";
import api from "../../../services/api";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "15px",
      color: "#1b1c1c",
      fontFamily: "inherit",
      "::placeholder": { color: "#94a3b8" },
    },
    invalid: { color: "#dc2626" },
  },
};

const fieldLabel = {
  display: "block", fontSize: "13px", fontWeight: "600",
  color: "#374151", marginBottom: "6px",
};

const stripeFieldWrap = (hasError) => ({
  padding: "12px 14px",
  border: `1.5px solid ${hasError ? "#dc2626" : "#e9e8e7"}`,
  borderRadius: "10px",
  background: "white",
  transition: "border-color 0.15s",
});

// ── Inner form (needs Stripe context) ────────────────────────────────────────
function CheckoutForm({ clientSecret, amountDisplay, applicationId, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [cardErrors, setCardErrors] = useState({});

  const handleCardChange = (field) => (e) => {
    setCardErrors((prev) => ({ ...prev, [field]: e.error?.message || "" }));
  };

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    setError("");

    const cardNumber = elements.getElement(CardNumberElement);

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardNumber },
    });

    if (stripeError) {
      setError(stripeError.message);
      setProcessing(false);
      return;
    }

    if (paymentIntent.status === "succeeded") {
      try {
        await api.post(`/api/applicant/applications/${applicationId}/confirm-payment`, {
          payment_intent_id: paymentIntent.id,
        });
        onSuccess(paymentIntent.id);
      } catch {
        setError("Payment succeeded but we could not confirm. Please contact support.");
        setProcessing(false);
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Card number */}
      <div>
        <label style={fieldLabel}>Card Number <span style={{ color: "#dc2626" }}>*</span></label>
        <div style={stripeFieldWrap(cardErrors.number)}>
          <CardNumberElement options={ELEMENT_OPTIONS} onChange={handleCardChange("number")} />
        </div>
        {cardErrors.number && <p style={{ fontSize: "12px", color: "#dc2626", margin: "4px 0 0" }}>{cardErrors.number}</p>}
      </div>

      {/* Expiry + CVC */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <label style={fieldLabel}>Expiry Date <span style={{ color: "#dc2626" }}>*</span></label>
          <div style={stripeFieldWrap(cardErrors.expiry)}>
            <CardExpiryElement options={ELEMENT_OPTIONS} onChange={handleCardChange("expiry")} />
          </div>
          {cardErrors.expiry && <p style={{ fontSize: "12px", color: "#dc2626", margin: "4px 0 0" }}>{cardErrors.expiry}</p>}
        </div>
        <div>
          <label style={fieldLabel}>CVC <span style={{ color: "#dc2626" }}>*</span></label>
          <div style={stripeFieldWrap(cardErrors.cvc)}>
            <CardCvcElement options={ELEMENT_OPTIONS} onChange={handleCardChange("cvc")} />
          </div>
          {cardErrors.cvc && <p style={{ fontSize: "12px", color: "#dc2626", margin: "4px 0 0" }}>{cardErrors.cvc}</p>}
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: "10px", background: "#fef2f2", border: "1.5px solid #fecaca" }}>
          <p style={{ fontSize: "13px", color: "#dc2626", margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={processing || !stripe}
        style={{
          width: "100%", height: "52px", borderRadius: "12px",
          border: "none", cursor: processing ? "not-allowed" : "pointer",
          background: processing ? "#94a3b8" : `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%)`,
          color: "white", fontSize: "16px", fontWeight: "700",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          transition: "all 0.2s",
          boxShadow: processing ? "none" : "0 4px 14px rgba(37,99,235,0.35)",
        }}
      >
        {processing ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Processing payment…
          </>
        ) : (
          <>
            🔒 Pay {amountDisplay} JMD
          </>
        )}
      </button>

      {/* Stripe badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "4px" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>Secured by Stripe · SSL encrypted</p>
      </div>
    </div>
  );
}

// ── Main Payment page ─────────────────────────────────────────────────────────
export default function Payment() {
  const navigate = useNavigate();
  const { state, update } = useAppState();

  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState("");
  const [amountDisplay, setAmountDisplay] = useState("");
  const [amountCents, setAmountCents] = useState(0);
  const [fetchError, setFetchError] = useState("");
  const [paid, setPaid] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState("");

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  useEffect(() => {
    if (!state.applicationId) return;
    api.post(`/api/applicant/applications/${state.applicationId}/create-payment-intent`)
      .then((res) => {
        setClientSecret(res.data.client_secret);
        setAmountDisplay(res.data.amount_display);
        setAmountCents(res.data.amount);
        setLoading(false);
      })
      .catch(() => {
        setFetchError("Could not load payment details. Please go back and try again.");
        setLoading(false);
      });
  }, [state.applicationId]);

  const handleSuccess = (intentId) => {
    setPaymentIntentId(intentId);
    update({ paymentConfirmed: true, paymentIntentId: intentId });
    setPaid(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const TRANSACTION_LABELS = {
    RENEWAL: "Licence Renewal",
    REPLACEMENT: "Licence Replacement",
    AMENDMENT: "Licence Amendment",
  };

  const transactionLabel = TRANSACTION_LABELS[state.transactionType] || "Licence Service";

  // ── Success state ────────────────────────────────────────────────────────
  if (paid) {
    return (
      <StepLayout currentStep={7}>
        <div style={{ textAlign: "center", padding: "20px 0 40px" }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: "0 8px 24px rgba(34,197,94,0.3)",
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M6 16l7 7 13-13" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#1b1c1c", margin: "0 0 8px" }}>Payment Confirmed</h1>
          <p style={{ fontSize: "15px", color: "#64748b", margin: "0 0 32px" }}>
            Your application has been submitted successfully.
          </p>

          <StepCard>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#64748b" }}>Application Number</span>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", fontFamily: "monospace" }}>
                  {state.applicationNumber || "—"}
                </span>
              </div>
              <div style={{ height: "1px", background: "#f1f5f9" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#64748b" }}>Transaction</span>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#1b1c1c" }}>{transactionLabel}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#64748b" }}>Amount Paid</span>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#22c55e" }}>{amountDisplay} JMD</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#64748b" }}>Payment Reference</span>
                <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", fontFamily: "monospace" }}>
                  {paymentIntentId.slice(0, 24)}…
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#64748b" }}>Status</span>
                <span style={{
                  fontSize: "12px", fontWeight: "700", padding: "3px 10px",
                  borderRadius: "999px", background: "#dcfce7", color: "#16a34a",
                }}>SUBMITTED</span>
              </div>
            </div>
          </StepCard>

          <button
            onClick={() => navigate("/dashboard")}
            style={{
              marginTop: "24px", width: "100%", height: "50px", borderRadius: "12px",
              border: "none", background: BRAND.primary, color: "white",
              fontSize: "15px", fontWeight: "700", cursor: "pointer",
              boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
            }}
          >
            Go to Dashboard →
          </button>
        </div>
      </StepLayout>
    );
  }

  // ── Payment form ─────────────────────────────────────────────────────────
  return (
    <StepLayout currentStep={7}>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
          Step 8 of 9
        </p>
        <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#1b1c1c", margin: "0 0 6px", letterSpacing: "-0.4px" }}>
          Payment
        </h1>
        <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>
          Complete your payment to submit your application for review.
        </p>
      </div>

      {fetchError && (
        <div style={{ marginBottom: "20px" }}>
          <InfoBanner type="error" message={fetchError} />
        </div>
      )}

      {/* Order summary */}
      <p style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>
        Order Summary
      </p>
      <StepCard>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "14px", fontWeight: "600", color: "#1b1c1c", margin: "0 0 2px" }}>{transactionLabel}</p>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Application {state.applicationNumber || "—"}</p>
            </div>
            <p style={{ fontSize: "15px", fontWeight: "700", color: "#1b1c1c", margin: 0 }}>
              {loading ? "…" : amountDisplay} <span style={{ fontSize: "12px", color: "#94a3b8" }}>JMD</span>
            </p>
          </div>
          <div style={{ height: "1px", background: "#f1f5f9" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "14px", fontWeight: "700", color: "#1b1c1c", margin: 0 }}>Total</p>
            <p style={{ fontSize: "18px", fontWeight: "800", color: BRAND.primary, margin: 0 }}>
              {loading ? "…" : amountDisplay} <span style={{ fontSize: "13px", fontWeight: "600" }}>JMD</span>
            </p>
          </div>
        </div>
      </StepCard>

      {/* Card form */}
      <p style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", margin: "24px 0 8px" }}>
        Card Details
      </p>
      <StepCard>
        {loading ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "10px" }}>Loading payment form…</p>
          </div>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm
              clientSecret={clientSecret}
              amountDisplay={amountDisplay}
              applicationId={state.applicationId}
              onSuccess={handleSuccess}
            />
          </Elements>
        ) : null}
      </StepCard>

      <div style={{ marginTop: "24px" }}>
        <InfoBanner
          type="info"
          message="Test mode: use card 4242 4242 4242 4242, any future expiry, any CVC."
        />
      </div>

      <div style={{ marginTop: "16px" }}>
        <button
          onClick={() => navigate("/apply/declaration")}
          style={{
            width: "100%", height: "44px", borderRadius: "10px",
            border: "1.5px solid #e2e8f0", background: "white",
            fontSize: "14px", fontWeight: "600", color: "#64748b", cursor: "pointer",
          }}
        >
          ← Back to Declaration
        </button>
      </div>
    </StepLayout>
  );
}
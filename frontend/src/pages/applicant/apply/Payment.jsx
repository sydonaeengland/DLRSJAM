import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../../../context/ApplicationContext";
import StepLayout from "../../../components/layout/StepLayout";
import StepCard from "../../../components/apply/StepCard";
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
      fontWeight: "500",
      "::placeholder": { color: "#94a3b8" },
    },
    invalid: { color: "#dc2626" },
  },
};

const label = {
  display: "block", fontSize: "12px", fontWeight: "700",
  color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em",
};

const inputStyle = (hasError, focused) => ({
  width: "100%", height: "48px", borderRadius: "10px",
  border: `1.5px solid ${hasError ? "#dc2626" : focused ? BRAND.primary : "#e2e8f0"}`,
  padding: "0 14px", fontSize: "15px", color: "#1b1c1c",
  background: "white", fontFamily: "inherit", boxSizing: "border-box",
  outline: "none", transition: "border-color 0.15s",
});

const stripeWrap = (hasError, focused) => ({
  padding: "13px 14px",
  border: `1.5px solid ${hasError ? "#dc2626" : focused ? BRAND.primary : "#e2e8f0"}`,
  borderRadius: "10px", background: "white", transition: "border-color 0.15s",
});

// ── Card preview ──────────────────────────────────────────────────────────────
function CardPreview({ cardholderName, cardNumber, expiry, focused }) {
  const displayName = cardholderName.trim() || "YOUR NAME";
  const displayNum = cardNumber || "•••• •••• •••• ••••";
  const displayExp = expiry || "MM / YY";

  return (
    <div style={{
      background: `linear-gradient(135deg, ${BRAND.primaryDeep} 0%, ${BRAND.primary} 60%, ${BRAND.primaryLight} 100%)`,
      borderRadius: "16px", padding: "24px", color: "white",
      boxShadow: "0 12px 32px rgba(37,99,235,0.35)",
      position: "relative", overflow: "hidden",
      minHeight: "160px",
    }}>
      {/* Background circles */}
      <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "140px", height: "140px", borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
      <div style={{ position: "absolute", bottom: "-30px", right: "60px", width: "100px", height: "100px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

      {/* Chip */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div style={{ width: "40px", height: "30px", borderRadius: "6px", background: "linear-gradient(135deg, #fbbf24, #f59e0b)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)" }} />
        <p style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.1em", opacity: 0.8, margin: 0 }}>VISA</p>
      </div>

      {/* Card number */}
      <p style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "0.2em", margin: "0 0 16px", fontFamily: "monospace", opacity: displayNum.includes("•") ? 0.5 : 1 }}>
        {displayNum}
      </p>

      {/* Name + expiry */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p style={{ fontSize: "10px", opacity: 0.6, margin: "0 0 3px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Card Holder</p>
          <p style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.05em", margin: 0, textTransform: "uppercase", opacity: displayName === "YOUR NAME" ? 0.4 : 1 }}>
            {displayName.length > 20 ? displayName.slice(0, 20) + "…" : displayName}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "10px", opacity: 0.6, margin: "0 0 3px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Expires</p>
          <p style={{ fontSize: "13px", fontWeight: "700", margin: 0, opacity: displayExp === "MM / YY" ? 0.4 : 1 }}>{displayExp}</p>
        </div>
      </div>
    </div>
  );
}

// ── Checkout form ─────────────────────────────────────────────────────────────
function CheckoutForm({ clientSecret, amountDisplay, applicationId, onSuccess, licenceName }) {
  const stripe = useStripe();
  const elements = useElements();

  const [cardholderName, setCardholderName] = useState(licenceName || "");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [cardErrors, setCardErrors] = useState({});
  const [focused, setFocused] = useState({});

  // For card preview
  const [previewNumber, setPreviewNumber] = useState("");
  const [previewExpiry, setPreviewExpiry] = useState("");

  const handleCardChange = (field) => (e) => {
    setCardErrors((prev) => ({ ...prev, [field]: e.error?.message || "" }));
    if (field === "number" && e.value?.postalCode !== undefined) {
      // approximate display
      setPreviewNumber(e.complete ? "•••• •••• •••• ••••" : "");
    }
    if (field === "expiry" && e.complete) {
      setPreviewExpiry(e.value || "");
    }
  };

  const handlePay = async () => {
    if (!stripe || !elements) return;
    if (!cardholderName.trim()) {
      setCardErrors((p) => ({ ...p, name: "Cardholder name is required" }));
      return;
    }
    setProcessing(true);
    setError("");

    const cardNumber = elements.getElement(CardNumberElement);

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardNumber,
        billing_details: { name: cardholderName.trim() },
      },
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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Card preview */}
      <CardPreview
        cardholderName={cardholderName}
        cardNumber={previewNumber}
        expiry={previewExpiry}
        focused={focused}
      />

      {/* Cardholder name */}
      <div>
        <label style={label}>Cardholder Name <span style={{ color: "#dc2626" }}>*</span></label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => { setCardholderName(e.target.value); if (cardErrors.name) setCardErrors((p) => ({ ...p, name: "" })); }}
          placeholder="Name as it appears on card"
          style={inputStyle(cardErrors.name, focused.name)}
          onFocus={() => setFocused((p) => ({ ...p, name: true }))}
          onBlur={() => setFocused((p) => ({ ...p, name: false }))}
        />
        {cardErrors.name && <p style={{ fontSize: "12px", color: "#dc2626", margin: "4px 0 0" }}>{cardErrors.name}</p>}
      </div>

      {/* Card number */}
      <div>
        <label style={label}>Card Number <span style={{ color: "#dc2626" }}>*</span></label>
        <div
          style={stripeWrap(cardErrors.number, focused.number)}
          onFocus={() => setFocused((p) => ({ ...p, number: true }))}
          onBlur={() => setFocused((p) => ({ ...p, number: false }))}
        >
          <CardNumberElement options={ELEMENT_OPTIONS} onChange={handleCardChange("number")} />
        </div>
        {cardErrors.number && <p style={{ fontSize: "12px", color: "#dc2626", margin: "4px 0 0" }}>{cardErrors.number}</p>}
      </div>

      {/* Expiry + CVC */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <label style={label}>Expiry Date <span style={{ color: "#dc2626" }}>*</span></label>
          <div
            style={stripeWrap(cardErrors.expiry, focused.expiry)}
            onFocus={() => setFocused((p) => ({ ...p, expiry: true }))}
            onBlur={() => setFocused((p) => ({ ...p, expiry: false }))}
          >
            <CardExpiryElement options={ELEMENT_OPTIONS} onChange={handleCardChange("expiry")} />
          </div>
          {cardErrors.expiry && <p style={{ fontSize: "12px", color: "#dc2626", margin: "4px 0 0" }}>{cardErrors.expiry}</p>}
        </div>
        <div>
          <label style={label}>CVC <span style={{ color: "#dc2626" }}>*</span></label>
          <div
            style={stripeWrap(cardErrors.cvc, focused.cvc)}
            onFocus={() => setFocused((p) => ({ ...p, cvc: true }))}
            onBlur={() => setFocused((p) => ({ ...p, cvc: false }))}
          >
            <CardCvcElement options={ELEMENT_OPTIONS} onChange={handleCardChange("cvc")} />
          </div>
          {cardErrors.cvc && <p style={{ fontSize: "12px", color: "#dc2626", margin: "4px 0 0" }}>{cardErrors.cvc}</p>}
        </div>
      </div>

      {/* Accepted cards */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Accepted:</p>
        {["VISA", "MC", "AMEX"].map((c) => (
          <span key={c} style={{
            fontSize: "10px", fontWeight: "800", padding: "3px 8px",
            borderRadius: "4px", border: "1.5px solid #e2e8f0",
            color: "#64748b", letterSpacing: "0.05em",
          }}>{c}</span>
        ))}
      </div>

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: "10px", background: "#fef2f2", border: "1.5px solid #fecaca", display: "flex", gap: "8px", alignItems: "flex-start" }}>
          <span style={{ fontSize: "16px", flexShrink: 0 }}>⚠️</span>
          <p style={{ fontSize: "13px", color: "#dc2626", margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={processing || !stripe}
        style={{
          width: "100%", height: "54px", borderRadius: "12px",
          border: "none", cursor: processing ? "not-allowed" : "pointer",
          background: processing ? "#94a3b8" : `linear-gradient(135deg, ${BRAND.primaryDeep} 0%, ${BRAND.primary} 100%)`,
          color: "white", fontSize: "16px", fontWeight: "800",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          transition: "all 0.2s", letterSpacing: "0.02em",
          boxShadow: processing ? "none" : "0 6px 20px rgba(37,99,235,0.4)",
        }}
        onMouseEnter={(e) => { if (!processing) e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
      >
        {processing ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Processing…
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Pay {amountDisplay} JMD
          </>
        )}
      </button>

      {/* Security badges */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", paddingTop: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>SSL Encrypted</p>
        </div>
        <div style={{ width: "1px", height: "12px", background: "#e2e8f0" }} />
        <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>Powered by Stripe</p>
        <div style={{ width: "1px", height: "12px", background: "#e2e8f0" }} />
        <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>PCI DSS Compliant</p>
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
  const [fetchError, setFetchError] = useState("");

  const TRANSACTION_LABELS = {
    RENEWAL: "Licence Renewal",
    REPLACEMENT: "Licence Replacement",
    AMENDMENT: "Licence Amendment",
  };
  const transactionLabel = TRANSACTION_LABELS[state.transactionType] || "Licence Service";
  const licenceName = state.licenceRecord
    ? `${state.licenceRecord.firstname} ${state.licenceRecord.lastname}`
    : "";

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  useEffect(() => {
    if (!state.applicationId) return;
    api.post(`/api/applicant/applications/${state.applicationId}/create-payment-intent`)
      .then((res) => {
        setClientSecret(res.data.client_secret);
        setAmountDisplay(res.data.amount_display);
        setLoading(false);
      })
      .catch(() => {
        setFetchError("Could not load payment details. Please go back and try again.");
        setLoading(false);
      });
  }, [state.applicationId]);

  const [confirming, setConfirming] = useState(false);

  const handleSuccess = (intentId) => {
    update({ paymentConfirmed: true, paymentIntentId: intentId });
    setConfirming(true);
    // Show the processing screen for 2.5s so the user sees confirmation before redirect
    setTimeout(() => {
      navigate(`/apply/success?appId=${state.applicationId}`);
    }, 2500);
  };

  // ── Processing screen ────────────────────────────────────────────────────
  if (confirming) {
    return (
      <StepLayout currentStep={7}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "0", textAlign: "center" }}>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
          `}</style>

          {/* Success circle */}
          <div style={{
            width: "80px", height: "80px", borderRadius: "50%",
            background: "#16a34a",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: "24px",
            animation: "pulse 1.5s ease-in-out infinite",
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L20 7" />
            </svg>
          </div>

          <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#111827", margin: "0 0 8px", animation: "fadeUp 0.4s ease forwards" }}>
            Payment Successful
          </h2>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 32px", animation: "fadeUp 0.5s ease forwards" }}>
            Submitting your application…
          </p>

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "320px", animation: "fadeUp 0.6s ease forwards" }}>
            {[
              { label: "Payment confirmed",       done: true },
              { label: "Submitting application",  done: true },
              { label: "Generating reference",    done: false },
            ].map((step) => (
              <div key={step.label} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px", background: step.done ? "#f0fdf4" : "#f8fafc", border: `1px solid ${step.done ? "#bbf7d0" : "#e2e8f0"}` }}>
                {step.done ? (
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                    </svg>
                  </div>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                )}
                <span style={{ fontSize: "13px", fontWeight: "600", color: step.done ? "#15803d" : "#374151" }}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout currentStep={7}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: "700", color: BRAND.primary, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
          Step 8 of 9
        </p>
        <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#1b1c1c", margin: "0 0 6px", letterSpacing: "-0.4px" }}>
          Secure Payment
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
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0,
            background: `${BRAND.primary}12`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "14px", fontWeight: "700", color: "#1b1c1c", margin: "0 0 2px" }}>{transactionLabel}</p>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, fontFamily: "monospace" }}>
              {state.applicationNumber || "—"}
            </p>
          </div>
          <p style={{ fontSize: "16px", fontWeight: "800", color: "#1b1c1c", margin: 0 }}>
            {loading ? "…" : amountDisplay} <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>JMD</span>
          </p>
        </div>
        <div style={{ height: "1px", background: "#f1f5f9", margin: "0 0 14px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: "13px", fontWeight: "700", color: "#1b1c1c", margin: 0 }}>Total Due</p>
          <p style={{ fontSize: "20px", fontWeight: "800", color: BRAND.primary, margin: 0 }}>
            {loading ? "…" : amountDisplay} <span style={{ fontSize: "13px", fontWeight: "600" }}>JMD</span>
          </p>
        </div>
      </StepCard>

      {/* Card form */}
      <p style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", margin: "24px 0 8px" }}>
        Card Details
      </p>
      <StepCard>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BRAND.primary} strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "12px" }}>Preparing secure payment form…</p>
          </div>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm
              clientSecret={clientSecret}
              amountDisplay={amountDisplay}
              applicationId={state.applicationId}
              onSuccess={handleSuccess}
              licenceName={licenceName}
            />
          </Elements>
        ) : null}
      </StepCard>

      {/* Test mode banner */}
      <div style={{ marginTop: "16px" }}>
        <InfoBanner
          type="info"
          message="Test mode: use card 4242 4242 4242 4242, any future expiry, any 3-digit CVC."
        />
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate("/apply/declaration")}
        style={{
          marginTop: "16px", width: "100%", height: "44px", borderRadius: "10px",
          border: "1.5px solid #e2e8f0", background: "white",
          fontSize: "14px", fontWeight: "600", color: "#64748b", cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
      >
        ← Back to Declaration
      </button>
    </StepLayout>
  );
}
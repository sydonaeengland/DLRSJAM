import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { registerVerify, registerComplete } from "../../services/authService";
import coatOfArms from "../../assets/coat-of-arms.png";
import lobbyImg from "../../assets/slides/lobby.webp";
import drivingImg from "../../assets/slides/driving.webp";
import licenceKeysImg from "../../assets/slides/licence-keys.webp";
import { BRAND } from "../../config/theme";
import LeftPanel from "../../components/auth/LeftPanel";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import AuthError from "../../components/auth/AuthError";
import StepIndicator from "../../components/auth/StepIndicator";

const STEP_SLIDES = [
  { image: lobbyImg, headline: "Let's verify\nyour licence.", subtext: "Enter your TRN, date of birth, and the control number from the back of your card." },
  { image: licenceKeysImg, headline: "Is this\nyour licence?", subtext: "Review your details before we set up your account." },
  { image: drivingImg, headline: "Almost\nthere.", subtext: "Create your login credentials to complete your DLRSJAM account." },
];

export default function Register() {
  const [step, setStep] = useState(1);
  const [stepVisible, setStepVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(false);

  const [trn, setTrn] = useState("");
  const [dob, setDob] = useState("");
  const [controlNumber, setControlNumber] = useState("");
  const [licenceData, setLicenceData] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setPageVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const goToStep = (n) => {
    setStepVisible(false);
    setTimeout(() => { setStep(n); setError(""); setStepVisible(true); }, 250);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await registerVerify(trn, dob, controlNumber);
      setLicenceData(data.licence);
      goToStep(2);
    } catch (err) {
      setError(err.response?.data?.error || "No licence found matching these details.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const data = await registerComplete(trn, email, password, confirmPassword, phone);
      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Could not create account.");
    } finally {
      setLoading(false);
    }
  };

  const licenceClassLabel = (cls) => {
    if (cls === "A") return "Motorcycle only";
    if (cls === "B") return "Motor cars only";
    if (cls === "C") return "All motor vehicles";
    return cls || "—";
  };

  return (
    <div
      className="flex"
      style={{ height: "100dvh", overflow: "hidden", opacity: pageVisible ? 1 : 0, transition: "opacity 0.5s ease" }}
    >
      <LeftPanel
        slides={[STEP_SLIDES[step - 1]]}
        current={0}
        fading={!stepVisible}
        step={step}
        totalSteps={3}
      />

      <div className="flex-1 flex flex-col bg-white" style={{ overflow: "hidden" }}>
        {/* Mobile branding */}
        <div className="flex items-center gap-2 px-8 pt-6 lg:hidden flex-shrink-0">
          <img src={coatOfArms} alt="" className="w-6 h-6 object-contain" />
          <span className="text-xs font-semibold text-gray-700">Tax Administration Jamaica</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 min-h-0">
          <div
            className="w-full max-w-[420px]"
            style={{
              opacity: stepVisible ? 1 : 0,
              transform: stepVisible ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 0.25s ease, transform 0.25s ease",
            }}
          >
            {step === 1 && (
              <Step1
                trn={trn} setTrn={setTrn}
                dob={dob} setDob={setDob}
                controlNumber={controlNumber} setControlNumber={setControlNumber}
                error={error} loading={loading} step={step}
                onSubmit={handleVerify}
              />
            )}
            {step === 2 && (
              <Step2
                licenceData={licenceData}
                licenceClassLabel={licenceClassLabel}
                step={step}
                onConfirm={() => goToStep(3)}
                onBack={() => { setLicenceData(null); goToStep(1); }}
              />
            )}
            {step === 3 && (
              <Step3
                licenceData={licenceData}
                email={email} setEmail={setEmail}
                phone={phone} setPhone={setPhone}
                password={password} setPassword={setPassword}
                confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                error={error} loading={loading} step={step}
                onSubmit={handleComplete}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step1({ trn, setTrn, dob, setDob, controlNumber, setControlNumber, error, loading, step, onSubmit }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">New account</p>
      <h2 className="text-2xl font-bold text-gray-900 leading-tight">
        Create your <span style={{ color: BRAND.primary }}>DLRSJAM</span> account
      </h2>
      <p className="text-xs text-gray-400 mt-1">Verify your existing licence to get started.</p>
      <StepIndicator step={step} />
      <AuthError message={error} />
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <AuthInput label="Tax Registration Number (TRN)" type="text" value={trn}
          onChange={(e) => setTrn(e.target.value.replace(/\D/g, "").slice(0, 9))}
          placeholder="9-digit TRN" required />
        <AuthInput label="Date of birth" type="date" value={dob}
          onChange={(e) => setDob(e.target.value)} required />
        <AuthInput label="Licence control number" type="text" value={controlNumber}
          onChange={(e) => setControlNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="10-digit number" required
          right={<span className="text-xs text-gray-400">Back of card</span>} />
        <div className="pt-1">
          <AuthButton loading={loading} loadingText="Verifying…">Verify my licence</AuthButton>
        </div>
      </form>
      <p className="mt-4 text-center text-xs text-gray-400">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold hover:underline" style={{ color: BRAND.primary }}>Sign in</Link>
      </p>
    </div>
  );
}

function Step2({ licenceData, licenceClassLabel, step, onConfirm, onBack }) {
  const isActive = licenceData?.status === "ACTIVE";
  return (
    <div>
      <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Confirm details</p>
      <h2 className="text-2xl font-bold text-gray-900 leading-tight">Is this you?</h2>
      <p className="text-xs text-gray-400 mt-1">Review your licence before continuing.</p>
      <StepIndicator step={step} />
      <div className="rounded-xl p-4 mb-4" style={{ background: "#f0f5ff", border: "1.5px solid #c7d7fd" }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-base font-bold text-gray-900">{licenceData?.firstname} {licenceData?.lastname}</p>
            <p className="text-xs text-gray-400 mt-0.5">TRN: {licenceData?.trn}</p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
            background: isActive ? "#dcfce7" : "#fef2f2",
            color: isActive ? "#166534" : "#dc2626",
          }}>
            {licenceData?.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Licence class", value: licenceClassLabel(licenceData?.licence_class) },
            { label: "Date of birth", value: licenceData?.date_of_birth },
            { label: "Collectorate", value: licenceData?.collectorate },
            { label: "Expiry date", value: licenceData?.expiry_date },
          ].map((item, i) => (
            <div key={i}>
              <p className="text-xs text-gray-400 font-medium mb-0.5">{item.label}</p>
              <p className="text-sm font-semibold text-gray-800">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
      <AuthButton onClick={onConfirm}>Yes, this is me — continue</AuthButton>
      <div className="mt-2">
        <AuthButton variant="secondary" onClick={onBack}>Not me — go back</AuthButton>
      </div>
    </div>
  );
}

function Step3({ licenceData, email, setEmail, phone, setPhone, password, setPassword,
  confirmPassword, setConfirmPassword, error, loading, step, onSubmit }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Almost done</p>
      <h2 className="text-2xl font-bold text-gray-900 leading-tight">
        Welcome, <span style={{ color: BRAND.primary }}>{licenceData?.firstname}.</span>
      </h2>
      <p className="text-xs text-gray-400 mt-1">Set up your login credentials to finish.</p>
      <StepIndicator step={step} />
      <AuthError message={error} />
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <AuthInput label="Email address" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          <AuthInput label="Phone" type="tel" value={phone}
            onChange={(e) => setPhone(e.target.value)} placeholder="(876) 000-0000"
            right={<span className="text-xs text-gray-400">Optional</span>} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AuthInput label="Password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 chars" required />
          <AuthInput label="Confirm password" type="password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" required />
        </div>
        <div className="pt-1">
          <AuthButton loading={loading} loadingText="Creating account…">Create account</AuthButton>
        </div>
      </form>
    </div>
  );
}
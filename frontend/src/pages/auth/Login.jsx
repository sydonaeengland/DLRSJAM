import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { login as loginService } from "../../services/authService";
import coatOfArms from "../../assets/coat-of-arms.png";
import lobbyImg from "../../assets/slides/lobby.webp";
import drivingImg from "../../assets/slides/driving.webp";
import licenceKeysImg from "../../assets/slides/licence-keys.webp";
import { BRAND } from "../../config/theme";
import LeftPanel from "../../components/auth/LeftPanel";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import AuthError from "../../components/auth/AuthError";

const SLIDES = [
  { image: lobbyImg, headline: "Your licence.\nHandled.", subtext: "Skip the queue. Renew online from anywhere in Jamaica." },
  { image: drivingImg, headline: "Stay on\nthe road.", subtext: "Fast, secure driver's licence renewals — no office visit required." },
  { image: licenceKeysImg, headline: "Everything\nin one place.", subtext: "Renewals, replacements, and amendments. All online, all official." },
];

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => { setCurrent((p) => (p + 1) % SLIDES.length); setFading(false); }, 600);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (i) => {
    if (i === current) return;
    setFading(true);
    setTimeout(() => { setCurrent(i); setFading(false); }, 600);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      const data = await loginService(form.email, form.password);
      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.error || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex"
      style={{ height: "100dvh", overflow: "hidden", opacity: visible ? 1 : 0, transition: "opacity 0.5s ease" }}
    >
      <LeftPanel slides={SLIDES} current={current} fading={fading} goToSlide={goToSlide} />

      <div className="flex-1 flex items-center justify-center px-8 bg-white" style={{ overflow: "hidden" }}>
        <div
          className="w-full max-w-[400px]"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
          }}
        >
          {/* Mobile branding */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src={coatOfArms} alt="" className="w-8 h-8 object-contain" />
            <span className="text-sm font-semibold text-gray-700">Tax Administration Jamaica</span>
          </div>

          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Welcome back</p>
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">
            Sign in to <span style={{ color: BRAND.primary }}>DLRSJAM</span>
          </h2>
          <p className="text-sm text-gray-400 mt-1 mb-6">Your driver's licence portal.</p>

          <AuthError message={error} />

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <AuthInput
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
            />
            <AuthInput
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              right={
                <Link to="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: BRAND.primary }}>
                  Forgot password?
                </Link>
              }
            />
            <div className="pt-1">
              <AuthButton loading={loading} loadingText="Signing in…">Sign in</AuthButton>
            </div>
          </form>

          <p className="mt-5 text-center text-sm text-gray-400">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: BRAND.primary }}>Create one</Link>
          </p>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              TAJ staff?{" "}
              <Link to="/staff/login" className="text-gray-500 hover:underline font-medium">Staff login →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
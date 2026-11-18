import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Brand } from "../components/Brand";

const ROLES = [
  { id: "student", label: "Student", icon: "🎓" },
  { id: "teacher", label: "Teacher", icon: "📐" },
  { id: "admin", label: "Admin", icon: "🏛️" },
];

const DEMO_ACCOUNTS = [
  {
    role: "student",
    name: "Aanya Sharma",
    email: "student@demo.com",
    password: "demo1234",
    title: "Class 9 Student",
    icon: "🎓",
  },
  {
    role: "teacher",
    name: "Alex Rivera",
    email: "teacher@demo.com",
    password: "demo1234",
    title: "Class Teacher & Math Faculty",
    icon: "📐",
  },
  {
    role: "admin",
    name: "Jordan Lee",
    email: "admin@demo.com",
    password: "demo1234",
    title: "School Academic Coordinator",
    icon: "🏛️",
  },
];

function destinationFor(role) {
  if (role === "admin") return "/admin/classes";
  if (role === "teacher") return "/teacher";
  return "/dashboard";
}

export default function Login({ initialMode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn, signUp, setSession, error: authError } = useAuth();

  // Mode: 'signin' | 'signup'
  const [mode, setMode] = useState(() => {
    if (initialMode) return initialMode;
    return location.pathname === "/signup" ? "signup" : "signin";
  });

  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gradeOrSubject, setGradeOrSubject] = useState("Class 9");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sync mode with route if navigating between /login and /signup
  useEffect(() => {
    if (location.pathname === "/signup") setMode("signup");
    else if (location.pathname === "/login") setMode("signin");
  }, [location.pathname]);

  function switchMode(newMode) {
    setMode(newMode);
    setLocalError("");
    setInfoMessage("");
    // Update browser URL smoothly without reloading
    window.history.replaceState(null, "", newMode === "signup" ? "/signup" : "/login");
  }

  function handleSelectRole(newRole) {
    setRole(newRole);
    setLocalError("");
    setInfoMessage("");
    if (newRole === "student") setGradeOrSubject("Class 9");
    else if (newRole === "teacher") setGradeOrSubject("Mathematics");
    else setGradeOrSubject("Academic Office");
  }

  // Auto-fill demo account details into inputs
  function fillDemo(account) {
    setRole(account.role);
    setEmail(account.email);
    setPassword(account.password);
    setName(account.name);
    setLocalError("");
    setInfoMessage(`Filled ${account.role} credentials (${account.email}). Click Sign In or Instant Login!`);
  }

  // 1-Click instant sign-in directly into the corresponding live DB account
  async function instantDemoLogin(account) {
    setLocalError("");
    setSubmitting(true);
    try {
      const user = await signIn(account.email, account.password);
      navigate(destinationFor(user.role || account.role), { replace: true });
    } catch (err) {
      setLocalError(err.message || "Demo login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Form Submission (Sign In or Sign Up)
  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");
    setInfoMessage("");
    setSubmitting(true);

    try {
      if (mode === "signin") {
        const user = await signIn(email, password);
        navigate(destinationFor(user.role || role), { replace: true });
      } else {
        if (!name.trim()) throw new Error("Please enter your full name.");
        if (!email.trim()) throw new Error("Please enter your institutional email.");
        if (!password || password.length < 6) {
          throw new Error("Please enter a password with at least 6 characters.");
        }
        if (role === "admin") {
          throw new Error("Administrator accounts must be provisioned by an existing administrator.");
        }

        const user = await signUp({
          name,
          email,
          password,
          role,
          grade: gradeOrSubject,
        });
        navigate(destinationFor(user.role || role), { replace: true });
      }
    } catch (err) {
      setLocalError(err.message || "Authentication failed. Check your details.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafd] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background soft ambient accents matching LearnLoop's brand blue */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-200/35 rounded-full blur-3xl pointer-events-none" />

      {/* Main Dual-Panel Auth Container */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(29,78,216,0.12)] border border-slate-100 overflow-hidden relative z-10">
        <div className={`flex flex-col ${mode === "signin" ? "md:flex-row" : "md:flex-row-reverse"} min-h-[620px] transition-all duration-500`}>
          
          {/* ========================================================
              FORM PANEL (Sign In or Sign Up form)
             ======================================================== */}
          <div className="w-full md:w-7/12 p-8 sm:p-10 lg:p-12 flex flex-col justify-between bg-white">
            <div>
              {/* Header with Brand Logo */}
              <div className="flex items-center justify-between mb-6">
                <Brand size="md" />
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-full">
                  {mode === "signin" ? "Sign In Portal" : "Registration"}
                </span>
              </div>

              {/* Title */}
              <div className="text-center mb-5">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {mode === "signin" ? "Sign in to LearnLoop" : "Create Account"}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {mode === "signin"
                    ? "Welcome back! Enter your institutional credentials."
                    : "Join our explainable closed-loop learning intelligence platform."}
                </p>
              </div>

              {/* Social / Institutional SSO Icons */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <button
                  type="button"
                  title="Sign in with Google Classroom"
                  onClick={() => fillDemo(DEMO_ACCOUNTS[0])}
                  className="w-10 h-10 rounded-full border border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/50 flex items-center justify-center text-slate-600 transition-all hover:scale-105 shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-1.9.4-2.8L1.9 6.3C.7 8.7 0 11.3 0 14s.7 5.3 1.9 7.7l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  title="Sign in with Microsoft Education"
                  onClick={() => fillDemo(DEMO_ACCOUNTS[1])}
                  className="w-10 h-10 rounded-full border border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/50 flex items-center justify-center text-slate-600 transition-all hover:scale-105 shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#F25022" d="M1 1h10v10H1z" />
                    <path fill="#00A4EF" d="M1 13h10v10H1z" />
                    <path fill="#7FBA00" d="M13 1h10v10H13z" />
                    <path fill="#FFB900" d="M13 13h10v10H13z" />
                  </svg>
                </button>

                <button
                  type="button"
                  title="Sign in with School ID / Clever"
                  onClick={() => fillDemo(DEMO_ACCOUNTS[2])}
                  className="w-10 h-10 rounded-full border border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/50 flex items-center justify-center text-slate-600 transition-all hover:scale-105 shadow-sm"
                >
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </button>
              </div>

              {/* Divider Text */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  {mode === "signin" ? "or use your email account" : "or use your email for registration"}
                </span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              {/* Role Selector Tabs */}
              <div className="mb-4 bg-slate-100/90 p-1 rounded-xl flex items-center border border-slate-200/70">
                {ROLES.filter((r) => mode === "signin" || r.id !== "admin").map((r) => {
                  const active = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectRole(r.id)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        active
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-bold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      }`}
                    >
                      <span>{r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Form Inputs */}
              <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                {/* Name Input (Sign Up Only) */}
                {mode === "signup" && (
                  <div>
                    <div className="relative flex items-center bg-slate-50/90 rounded-xl border border-slate-200 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                      <span className="pl-3.5 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}

                {/* Email Input */}
                <div>
                  <div className="relative flex items-center bg-slate-50/90 rounded-xl border border-slate-200 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <span className="pl-3.5 text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={role === "student" ? "student@demo.com" : `${role}@demo.com`}
                      className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Role Specific Grade / Subject (Sign Up Only) */}
                {mode === "signup" && (
                  <div>
                    <div className="relative flex items-center bg-slate-50/90 rounded-xl border border-slate-200 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                      <span className="pl-3.5 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        value={gradeOrSubject}
                        onChange={(e) => setGradeOrSubject(e.target.value)}
                        placeholder={role === "student" ? "Grade / Class (e.g. Class 9)" : "Subject / Department"}
                        className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}

                {/* Password Input */}
                <div>
                  <div className="relative flex items-center bg-slate-50/90 rounded-xl border border-slate-200 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <span className="pl-3.5 text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Forgot Password link (Sign In only) */}
                {mode === "signin" && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setInfoMessage("For pilot evaluation, use the 1-click demo logins below. For school accounts, contact your LearnLoop coordinator.")}
                      className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}

                {/* Error / Feedback alerts */}
                {(localError || authError) && (
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200/80 rounded-xl p-2.5 text-center font-medium">
                    {localError || authError}
                  </p>
                )}
                {infoMessage && (
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200/80 rounded-xl p-2 text-center font-medium">
                    {infoMessage}
                  </p>
                )}

                {/* Primary Pill Button in LearnLoop Blue */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto mx-auto block px-12 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md shadow-blue-500/25 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70"
                  >
                    {submitting
                      ? mode === "signin" ? "Signing In…" : "Creating Account…"
                      : mode === "signin" ? "SIGN IN" : "SIGN UP"}
                  </button>
                </div>
              </form>
            </div>

            {/* Mobile Mode Switcher Link */}
            <div className="mt-4 pt-4 border-t border-slate-100 text-center md:hidden">
              <span className="text-xs text-slate-500">
                {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
              </span>{" "}
              <button
                type="button"
                onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                {mode === "signin" ? "Sign Up" : "Sign In"}
              </button>
            </div>

            {/* ========================================================
                DEVELOPMENT / DEMO 1-CLICK ACCESS BAR
               ======================================================== */}
            <div className="mt-5 pt-3.5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  ⚡ Quick Demo Login (1-Click Fill & Enter)
                </span>
                <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Development Mode</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isCurrent = role === acc.role;
                  return (
                    <div
                      key={acc.role}
                      className={`p-2 rounded-xl border transition-all text-left flex flex-col justify-between ${
                        isCurrent
                          ? "bg-blue-50/80 border-blue-300 ring-1 ring-blue-200"
                          : "bg-slate-50/80 border-slate-200/90 hover:bg-white hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 capitalize flex items-center gap-1">
                            <span>{acc.icon}</span> {acc.role}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {acc.password}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5" title={acc.email}>
                          {acc.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => fillDemo(acc)}
                          className="flex-1 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-700 transition-colors"
                        >
                          Fill Details
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => instantDemoLogin(acc)}
                          className="flex-1 py-1 rounded bg-blue-600 hover:bg-blue-700 text-[10px] font-bold text-white transition-colors flex items-center justify-center gap-0.5 shadow-sm shadow-blue-500/20"
                        >
                          <span>Enter</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================
              HERO / WELCOME BANNER PANEL (LearnLoop Blue Gradient + Geometric Shapes)
             ======================================================== */}
          <div className="hidden md:flex w-full md:w-5/12 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white p-8 sm:p-10 lg:p-12 flex-col justify-between relative overflow-hidden select-none">
            
            {/* Geometric Polygon Elements (Matching reference images with crisp blue tones) */}
            <div className="absolute top-8 right-8 w-44 h-44 bg-white/10 rounded-3xl transform rotate-45 pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute top-1/3 left-6 w-16 h-16 bg-white/5 rounded-xl transform -rotate-12 pointer-events-none" />
            <div className="absolute bottom-20 right-10 w-24 h-24 bg-white/10 rounded-2xl transform rotate-12 pointer-events-none" />
            
            {/* Top Logo / Brand in light mode */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/20 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
                <span className="text-xs font-semibold tracking-wide text-white">LearnLoop Platform</span>
              </div>
              <span className="text-xs font-medium text-blue-100">v2.0</span>
            </div>

            {/* Center Dynamic Greeting Content */}
            <AnimatePresence mode="wait">
              {mode === "signin" ? (
                <motion.div
                  key="signin-banner"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10 text-center my-auto py-12"
                >
                  <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
                    Hello, Friend!
                  </h2>
                  <p className="text-sm text-blue-50/90 leading-relaxed max-w-xs mx-auto mb-8 font-normal">
                    Enter your personal details and start your explainable closed-loop learning journey with us.
                  </p>
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="inline-block px-10 py-3 rounded-full border-2 border-white text-white text-xs sm:text-sm font-bold uppercase tracking-wider hover:bg-white hover:text-blue-600 transition-all active:scale-95 shadow-lg shadow-blue-900/25"
                  >
                    SIGN UP
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="signup-banner"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10 text-center my-auto py-12"
                >
                  <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
                    Welcome Back!
                  </h2>
                  <p className="text-sm text-blue-50/90 leading-relaxed max-w-xs mx-auto mb-8 font-normal">
                    To keep connected with your classrooms, diagnostic assessments, and progress, please sign in with your credentials.
                  </p>
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="inline-block px-10 py-3 rounded-full border-2 border-white text-white text-xs sm:text-sm font-bold uppercase tracking-wider hover:bg-white hover:text-blue-600 transition-all active:scale-95 shadow-lg shadow-blue-900/25"
                  >
                    SIGN IN
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Footer Note */}
            <div className="relative z-10 text-center">
              <p className="text-[11px] text-blue-100/90 font-medium">
                Assess → Diagnose → Recommend → Measure Gain
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Page-level bottom copyright and privacy notice */}
      <p className="mt-6 text-xs text-slate-400 text-center relative z-10">
        © 2026 LearnLoop Intelligence · Class 9 Pilot Architecture · Protected by institutional RBAC
      </p>
    </div>
  );
}

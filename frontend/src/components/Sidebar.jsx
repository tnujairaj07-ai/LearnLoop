import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AccessibilityToggle from "./AccessibilityToggle";
import { Brand } from "./Brand";

const navItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: "/roadmap",
    label: "My courses",
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    to: "/practice",
    label: "Practice & Quizzes",
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: "/analysis",
    label: "Progress Analysis",
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: "/report-card",
    label: "Report Card",
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <aside className="w-full shrink-0 border-b border-slate-100 bg-white px-5 py-5 md:h-screen md:w-64 md:border-b-0 md:border-r md:px-6 md:py-6 flex flex-col justify-between">
      <div>
        {/* Logo and Brand */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          <div>
            <Brand size="lg" />
            {user && (
              <p className="mt-1 text-xs font-medium text-slate-400">
                {user.name} · {user.class_name || user.grade || "Class 9"}
              </p>
            )}
          </div>
          <div className="md:hidden">
            <AccessibilityToggle compact />
          </div>
        </div>

        {/* Navigation links */}
        <nav className="mt-6 flex gap-1.5 overflow-x-auto md:flex-col md:gap-2 md:overflow-visible">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`
              }
            >
              {item.icon}
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div>
        {/* Targeted Practice Banner - matches the reference image's card */}
        <div className="hidden md:block my-4 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-4 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white backdrop-blur-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
              Adaptive
            </span>
          </div>
          <h4 className="font-display font-semibold text-sm">Targeted Practice</h4>
          <p className="mt-1 text-xs text-blue-100 leading-relaxed">
            Practice questions tailored to your diagnostic error patterns.
          </p>
          <button
            onClick={() => navigate("/practice")}
            className="mt-3 w-full py-2 px-3 text-xs font-semibold rounded-xl bg-white text-blue-700 hover:bg-blue-50 transition-colors shadow-sm text-center"
          >
            Explore Practice Hub
          </button>
        </div>

        {/* Accessibility & Utilities */}
        <div className="hidden md:block pt-3 border-t border-slate-100 space-y-1">
          <div className="px-2 py-1">
            <AccessibilityToggle />
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

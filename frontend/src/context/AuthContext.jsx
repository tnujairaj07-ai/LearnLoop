import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

const USER_KEY = "learnloop_user";
const TOKEN_KEY = "authToken";

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const persist = useCallback((nextUser, token) => {
    if (nextUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      if (token) localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  // Re-sync authenticated user profile from /api/auth/me on initial load if a JWT exists
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    let active = true;
    authService
      .currentUser()
      .then((profile) => {
        if (!active || !profile) return;
        const classInfo = profile.enrolled_classes?.[0];
        const hydrated = {
          ...profile,
          class_name: profile.class_name || classInfo?.class_name || null,
          grade: profile.grade || classInfo?.grade || "Class 9",
        };
        persist(hydrated, token);
        setUser(hydrated);
      })
      .catch((err) => {
        if (active && err?.status === 401) {
          persist(null);
          setUser(null);
        }
      });

    return () => {
      active = false;
    };
  }, [persist]);

  const signIn = useCallback(
    async (email, password) => {
      setLoading(true);
      setError("");
      try {
        const session = await authService.login({ email, password });
        const nextUser = {
          ...session.user,
          role: session.role || session.user?.role || "student",
        };
        persist(nextUser, session.token);
        setUser(nextUser);
        return nextUser;
      } catch (err) {
        setError(err.message || "Could not sign in. Check your credentials and try again.");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [persist]
  );

  const signUp = useCallback(
    async ({ name, email, password, role = "student", grade = "Class 9", class_id = null }) => {
      setLoading(true);
      setError("");
      try {
        const session = await authService.register({ name, email, password, role, grade, class_id });
        const nextUser = {
          ...session.user,
          role: session.role || session.user?.role || role,
        };
        persist(nextUser, session.token);
        setUser(nextUser);
        return nextUser;
      } catch (err) {
        setError(err.message || "Could not create account. Please check your details.");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [persist]
  );

  const setSession = useCallback(
    (session) => {
      if (!session) return;
      const nextUser = {
        ...session.user,
        role: session.role || session.user?.role,
      };
      persist(nextUser, session.token || session.access_token);
      setUser(nextUser);
    },
    [persist]
  );

  const signOut = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      authService.logout().catch(() => {});
    }
    persist(null);
    setUser(null);
  }, [persist]);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user && localStorage.getItem(TOKEN_KEY)),
      error,
      loading,
      signIn,
      signUp,
      signOut,
      setSession,
      clearSession: signOut,
    }),
    [user, error, loading, signIn, signUp, signOut, setSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

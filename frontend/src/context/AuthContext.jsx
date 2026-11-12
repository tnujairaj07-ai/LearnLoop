import { createContext, useContext, useState, useCallback, useMemo } from "react";
import * as studentApi from "../api/client";
import { authService } from "../services/authService";

/**
 * Single auth context for the whole LearnLoop app (student + teacher/admin).
 *
 * Two login flows feed into the same `user` state:
 *  - Student: `signIn(email, password)` — talks to the student mock/API in
 *    api/client.js and always resolves to a "student" role.
 *  - Teacher/Admin: pages call `authService.login({ email, password, role })`
 *    themselves (see services/authService.js), then hand the resolved
 *    `{ role, user, token }` session to `setSession()`.
 *
 * Real auth/session logic still belongs to the backend — this context only
 * tracks whichever session was handed to it and persists it so a refresh
 * doesn't sign the user out.
 */
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

  // Student-style sign-in: email + password, always a student session.
  const signIn = useCallback(
    async (email, password) => {
      setLoading(true);
      setError("");
      try {
        const { token, user: studentUser } = await studentApi.login(email, password);
        const nextUser = { ...studentUser, role: studentUser.role || "student" };
        persist(nextUser, token);
        setUser(nextUser);
        return nextUser;
      } catch (err) {
        setError(err.message || "Could not sign in. Check your details and try again.");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [persist]
  );

  const signUp = useCallback(
    async ({ name, email, password, role = "student", grade = "Grade 9" }) => {
      setLoading(true);
      setError("");
      try {
        if (role === "student") {
          const { token, user: studentUser } = await studentApi.register({ name, email, password, role, grade });
          const nextUser = { ...studentUser, role: "student" };
          persist(nextUser, token);
          setUser(nextUser);
          return nextUser;
        } else {
          const result = await authService.register({ name, email, password, role });
          const nextUser = { ...result.user, role: result.role };
          persist(nextUser, result.token);
          setUser(nextUser);
          return nextUser;
        }
      } catch (err) {
        setError(err.message || "Could not create account. Please check your details.");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [persist]
  );

  // Teacher/admin-style: a session object already resolved by authService.login().
  const setSession = useCallback(
    (session) => {
      if (!session) return;
      const nextUser = { ...session.user, role: session.role };
      persist(nextUser, session.token);
      setUser(nextUser);
    },
    [persist]
  );

  const signOut = useCallback(() => {
    persist(null);
    setUser(null);
  }, [persist]);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user),
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

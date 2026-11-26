import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, TOKEN_KEY } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ role: null, account: null });
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY));
  // auth dialog: { mode: "login" | "register", role: "user" | "mechanic" } or null
  const [dialog, setDialog] = useState(null);

  const applySession = useCallback(({ token, role, account }) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    setSession({ role, account });
  }, []);

  const logout = useCallback((message) => {
    localStorage.removeItem(TOKEN_KEY);
    setSession({ role: null, account: null });
    if (message) toast(message);
  }, []);

  // restore session on page load
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api
      .get("/auth/me")
      .then(({ data }) => setSession(data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onExpired = () => logout("Your session expired – please log in again.");
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, [logout]);

  const login = useCallback(
    async (role, credentials) => {
      const { data } = await api.post(`/auth/${role}/login`, credentials);
      applySession(data);
      return data;
    },
    [applySession]
  );

  const register = useCallback(
    async (role, body) => {
      const { data } = await api.post(`/auth/${role}/register`, body);
      applySession(data);
      return data;
    },
    [applySession]
  );

  const updateProfile = useCallback(async (body) => {
    const { data } = await api.put("/auth/me", body);
    // a password change revokes old sessions – the server returns a fresh token for this device
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
    setSession({ role: data.role, account: data.account });
    return data;
  }, []);

  const refreshMe = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    setSession(data);
    return data;
  }, []);

  const value = useMemo(
    () => ({
      ...session,
      loading,
      refreshMe,
      isUser: session.role === "user",
      isMechanic: session.role === "mechanic",
      login,
      register,
      logout,
      updateProfile,
      dialog,
      openAuth: (mode = "login", role = "user") => setDialog({ mode, role }),
      closeAuth: () => setDialog(null),
    }),
    [session, loading, refreshMe, login, register, logout, updateProfile, dialog]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

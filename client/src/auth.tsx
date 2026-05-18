import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";

export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on first load — the auth cookie is sent automatically.
  useEffect(() => {
    api<{ user: User }>("/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => {
        // Not signed in — that's fine.
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(login: string, password: string) {
    const res = await api<{ user: User }>("/auth/login", {
      method: "POST",
      body: { login, password },
    });
    setUser(res.user);
  }

  async function register(data: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  }) {
    const res = await api<{ user: User }>("/auth/register", {
      method: "POST",
      body: data,
    });
    setUser(res.user);
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

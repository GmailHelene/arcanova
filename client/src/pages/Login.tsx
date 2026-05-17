import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    login: "",
    username: "",
    email: "",
    password: "",
    displayName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.login, form.password);
      } else {
        await register({
          username: form.username,
          email: form.email,
          password: form.password,
          displayName: form.displayName || form.username,
        });
      }
      navigate("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel auth-panel">
      <h1>{mode === "login" ? "Welcome back" : "Join Arcanova"}</h1>

      <form onSubmit={submit} className="auth-form">
        {mode === "login" ? (
          <input
            placeholder="Username or email"
            value={form.login}
            onChange={(e) => set("login", e.target.value)}
          />
        ) : (
          <>
            <input
              placeholder="Username"
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
            />
            <input
              placeholder="Display name"
              value={form.displayName}
              onChange={(e) => set("displayName", e.target.value)}
            />
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </>
        )}
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <button className="btn btn-lg" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        className="btn-ghost"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
        }}
      >
        {mode === "login"
          ? "New here? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}

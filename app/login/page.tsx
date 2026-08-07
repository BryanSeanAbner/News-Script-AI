"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "localhost" ? "" : "http://localhost:8000");

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", username);
      form.append("password", password);

      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Login gagal");
      }

      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "var(--color-canvas-subtle)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "var(--space-4)",
    }}>
      {/* GitHub-style logo */}
      <div style={{ marginBottom: "var(--space-6)", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
          <svg height="32" viewBox="0 0 16 16" fill="currentColor" style={{ color: "var(--color-fg-default)" }}>
            <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
          </svg>
          <span style={{ fontSize: "var(--font-size-h4)", fontWeight: 700, color: "var(--color-fg-default)" }}>
            NewsScript AI
          </span>
        </div>
        <p style={{ fontSize: "var(--font-size-body)", color: "var(--color-fg-muted)" }}>
          Masuk ke akun Anda
        </p>
      </div>

      {/* Login Box */}
      <div className="gh-box" style={{ width: "100%", maxWidth: "340px" }}>
        <div className="gh-box-body">
          <form onSubmit={handleLogin}>
            {error && (
              <div className="gh-flash gh-flash-danger" style={{ marginBottom: "var(--space-4)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, marginTop: "2px" }}>
                  <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm-.857-5.857a.857.857 0 1 0 1.714 0 .857.857 0 0 0-1.714 0zM7.25 7.25v-3.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="gh-form-group">
              <label className="gh-label-text" htmlFor="username">Username</label>
              <input
                id="username"
                className="gh-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                placeholder="masukkan username"
              />
            </div>

            <div className="gh-form-group">
              <label className="gh-label-text" htmlFor="password">Password</label>
              <input
                id="password"
                className="gh-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="masukkan password"
              />
            </div>

            <button
              id="btn-login"
              type="submit"
              className="gh-btn gh-btn-primary w-full gh-btn-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="gh-spinner" />
                  Masuk...
                </>
              ) : "Masuk"}
            </button>
          </form>
        </div>
      </div>

      {/* Setup hint */}
      <div className="gh-box" style={{ width: "100%", maxWidth: "340px", marginTop: "var(--space-3)", padding: "var(--space-3)", textAlign: "center" }}>
        <p style={{ fontSize: "var(--font-size-small)", color: "var(--color-fg-muted)" }}>
          Belum ada akun?{" "}
          <a
            href="/setup"
            style={{ color: "var(--color-accent-fg)", textDecoration: "none" }}
          >
            Setup admin pertama
          </a>
        </p>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", full_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/register-first-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Gagal membuat admin");
      }
      router.replace("/login");
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
      <div style={{ marginBottom: "var(--space-6)", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
          <svg height="32" viewBox="0 0 16 16" fill="currentColor" style={{ color: "var(--color-fg-default)" }}>
            <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
          </svg>
          <span style={{ fontSize: "var(--font-size-h4)", fontWeight: 700, color: "var(--color-fg-default)" }}>NewsScript AI</span>
        </div>
        <p style={{ color: "var(--color-fg-muted)" }}>Setup akun admin pertama</p>
      </div>

      <div className="gh-box" style={{ width: "100%", maxWidth: "380px" }}>
        <div className="gh-box-header">
          <span className="gh-box-title">Buat Admin Pertama</span>
          <span className="gh-label gh-label-attention">Hanya sekali</span>
        </div>
        <div className="gh-box-body">
          {error && (
            <div className="gh-flash gh-flash-danger mb-4">{error}</div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="gh-form-group">
              <label className="gh-label-text">Nama Lengkap</label>
              <input className="gh-input" type="text" value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Nama Anda" />
            </div>
            <div className="gh-form-group">
              <label className="gh-label-text">Username <span style={{ color: "var(--color-danger-fg)" }}>*</span></label>
              <input className="gh-input" type="text" value={form.username} required
                onChange={e => setForm({ ...form, username: e.target.value })} placeholder="username" />
            </div>
            <div className="gh-form-group">
              <label className="gh-label-text">Email <span style={{ color: "var(--color-danger-fg)" }}>*</span></label>
              <input className="gh-input" type="email" value={form.email} required
                onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@redaksi.com" />
            </div>
            <div className="gh-form-group">
              <label className="gh-label-text">Password <span style={{ color: "var(--color-danger-fg)" }}>*</span></label>
              <input className="gh-input" type="password" value={form.password} required
                onChange={e => setForm({ ...form, password: e.target.value })} placeholder="min. 8 karakter" minLength={8} />
            </div>
            <button type="submit" className="gh-btn gh-btn-primary w-full" disabled={loading}>
              {loading ? <><span className="gh-spinner" /> Membuat...</> : "Buat Akun Admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "localhost" ? "" : "http://localhost:8000");

interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface NewUserForm {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: string;
}

const roleColors: Record<string, string> = {
  admin: "gh-label-danger",
  editor: "gh-label-accent",
  reporter: "gh-label-neutral",
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewUserForm>({ username: "", email: "", password: "", full_name: "", role: "reporter" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/auth/users`, { headers: getAuthHeader() });
      if (res.status === 401) { router.replace("/login"); return; }
      if (res.status === 403) { router.replace("/dashboard"); return; }
      if (res.ok) setUsers(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [getAuthHeader, router]);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try { setCurrentUser(JSON.parse(userData)); } catch { /* ignore */ }
    }
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Gagal membuat user");
      }
      setSuccess("User berhasil dibuat!");
      setShowForm(false);
      setForm({ username: "", email: "", password: "", full_name: "", role: "reporter" });
      fetchUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const res = await fetch(`${API}/api/auth/users/${user.id}`, {
        method: "PUT",
        headers: getAuthHeader(),
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (res.ok) fetchUsers();
    } catch { /* ignore */ }
  };

  const handleChangeRole = async (user: User, newRole: string) => {
    try {
      const res = await fetch(`${API}/api/auth/users/${user.id}`, {
        method: "PUT",
        headers: getAuthHeader(),
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) fetchUsers();
    } catch { /* ignore */ }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Hapus user ${user.username}?`)) return;
    try {
      const res = await fetch(`${API}/api/auth/users/${user.id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      if (res.ok) setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch { /* ignore */ }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  return (
    <AppLayout>
      <div className="gh-page-header">
        <h1 className="gh-page-title">Anggota Tim</h1>
        <p className="gh-page-subtitle">Kelola akun anggota tim redaksi</p>
      </div>

      {success && <div className="gh-flash gh-flash-success mb-4 animate-fade-in">{success}</div>}
      {error && <div className="gh-flash gh-flash-danger mb-4 animate-fade-in">{error}</div>}

      <div className="gh-box">
        <div className="gh-box-header">
          <span className="gh-box-title">Daftar Anggota</span>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span className="gh-counter">{users.length}</span>
            <button
              id="btn-tambah-anggota"
              onClick={() => setShowForm(!showForm)}
              className="gh-btn gh-btn-primary gh-btn-sm"
            >
              {showForm ? "Batal" : (
                <>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z"/>
                  </svg>
                  Tambah Anggota
                </>
              )}
            </button>
          </div>
        </div>

        {/* Create User Form */}
        {showForm && (
          <div className="gh-box-body animate-fade-in" style={{ borderBottom: "1px solid var(--color-border-default)", backgroundColor: "var(--color-canvas-subtle)" }}>
            <h3 style={{ fontWeight: 600, marginBottom: "var(--space-4)", fontSize: "var(--font-size-body)" }}>Tambah Anggota Baru</h3>
            <form onSubmit={handleCreate}>
              <div className="gh-users-form-grid">
                <div className="gh-form-group">
                  <label className="gh-label-text">Nama Lengkap</label>
                  <input className="gh-input" type="text" value={form.full_name}
                    onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Nama lengkap" />
                </div>
                <div className="gh-form-group">
                  <label className="gh-label-text">Username *</label>
                  <input className="gh-input" type="text" value={form.username} required
                    onChange={e => setForm({ ...form, username: e.target.value })} placeholder="username" />
                </div>
                <div className="gh-form-group">
                  <label className="gh-label-text">Email *</label>
                  <input className="gh-input" type="email" value={form.email} required
                    onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@redaksi.com" />
                </div>
                <div className="gh-form-group">
                  <label className="gh-label-text">Password *</label>
                  <input className="gh-input" type="password" value={form.password} required
                    onChange={e => setForm({ ...form, password: e.target.value })} placeholder="min. 8 karakter" minLength={8} />
                </div>
                <div className="gh-form-group">
                  <label className="gh-label-text">Role</label>
                  <select className="gh-select" value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="reporter">Reporter</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button type="submit" className="gh-btn gh-btn-primary" disabled={saving}>
                  {saving ? <><span className="gh-spinner" />Menyimpan...</> : "Buat Akun"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="gh-btn gh-btn-default">Batal</button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        {loading ? (
          <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
            <div className="gh-spinner gh-spinner-lg" style={{ margin: "0 auto" }} />
          </div>
        ) : (
          <div className="gh-table-responsive">
          <table className="gh-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Bergabung</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 500 }}>{user.full_name || "â€”"}</td>
                  <td style={{ fontFamily: "var(--font-family-mono)", fontSize: "var(--font-size-small)" }}>@{user.username}</td>
                  <td style={{ color: "var(--color-fg-muted)", fontSize: "var(--font-size-small)" }}>{user.email}</td>
                  <td>
                    {currentUser?.id === user.id ? (
                      <span className={`gh-label ${roleColors[user.role] || "gh-label-neutral"}`}>{user.role}</span>
                    ) : (
                      <select
                        className="gh-select"
                        value={user.role}
                        onChange={e => handleChangeRole(user, e.target.value)}
                        style={{ width: "auto", fontSize: "var(--font-size-small)" }}
                      >
                        <option value="reporter">Reporter</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </td>
                  <td>
                    <span className={`gh-label ${user.is_active ? "gh-label-success" : "gh-label-neutral"}`}>
                      {user.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td style={{ color: "var(--color-fg-muted)", fontSize: "var(--font-size-small)" }}>
                    {formatDate(user.created_at)}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "var(--space-1)" }}>
                      {currentUser?.id !== user.id && (
                        <>
                          <button
                            onClick={() => handleToggleActive(user)}
                            className="gh-btn gh-btn-sm gh-btn-default"
                            title={user.is_active ? "Nonaktifkan" : "Aktifkan"}
                          >
                            {user.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="gh-btn gh-btn-sm gh-btn-danger"
                            title="Hapus user"
                          >
                            Hapus
                          </button>
                        </>
                      )}
                      {currentUser?.id === user.id && (
                        <span style={{ fontSize: "var(--font-size-small)", color: "var(--color-fg-muted)" }}>Anda</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}


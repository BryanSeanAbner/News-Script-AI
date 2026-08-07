"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "localhost" ? "" : "http://localhost:8000");

interface Stats {
  total_scripts: number;
  today_scripts: number;
  total_news: number;
}

interface RecentScript {
  id: number;
  headline?: string;
  platform: string;
  updated_at: string;
  word_count?: number;
}

const platformNames: Record<string, string> = {
  tv_radio: "TV / Radio",
  article: "Artikel Online",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube Shorts",
};

const platformColors: Record<string, string> = {
  tv_radio: "gh-label-accent",
  article: "gh-label-success",
  instagram: "gh-label-done",
  tiktok: "gh-label-danger",
  youtube: "gh-label-attention",
};

function StatCard({ value, label, icon, color }: { value: number; label: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="gh-box" style={{ padding: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <span style={{ fontSize: "var(--font-size-small)", color: "var(--color-fg-muted)", fontWeight: 600 }}>{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div style={{ fontSize: "var(--font-size-h1)", fontWeight: 700, color: "var(--color-fg-default)", lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [scripts, setScripts] = useState<RecentScript[]>([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/scripts/?limit=10`, { headers: getAuthHeader() });
      if (res.status === 401) { router.replace("/login"); return; }
      if (res.ok) {
        const data = await res.json();
        setScripts(data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [getAuthHeader, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = new Date().toDateString();
  const todayCount = scripts.filter(s => new Date(s.updated_at).toDateString() === today).length;

  const stats: Stats = {
    total_scripts: scripts.length,
    today_scripts: todayCount,
    total_news: scripts.length,
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000 / 60);
    if (diff < 1) return "baru saja";
    if (diff < 60) return `${diff} menit lalu`;
    if (diff < 1440) return `${Math.floor(diff / 60)} jam lalu`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="gh-page-header">
        <h1 className="gh-page-title">Dashboard</h1>
        <p className="gh-page-subtitle">Selamat datang di NewsScript AI — platform pembuatan naskah berita Anda</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          value={stats.total_scripts}
          label="Total Naskah"
          color="var(--color-accent-fg)"
          icon={<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z"/></svg>}
        />
        <StatCard
          value={stats.today_scripts}
          label="Dibuat Hari Ini"
          color="var(--color-success-fg)"
          icon={<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61z"/></svg>}
        />
        <StatCard
          value={scripts.filter(s => s.platform === "tv_radio").length}
          label="Naskah TV/Radio"
          color="var(--color-done-fg)"
          icon={<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm-.75 4.5v3.25l2.5 1.5a.75.75 0 01-.75 1.3l-3-1.8a.75.75 0 01-.25-.55V4.5a.75.75 0 011.5 0z"/></svg>}
        />
      </div>

      {/* Quick Action */}
      <div className="gh-box mb-6">
        <div className="gh-box-header">
          <span className="gh-box-title">Mulai Buat Naskah Baru</span>
        </div>
        <div className="gh-box-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ color: "var(--color-fg-muted)", fontSize: "var(--font-size-body)" }}>
            Paste teks berita dari media online, lalu biarkan AI menganalisis dan membuat naskah untuk semua platform.
          </p>
          <button
            id="btn-new-script"
            onClick={() => router.push("/editor")}
            className="gh-btn gh-btn-primary"
            style={{ marginLeft: "var(--space-4)", whiteSpace: "nowrap" }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z" />
            </svg>
            Buat Naskah Baru
          </button>
        </div>
      </div>

      {/* Recent Scripts */}
      <div className="gh-box">
        <div className="gh-box-header">
          <span className="gh-box-title">Naskah Terbaru</span>
          <span className="gh-counter">{scripts.length}</span>
        </div>

        {loading ? (
          <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
            <div className="gh-spinner gh-spinner-lg" style={{ margin: "0 auto" }} />
            <p style={{ marginTop: "var(--space-3)", color: "var(--color-fg-muted)" }}>Memuat...</p>
          </div>
        ) : scripts.length === 0 ? (
          <div className="gh-empty-state">
            <svg className="gh-empty-state-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z" />
            </svg>
            <h2 className="gh-empty-state-title">Belum ada naskah</h2>
            <p className="gh-empty-state-desc">Mulai dengan membuat naskah pertama Anda dari teks berita.</p>
            <button onClick={() => router.push("/editor")} className="gh-btn gh-btn-primary">
              Buat Naskah Pertama
            </button>
          </div>
        ) : (
          <table className="gh-table">
            <thead>
              <tr>
                <th>Headline</th>
                <th>Platform</th>
                <th>Kata</th>
                <th>Diperbarui</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scripts.map(script => (
                <tr key={script.id}>
                  <td>
                    <span style={{ fontWeight: 500 }}>{script.headline || "(Tanpa judul)"}</span>
                  </td>
                  <td>
                    <span className={`gh-label ${platformColors[script.platform] || "gh-label-neutral"}`}>
                      {platformNames[script.platform] || script.platform}
                    </span>
                  </td>
                  <td style={{ color: "var(--color-fg-muted)" }}>{script.word_count || "—"}</td>
                  <td style={{ color: "var(--color-fg-muted)", fontSize: "var(--font-size-small)" }}>
                    {formatDate(script.updated_at)}
                  </td>
                  <td>
                    <button
                      onClick={() => router.push(`/history`)}
                      className="gh-btn gh-btn-sm gh-btn-default"
                    >
                      Buka
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "localhost" ? "" : "http://localhost:8000");

interface Script {
  id: number;
  headline?: string;
  platform: string;
  angle?: string;
  content: string;
  tone?: string;
  word_count?: number;
  version: number;
  created_at: string;
  updated_at: string;
  news_source_id: number;
  user_id: number;
}

const platformNames: Record<string, string> = {
  tv_radio: "TV / Radio", article: "Artikel Online",
  instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube Shorts",
};
const platformIcons: Record<string, string> = {
  tv_radio: "ðŸ“º", article: "ðŸ“°", instagram: "ðŸ“·", tiktok: "ðŸŽµ", youtube: "â–¶ï¸",
};
const platformColors: Record<string, string> = {
  tv_radio: "gh-label-accent", article: "gh-label-success",
  instagram: "gh-label-done", tiktok: "gh-label-danger", youtube: "gh-label-attention",
};
const toneColors: Record<string, string> = {
  positive: "gh-label-success", negative: "gh-label-danger", neutral: "gh-label-neutral",
};

export default function HistoryPage() {
  const router = useRouter();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Script | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  }, []);

  const fetchScripts = useCallback(async () => {
    try {
      const url = filter === "all" ? `${API}/api/scripts/` : `${API}/api/scripts/?platform=${filter}`;
      const res = await fetch(url, { headers: getAuthHeader() });
      if (res.status === 401) { router.replace("/login"); return; }
      if (res.ok) setScripts(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filter, getAuthHeader, router]);

  useEffect(() => { fetchScripts(); }, [fetchScripts]);

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus naskah ini?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`${API}/api/scripts/${id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      if (res.ok) setScripts(prev => prev.filter(s => s.id !== id));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const platforms = ["all", "tv_radio", "article", "instagram", "tiktok", "youtube"];

  return (
    <AppLayout>
      <div className="gh-page-header">
        <h1 className="gh-page-title">Riwayat Naskah</h1>
        <p className="gh-page-subtitle">Semua naskah yang telah dibuat oleh tim redaksi</p>
      </div>

      <div className={`gh-history-grid ${selected ? "gh-history-grid--split" : ""}`} style={{ display: "grid", gap: "var(--space-6)" }}>

        {/* Left â€” Script List */}
        <div>
          {/* Filter Tabs */}
          <div className="gh-box mb-4">
            <div className="gh-tabs" style={{ paddingLeft: "var(--space-2)" }}>
              {platforms.map(p => (
                <button
                  key={p}
                  onClick={() => { setFilter(p); setSelected(null); }}
                  className={`gh-tab ${filter === p ? "active" : ""}`}
                >
                  {p === "all" ? "Semua" : `${platformIcons[p]} ${platformNames[p]}`}
                  {p === "all" && <span className="gh-tab-count">{scripts.length}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Scripts List */}
          <div className="gh-box">
            {loading ? (
              <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
                <div className="gh-spinner gh-spinner-lg" style={{ margin: "0 auto" }} />
              </div>
            ) : scripts.length === 0 ? (
              <div className="gh-empty-state">
                <svg className="gh-empty-state-icon" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1.643 3.143L.427 1.927A.25.25 0 000 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 00.177-.427L2.715 4.215a6.5 6.5 0 11-1.18 4.458.75.75 0 10-1.493.154 8.001 8.001 0 101.6-5.684z"/>
                </svg>
                <h2 className="gh-empty-state-title">Belum ada naskah</h2>
                <p className="gh-empty-state-desc">Buat naskah pertama Anda di halaman Editor.</p>
                <button onClick={() => router.push("/editor")} className="gh-btn gh-btn-primary">
                  Buat Naskah Baru
                </button>
              </div>
            ) : (
              <div className="gh-table-responsive">
                <table className="gh-table">
                  <thead>
                  <tr>
                    <th>Headline</th>
                    <th>Platform</th>
                    <th>Tone</th>
                    <th>Kata</th>
                    <th>Ver.</th>
                    <th>Diperbarui</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {scripts.map(script => (
                    <tr
                      key={script.id}
                      style={{ cursor: "pointer", backgroundColor: selected?.id === script.id ? "var(--color-accent-subtle)" : undefined }}
                      onClick={() => setSelected(script)}
                    >
                      <td style={{ maxWidth: "220px" }}>
                        <span className="truncate" style={{ display: "block", fontWeight: 500 }}>
                          {script.headline || "(Tanpa judul)"}
                        </span>
                        {script.angle && (
                          <span style={{ fontSize: "11px", color: "var(--color-fg-muted)" }}>
                            ðŸ“ {script.angle}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`gh-label ${platformColors[script.platform] || "gh-label-neutral"}`}>
                          {platformIcons[script.platform]} {platformNames[script.platform] || script.platform}
                        </span>
                      </td>
                      <td>
                        {script.tone && (
                          <span className={`gh-label ${toneColors[script.tone] || "gh-label-neutral"}`}>
                            {script.tone}
                          </span>
                        )}
                      </td>
                      <td style={{ color: "var(--color-fg-muted)", fontSize: "var(--font-size-small)" }}>
                        {script.word_count || "â€”"}
                      </td>
                      <td style={{ color: "var(--color-fg-muted)", fontSize: "var(--font-size-small)" }}>
                        v{script.version}
                      </td>
                      <td style={{ color: "var(--color-fg-muted)", fontSize: "var(--font-size-small)", whiteSpace: "nowrap" }}>
                        {formatDate(script.updated_at)}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(script.id)}
                          className="gh-btn gh-btn-sm gh-btn-danger"
                          disabled={deleting === script.id}
                          title="Hapus naskah"
                        >
                          {deleting === script.id ? <span className="gh-spinner" /> : (
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.41 15h5.178a1.75 1.75 0 001.746-1.577l.66-6.6a.75.75 0 10-1.492-.149L10.842 13.5H5.157L4.496 6.675z"/>
                            </svg>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>

        {/* Right â€” Script Detail Preview */}
        {selected && (
          <div className="animate-slide-right">
            <div className="gh-box">
              <div className="gh-box-header">
                <span className="gh-box-title">Preview Naskah</span>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button
                    onClick={() => handleCopy(`${selected.headline || ""}\n\n${selected.content}`)}
                    className={`gh-btn gh-btn-sm gh-btn-default ${copied ? "gh-copy-btn copied" : ""}`}
                  >
                    {copied ? "âœ“ Disalin!" : "Copy"}
                  </button>
                  <a
                    href={`${API}/api/scripts/${selected.id}/export?format=txt`}
                    target="_blank"
                    className="gh-btn gh-btn-sm gh-btn-default"
                    onClick={e => { e.preventDefault(); window.open(`${API}/api/scripts/${selected.id}/export?format=txt`, "_blank"); }}
                  >
                    .txt
                  </a>
                  <a
                    href={`${API}/api/scripts/${selected.id}/export?format=docx`}
                    target="_blank"
                    className="gh-btn gh-btn-sm gh-btn-default"
                    onClick={e => { e.preventDefault(); window.open(`${API}/api/scripts/${selected.id}/export?format=docx`, "_blank"); }}
                  >
                    .docx
                  </a>
                  <button onClick={() => setSelected(null)} className="gh-btn gh-btn-sm gh-btn-default">âœ•</button>
                </div>
              </div>
              <div className="gh-box-body">
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
                  <span className={`gh-label ${platformColors[selected.platform] || "gh-label-neutral"}`}>
                    {platformIcons[selected.platform]} {platformNames[selected.platform] || selected.platform}
                  </span>
                  {selected.tone && (
                    <span className={`gh-label ${toneColors[selected.tone] || "gh-label-neutral"}`}>{selected.tone}</span>
                  )}
                  {selected.word_count && (
                    <span className="gh-label gh-label-neutral">{selected.word_count} kata</span>
                  )}
                  <span className="gh-label gh-label-neutral">v{selected.version}</span>
                </div>

                {selected.headline && (
                  <h2 style={{ fontSize: "var(--font-size-h4)", fontWeight: 700, marginBottom: "var(--space-3)", color: "var(--color-fg-default)" }}>
                    {selected.headline}
                  </h2>
                )}
                {selected.angle && (
                  <div className="gh-flash gh-flash-info mb-4" style={{ marginBottom: "var(--space-4)" }}>
                    <strong>Angle:</strong> {selected.angle}
                  </div>
                )}
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: "var(--font-size-body)", color: "var(--color-fg-default)" }}>
                  {selected.content}
                </div>
                <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--color-border-default)" }}>
                  <span style={{ fontSize: "var(--font-size-small)", color: "var(--color-fg-muted)" }}>
                    Dibuat: {formatDate(selected.created_at)} Â· Diperbarui: {formatDate(selected.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}


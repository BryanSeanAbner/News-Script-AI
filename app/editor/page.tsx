"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "localhost" ? "" : "http://localhost:8000");

const PLATFORMS = [
  { id: "tv_radio", label: "TV / Radio", icon: "📺" },
  { id: "article", label: "Artikel Online", icon: "📰" },
  { id: "instagram", label: "Instagram", icon: "📷" },
  { id: "tiktok", label: "TikTok", icon: "🎵" },
  { id: "youtube", label: "YouTube Shorts", icon: "▶️" },
];

type Step = "idle" | "analyzing" | "done" | "error";

interface AnalysisResult {
  news_source_id: number;
  result: {
    facts: {
      title: string;
      language: string;
      facts: Record<string, string>;
      sentiment: { label: string; dominant_emotion: string; intensity: string };
      keywords: string[];
    };
    top3_angles: Array<{
      id: number;
      angle_name: string;
      angle_description: string;
      hook: string;
      viral_score: number;
      emotion_score: number;
      relevance_score: number;
      novelty_score: number;
      total_score: number;
      reasoning: string;
    }>;
    scripts: Record<string, {
      platform: string;
      platform_name: string;
      headline: string;
      content: string;
      word_count: number;
      notes?: string;
    }>;
  };
}

const sentimentLabel: Record<string, { label: string; cls: string }> = {
  positive: { label: "Positif", cls: "gh-label-success" },
  negative: { label: "Negatif", cls: "gh-label-danger" },
  neutral: { label: "Netral", cls: "gh-label-neutral" },
};

export default function EditorPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["tv_radio", "article"]);
  const [step, setStep] = useState<Step>("idle");
  const [stepLabel, setStepLabel] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedAngleIdx, setSelectedAngleIdx] = useState(0);
  const [activePlatform, setActivePlatform] = useState<string>("");
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [editedHeadline, setEditedHeadline] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }, []);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleAnalyze = async () => {
    if (!rawText.trim() || rawText.trim().length < 50) {
      setError("Teks berita minimal 50 karakter");
      return;
    }
    if (selectedPlatforms.length === 0) {
      setError("Pilih minimal satu platform");
      return;
    }
    setError("");
    setStep("analyzing");
    setResult(null);

    const steps = [
      "Mengekstrak fakta kunci (5W+1H)...",
      "Menganalisis sentimen & tone...",
      "Mengidentifikasi kandidat angle...",
      "Menilai & memilih Top 3 angle terbaik...",
      "Membuat naskah untuk setiap platform...",
    ];

    let i = 0;
    setStepLabel(steps[0]);
    const interval = setInterval(() => {
      i++;
      if (i < steps.length) setStepLabel(steps[i]);
    }, 2500);

    try {
      const res = await fetch(`${API}/api/news/analyze`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({
          raw_text: rawText,
          platforms: selectedPlatforms,
          source_url: sourceUrl || undefined,
        }),
      });

      clearInterval(interval);

      if (res.status === 401) { router.replace("/login"); return; }
      if (!res.ok) {
        let errorMsg = "Analisis gagal";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            errorMsg = data.detail || errorMsg;
          } else {
            const text = await res.text();
            errorMsg = text.length < 200 ? text : `Server error (${res.status})`;
          }
        } catch {
          errorMsg = `Server error (${res.status})`;
        }
        throw new Error(errorMsg);
      }

      const data: AnalysisResult = await res.json();
      setResult(data);

      // Initialize editable content from first platform
      const firstPlatform = Object.keys(data.result.scripts)[0];
      const initialContent: Record<string, string> = {};
      const initialHeadline: Record<string, string> = {};
      Object.entries(data.result.scripts).forEach(([p, s]) => {
        initialContent[p] = s.content;
        initialHeadline[p] = s.headline;
      });
      setEditedContent(initialContent);
      setEditedHeadline(initialHeadline);
      setActivePlatform(firstPlatform || "");
      setStep("done");
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setStep("error");
    }
  };

  const handleSaveScript = async (platform: string) => {
    if (!result) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const script = result.result.scripts[platform];
      const angle = result.result.top3_angles[selectedAngleIdx];
      const res = await fetch(`${API}/api/scripts/`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({
          news_source_id: result.news_source_id,
          platform,
          angle: angle?.angle_name,
          angle_reasoning: angle?.reasoning,
          headline: editedHeadline[platform] || script.headline,
          content: editedContent[platform] || script.content,
          tone: result.result.facts.sentiment.label,
          word_count: (editedContent[platform] || script.content).split(" ").length,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateWithAngle = async (angleIdx: number) => {
    if (!result || !activePlatform) return;
    setRegenerating(true);
    setSelectedAngleIdx(angleIdx);
    try {
      const res = await fetch(`${API}/api/scripts/regenerate`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({
          news_source_id: result.news_source_id,
          angle_index: angleIdx,
          platform: activePlatform,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEditedContent(prev => ({ ...prev, [activePlatform]: data.content }));
        setEditedHeadline(prev => ({ ...prev, [activePlatform]: data.headline }));
      }
    } catch { /* ignore */ }
    finally { setRegenerating(false); }
  };

  const activeScript = result?.result.scripts[activePlatform];

  return (
    <AppLayout>
      <div className="gh-page-header">
        <h1 className="gh-page-title">Buat Naskah Baru</h1>
        <p className="gh-page-subtitle">Paste teks berita, pilih platform, dan biarkan AI menganalisis serta membuat naskah terbaik</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: step === "done" ? "1fr 1fr" : "1fr", gap: "var(--space-6)" }}>

        {/* ── Panel Kiri: Input ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

          {/* Input Teks */}
          <div className="gh-box">
            <div className="gh-box-header">
              <span className="gh-box-title">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 6, verticalAlign: "middle" }}>
                  <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z" />
                </svg>
                Teks Berita
              </span>
              <span className="gh-counter">{rawText.trim().split(/\s+/).filter(Boolean).length} kata</span>
            </div>
            <div className="gh-box-body">
              <div className="gh-form-group">
                <label className="gh-label-text">
                  URL Sumber <span className="gh-label-caption"></span>
                </label>
                <input
                  id="source-url"
                  className="gh-input"
                  type="url"
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                  placeholder="https://media.com/berita/..."
                />
              </div>
              <div className="gh-form-group">
                <label className="gh-label-text">
                  Teks Berita <span style={{ color: "var(--color-danger-fg)" }}>*</span>
                  <span className="gh-label-caption">copy-paste dari media online</span>
                </label>
                <textarea
                  id="news-text-input"
                  className="gh-textarea"
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="Paste teks berita di sini...&#10;&#10;Contoh: Presiden mengumumkan kebijakan baru pada Senin, 5 Agustus 2026..."
                  style={{ minHeight: "280px" }}
                />
              </div>
            </div>
          </div>

          {/* Platform Selection */}
          <div className="gh-box">
            <div className="gh-box-header">
              <span className="gh-box-title">Platform Output</span>
            </div>
            <div className="gh-box-body">
              <div className="gh-checkbox-group">
                {PLATFORMS.map(p => (
                  <label
                    key={p.id}
                    className={`gh-checkbox-item ${selectedPlatforms.includes(p.id) ? "checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(p.id)}
                      onChange={() => togglePlatform(p.id)}
                    />
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="gh-flash gh-flash-danger animate-fade-in">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm-.857-5.857a.857.857 0 1 0 1.714 0 .857.857 0 0 0-1.714 0zM7.25 7.25v-3.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* AI Steps Progress */}
          {step === "analyzing" && (
            <div className="gh-box animate-fade-in">
              <div className="gh-box-header">
                <span className="gh-box-title">
                  <span className="gh-spinner" style={{ marginRight: 8 }} />
                  AI sedang menganalisis...
                </span>
              </div>
              <div className="gh-box-body">
                <div className="gh-steps">
                  {[
                    "Ekstrak fakta kunci (5W+1H)",
                    "Analisis sentimen & tone",
                    "Identifikasi kandidat angle",
                    "Scoring & pilih Top 3 angle",
                    "Generate naskah multi-platform",
                  ].map((label, i) => {
                    const currentIdx = [
                      "Mengekstrak fakta kunci",
                      "Menganalisis sentimen",
                      "Mengidentifikasi kandidat",
                      "Menilai & memilih",
                      "Membuat naskah",
                    ].findIndex(s => stepLabel.startsWith(s));
                    const isDone = i < currentIdx;
                    const isActive = i === currentIdx;
                    return (
                      <div key={i} className="gh-step">
                        <div className={`gh-step-dot ${isDone ? "done" : isActive ? "loading" : "pending"}`}>
                          {isDone ? "✓" : i + 1}
                        </div>
                        <div className="gh-step-body">
                          <div className="gh-step-title" style={{ opacity: isDone || isActive ? 1 : 0.5 }}>{label}</div>
                          {isActive && <div className="gh-step-desc">{stepLabel}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Analyze Button */}
          {step !== "analyzing" && (
            <button
              id="btn-analyze"
              onClick={handleAnalyze}
              className="gh-btn gh-btn-accent gh-btn-lg w-full"
            >
              {step === "done" ? "Analisis Ulang" : "✨ Analisis dengan AI"}
            </button>
          )}

          {/* AI Analysis Summary */}
          {step === "done" && result && (
            <div className="gh-box animate-fade-in">
              <div className="gh-box-header">
                <span className="gh-box-title">Hasil Analisis AI</span>
                <span className={`gh-label ${sentimentLabel[result.result.facts.sentiment.label]?.cls || "gh-label-neutral"}`}>
                  {sentimentLabel[result.result.facts.sentiment.label]?.label}
                  {" · "}
                  {result.result.facts.sentiment.dominant_emotion}
                </span>
              </div>
              <div className="gh-box-body">
                <table className="gh-table" style={{ marginBottom: "var(--space-3)" }}>
                  <tbody>
                    {Object.entries(result.result.facts.facts).map(([key, val]) => (
                      val ? (
                        <tr key={key}>
                          <td style={{ fontWeight: 600, width: "80px", color: "var(--color-fg-muted)", fontSize: "var(--font-size-small)", textTransform: "uppercase" }}>
                            {key === "who" ? "Siapa" : key === "what" ? "Apa" : key === "when" ? "Kapan" : key === "where" ? "Di mana" : key === "why" ? "Mengapa" : "Bagaimana"}
                          </td>
                          <td>{val}</td>
                        </tr>
                      ) : null
                    ))}
                  </tbody>
                </table>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
                  {result.result.facts.keywords.map(kw => (
                    <span key={kw} className="gh-label gh-label-neutral">{kw}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top 3 Angle */}
          {step === "done" && result && (
            <div className="gh-box animate-fade-in">
              <div className="gh-box-header">
                <span className="gh-box-title">🎯 Top 3 Angle Rekomendasi AI</span>
              </div>
              <div className="gh-box-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {result.result.top3_angles.map((angle, idx) => (
                  <div
                    key={idx}
                    className={`gh-score-card ${selectedAngleIdx === idx ? "selected" : ""}`}
                    onClick={() => handleRegenerateWithAngle(idx)}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: "var(--font-size-body)" }}>#{idx + 1} {angle.angle_name}</span>
                        {selectedAngleIdx === idx && idx !== 0 && <span className="gh-label gh-label-accent" style={{ marginLeft: 8 }}>Dipilih</span>}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: "var(--font-size-h4)", color: "var(--color-accent-fg)" }}>
                        {angle.total_score}
                      </span>
                    </div>
                    <p style={{ fontSize: "var(--font-size-small)", color: "var(--color-fg-muted)", marginBottom: "var(--space-2)" }}>
                      {angle.angle_description}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                      {[
                        { label: "Viral", score: angle.viral_score },
                        { label: "Emosi", score: angle.emotion_score },
                        { label: "Relevansi", score: angle.relevance_score },
                        { label: "Novelty", score: angle.novelty_score },
                      ].map(s => (
                        <div key={s.label} className="gh-score-bar">
                          <span className="gh-score-label">{s.label}</span>
                          <div className="gh-score-track">
                            <div className="gh-score-fill" style={{ width: `${s.score * 10}%` }} />
                          </div>
                          <span className="gh-score-value">{s.score}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: "var(--font-size-small)", color: "var(--color-fg-muted)", marginTop: "var(--space-2)", fontStyle: "italic" }}>
                      💡 {angle.reasoning}
                    </p>
                    {regenerating && selectedAngleIdx === idx && (
                      <div style={{ marginTop: "var(--space-2)", display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--color-accent-fg)" }}>
                        <span className="gh-spinner" />
                        <span style={{ fontSize: "var(--font-size-small)" }}>Regenerating naskah dengan angle ini...</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Panel Kanan: Naskah Editor ── */}
        {step === "done" && result && (
          <div className="animate-slide-right" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="gh-box" style={{ flex: 1 }}>
              <div className="gh-box-header">
                <span className="gh-box-title">Naskah</span>
                {saveSuccess && (
                  <span className="gh-label gh-label-success animate-fade-in">✓ Tersimpan!</span>
                )}
              </div>

              {/* Platform Tabs */}
              <div className="gh-tabs" style={{ borderBottom: "1px solid var(--color-border-default)", paddingLeft: "var(--space-4)" }}>
                {Object.entries(result.result.scripts).map(([pid]) => {
                  const p = PLATFORMS.find(x => x.id === pid);
                  return (
                    <button
                      key={pid}
                      onClick={() => setActivePlatform(pid)}
                      className={`gh-tab ${activePlatform === pid ? "active" : ""}`}
                    >
                      {p?.icon} {p?.label || pid}
                    </button>
                  );
                })}
              </div>

              {activeScript && (
                <div className="gh-box-body">
                  {/* Headline Editor */}
                  <div className="gh-form-group">
                    <label className="gh-label-text">Headline</label>
                    <input
                      id={`headline-${activePlatform}`}
                      className="gh-input"
                      value={editedHeadline[activePlatform] || ""}
                      onChange={e => setEditedHeadline(prev => ({ ...prev, [activePlatform]: e.target.value }))}
                    />
                  </div>

                  {/* Hook Preview */}
                  {result.result.top3_angles[selectedAngleIdx]?.hook && (
                    <div className="gh-flash gh-flash-info mb-3" style={{ marginBottom: "var(--space-3)" }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, marginTop: 2 }}>
                        <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z" />
                      </svg>
                      <div>
                        <strong>Hook Angle:</strong> {result.result.top3_angles[selectedAngleIdx].hook}
                      </div>
                    </div>
                  )}

                  {/* Content Editor */}
                  <div className="gh-form-group">
                    <label className="gh-label-text">
                      Naskah
                      <span className="gh-label-caption">{(editedContent[activePlatform] || "").split(/\s+/).filter(Boolean).length} kata</span>
                    </label>
                    <textarea
                      id={`content-${activePlatform}`}
                      className="gh-textarea"
                      value={editedContent[activePlatform] || ""}
                      onChange={e => setEditedContent(prev => ({ ...prev, [activePlatform]: e.target.value }))}
                      style={{ minHeight: "400px", fontFamily: "var(--font-family)" }}
                    />
                  </div>

                  {activeScript.notes && (
                    <div className="gh-flash gh-flash-warning mb-4">
                      <strong>Catatan Redaksi:</strong> {activeScript.notes}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                    <button
                      id="btn-save-script"
                      onClick={() => handleSaveScript(activePlatform)}
                      className="gh-btn gh-btn-primary"
                      disabled={saving}
                    >
                      {saving ? <><span className="gh-spinner" />Menyimpan...</> : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4.75 3a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h6.5a.75.75 0 00.75-.75v-5.5a.75.75 0 00-.22-.53L8.28 3.22A.75.75 0 007.75 3H4.75z" />
                          </svg>
                          Simpan Naskah
                        </>
                      )}
                    </button>
                    <button
                      id="btn-copy"
                      onClick={() => handleCopy(`${editedHeadline[activePlatform] || ""}\n\n${editedContent[activePlatform] || ""}`)}
                      className={`gh-btn gh-btn-default ${copied ? "gh-copy-btn copied" : ""}`}
                    >
                      {copied ? "✓ Disalin!" : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z" />
                            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5z" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                    <a
                      href="#"
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!result) return;
                        // Get script ID first, then download
                        const res = await fetch(`${API}/api/scripts/?limit=1`, {
                          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                        });
                        if (res.ok) {
                          const scripts = await res.json();
                          if (scripts.length > 0) {
                            window.open(`${API}/api/scripts/${scripts[0].id}/export?format=txt`, "_blank");
                          }
                        }
                      }}
                      className="gh-btn gh-btn-default"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75zM3.75 13a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z" />
                      </svg>
                      Download .txt
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

/**
 * QuickNewsPage — Mode Cepat 3-Slide (Kutipan/Wawancara Narsum -> Berita 5W+1H SEO 2026)
 * Alur:
 * Slide 1: Input Bahan Wawancara / Kutipan Narsum
 * Slide 2: Pratinjau 5W+1H, Angle & Pilihan Judul SEO
 * Slide 3: Naskah Berita Jadi (350-500 kata) + Editorial Review Terintegrasi + Kalkulator Kata SEO Realtime
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useSessionStore } from '../stores/sessionStore';
import WordCalculatorSEO from '../components/WordCalculatorSEO';
import { PageHeader, Alert, Badge, Spinner } from '../components/UI';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  Copy,
  Edit3,
  FileText,
  UserCheck,
  MapPin,
  Calendar,
  HelpCircle,
  Activity,
  Award,
  Share2,
  RefreshCw,
  Plus,
  Trash2
} from 'lucide-react';

// ── Helper: Serialize paragraphs ke clean Markdown string ─────────────────────
function serializeParagraphsToMarkdown(paragraphs) {
  if (!paragraphs || paragraphs.length === 0) return '';
  let lastHeading = null;
  const blocks = [];
  paragraphs.forEach(p => {
    const heading = (p.section_heading || '').trim();
    if (heading && heading !== lastHeading) {
      lastHeading = heading;
      blocks.push(`## ${heading}`);
    }
    const text = (p.text || '').trim();
    if (text) {
      blocks.push(text);
    }
  });
  return blocks.join('\n\n');
}

// ── Helper: Parse markdown string kembali ke struktur array paragraphs ────────
function parseMarkdownToParagraphs(markdownText, existingParagraphs = []) {
  if (!markdownText || !markdownText.trim()) return [];
  const blocks = markdownText.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const newParas = [];
  let currentHeading = null;
  let paraIdx = 0;

  for (const block of blocks) {
    if (block.startsWith('## ')) {
      currentHeading = block.replace(/^##\s+/, '').trim();
      continue;
    }

    // Paragraf teks
    const prev = existingParagraphs[paraIdx] || {};
    let inferredType = prev.type || 'FACT';

    // Deteksi cerdas label jika ada kata kunci editorial/opini
    const lower = block.toLowerCase();
    if (lower.includes('redaksi menilai') || lower.includes('menurut redaksi') ||
      lower.includes('catatan kritis') || lower.includes('analisis opini') ||
      lower.includes('pengamat menilai') || lower.includes('evaluasi independen') ||
      lower.includes('harapan ke depan') || lower.includes('pandangan redaksi')) {
      inferredType = 'OPINI';
    } else if (lower.includes('konteks') || lower.includes('regulasi') || lower.includes('sebelumnya') || lower.includes('latar belakang')) {
      inferredType = 'CONTEXT';
    }

    newParas.push({
      ...prev,
      order: paraIdx + 1,
      type: inferredType,
      text: block,
      section_heading: currentHeading,
      quote: prev.quote || null
    });
    paraIdx++;
  }

  return newParas;
}

export default function QuickNewsPage() {
  const navigate = useNavigate();
  const { saveQuickNewsSession } = useSessionStore();

  // Step Slide: 1, 2, atau 3
  const [slide, setSlide] = useState(1);

  // ── State Slide 1 ──────────────────────────────────────────────────────────
  const [newsTitle, setNewsTitle] = useState('');
  const [topic, setTopic] = useState('Kriminal');
  const [rawText, setRawText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [slide1Error, setSlide1Error] = useState(null);

  // ── State Slide 2 ──────────────────────────────────────────────────────────
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [useCustomTitle, setUseCustomTitle] = useState(false);
  const [selectedAngle, setSelectedAngle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [slide2Error, setSlide2Error] = useState(null);

  // ── State Slide 3 ──────────────────────────────────────────────────────────
  const [draftResult, setDraftResult] = useState(null);
  const [editableParagraphs, setEditableParagraphs] = useState([]);
  const [fullTextMode, setFullTextMode] = useState(false);
  const [fullTextContent, setFullTextContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // ── Load Sample Template ──────────────────────────────────────────────────
  function loadSample(sample) {
    setNewsTitle(sample.newsTitle || '');
    setTopic(sample.topic || 'Kriminal');
    setRawText(sample.text);
    setSlide1Error(null);
  }

  // ── Handle Action Slide 1 -> Slide 2 (Analyze 5W+1H) ─────────────────────
  async function handleAnalyze() {
    if (!rawText.trim() || rawText.trim().length < 50) {
      setSlide1Error('Mohon masukkan teks berita/bahan konten minimal 50 karakter.');
      return;
    }
    setSlide1Error(null);
    setIsAnalyzing(true);

    try {
      const res = await api.analyzeInterview({
        raw_text: rawText.trim(),
        title: newsTitle.trim(),
        topic: topic.trim(),
      });

      setAnalysisResult(res);

      // Jika user sudah memasukkan judul di Slide 1, jadikan opsi aktif
      if (newsTitle.trim()) {
        setSelectedTitle(newsTitle.trim());
        setCustomTitle(newsTitle.trim());
        setUseCustomTitle(true);
      } else if (res.titles && res.titles.length > 0) {
        setSelectedTitle(res.titles[0].text);
        setUseCustomTitle(false);
      }
      if (res.angles && res.angles.length > 0) {
        setSelectedAngle(res.angles[0].title);
      }

      setSlide(2);
    } catch (err) {
      setSlide1Error(err.message || 'Gagal menganalisis 5W+1H.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  // ── Handle Action Slide 2 -> Slide 3 (Generate Draft 400 Kata SEO) ────────
  async function handleGenerateDraft() {
    const finalTitle = useCustomTitle ? customTitle.trim() : selectedTitle.trim();
    if (!finalTitle) {
      setSlide2Error('Mohon pilih atau masukkan judul berita.');
      return;
    }

    setSlide2Error(null);
    setIsGenerating(true);

    try {
      const extractedSpeaker = analysisResult?.quotes?.[0]?.speaker || analysisResult?.five_w_one_h?.who || '';
      const res = await api.generateQuickNews({
        raw_text: rawText.trim(),
        selected_title: finalTitle,
        selected_angle: selectedAngle,
        five_w_one_h: analysisResult?.five_w_one_h || {},
        quotes: analysisResult?.quotes || [],
        speaker_name: extractedSpeaker,
        speaker_title: '',
        topic: topic ? topic.trim() : '',
      });

      setDraftResult(res);

      // Inisialisasi paragraf untuk inline editorial review
      const paras = res.paragraphs || [];
      const clonedParas = paras.map(p => ({ ...p }));
      setEditableParagraphs(clonedParas);

      // Inisialisasi full text dengan serializer yang sama persis
      const initialText = serializeParagraphsToMarkdown(clonedParas) || res.content || '';
      setFullTextContent(initialText);

      setSlide(3);
    } catch (err) {
      setSlide2Error(err.message || 'Gagal membuat naskah berita berdasarkan 5W+1H.');
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Update Paragraph Inline Edit ──────────────────────────────────────────
  function updateParagraph(idx, field, val) {
    const updated = [...editableParagraphs];
    updated[idx][field] = val;
    setEditableParagraphs(updated);

    // Sync to full text content secara konsisten
    const newFullText = serializeParagraphsToMarkdown(updated);
    setFullTextContent(newFullText);
  }

  // ── Toggle Mode Antara Paragraf & Editor Teks Lengkap ─────────────────────
  function handleToggleMode() {
    if (!fullTextMode) {
      // Masuk ke Full Text Mode: serialize dari editableParagraphs
      const markdown = serializeParagraphsToMarkdown(editableParagraphs);
      setFullTextContent(markdown);
      setFullTextMode(true);
    } else {
      // Kembali ke Mode Paragraf: parse dari fullTextContent
      const parsed = parseMarkdownToParagraphs(fullTextContent, editableParagraphs);
      setEditableParagraphs(parsed);
      setFullTextMode(false);
    }
  }

  // ── Copy Clean Text to Clipboard ──────────────────────────────────────────
  function handleCopy() {
    const titleToCopy = useCustomTitle ? customTitle : selectedTitle;
    const bodyToCopy = fullTextMode ? fullTextContent : serializeParagraphsToMarkdown(editableParagraphs);
    const textToCopy = `# ${titleToCopy}\n\n${bodyToCopy}`;

    navigator.clipboard.writeText(textToCopy.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // ── Simpan / Publish Session ──────────────────────────────────────────────
  function handleSaveAndPublish() {
    const finalTitle = useCustomTitle ? customTitle : selectedTitle;
    const finalContent = fullTextMode ? fullTextContent : serializeParagraphsToMarkdown(editableParagraphs);

    const extractedSpeaker = analysisResult?.quotes?.[0]?.speaker || analysisResult?.five_w_one_h?.who || '';
    const savedSession = saveQuickNewsSession({
      title: finalTitle,
      content: finalContent,
      rawText: rawText,
      topic: topic,
      speakerName: extractedSpeaker,
      speakerTitle: '',
      paragraphs: editableParagraphs,
      seoMetrics: { seoScore: 95 }
    });

    setSavedSuccess(true);
    setTimeout(() => {
      navigate('/');
    }, 1200);
  }

  return (
    <div className="page-container">
      {/* Header Halaman */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Badge variant="pass" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mode Cepat Google 2026
          </Badge>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>
            Rumus SEO 350–500 Kata (Target ±400 Kata) — Berita, Artikel, Laporan, Opini
          </span>
        </div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-fg-default)' }}>
          Generate Naskah berdasarkan 5W + 1H
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-fg-muted)' }}>
          Ubah kutipan narasumber, siaran pers, data wawancara, atau bahan teks apapun menjadi naskah terstruktur berdasarkan 5W+1H standar Google 2026.
        </p>
      </div>

      {/* Stepper Wizard Bar (Slide 1 - 2 - 3) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-6)',
        backgroundColor: 'var(--color-canvas-subtle)',
        padding: '6px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border-default)'
      }}>
        <div
          onClick={() => setSlide(1)}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: slide === 1 ? 'var(--color-canvas-default)' : 'transparent',
            boxShadow: slide === 1 ? 'var(--shadow-sm)' : 'none',
            border: slide === 1 ? '1px solid var(--color-border-default)' : '1px solid transparent',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: slide === 1 ? 700 : 500, color: slide === 1 ? 'var(--color-accent-fg)' : 'var(--color-fg-muted)' }}>
            Slide 1
          </div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: slide === 1 ? 'var(--color-fg-default)' : 'var(--color-fg-muted)' }}>
            Input Judul & Teks Berita
          </div>
        </div>

        <div
          onClick={() => analysisResult && setSlide(2)}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: slide === 2 ? 'var(--color-canvas-default)' : 'transparent',
            boxShadow: slide === 2 ? 'var(--shadow-sm)' : 'none',
            border: slide === 2 ? '1px solid var(--color-border-default)' : '1px solid transparent',
            cursor: analysisResult ? 'pointer' : 'not-allowed',
            opacity: analysisResult ? 1 : 0.6,
            textAlign: 'center',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: slide === 2 ? 700 : 500, color: slide === 2 ? 'var(--color-accent-fg)' : 'var(--color-fg-muted)' }}>
            Slide 2
          </div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: slide === 2 ? 'var(--color-fg-default)' : 'var(--color-fg-muted)' }}>
            Ekstraksi 5W+1H & Judul
          </div>
        </div>

        <div
          onClick={() => draftResult && setSlide(3)}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: slide === 3 ? 'var(--color-canvas-default)' : 'transparent',
            boxShadow: slide === 3 ? 'var(--shadow-sm)' : 'none',
            border: slide === 3 ? '1px solid var(--color-border-default)' : '1px solid transparent',
            cursor: draftResult ? 'pointer' : 'not-allowed',
            opacity: draftResult ? 1 : 0.6,
            textAlign: 'center',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: slide === 3 ? 700 : 500, color: slide === 3 ? 'var(--color-accent-fg)' : 'var(--color-fg-muted)' }}>
            Slide 3
          </div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: slide === 3 ? 'var(--color-fg-default)' : 'var(--color-fg-muted)' }}>
            Generate Naskah berdasarkan 5W + 1H
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* SLIDE 1: INPUT JUDUL & TEKS BERITA                                     */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {slide === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {slide1Error && <Alert type="danger">{slide1Error}</Alert>}

          <div className="card" style={{ padding: 'var(--space-5)' }}>
            {/* Input Judul Berita & Kategori Konten */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="news-title">
                  Judul Berita <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)', fontWeight: 'normal' }}>(Opsional / Awal)</span>
                </label>
                <input
                  id="news-title"
                  type="text"
                  className="form-input"
                  placeholder="Ketik judul berita jika sudah ada, atau biarkan kosong untuk dibuatkan AI..."
                  value={newsTitle}
                  onChange={e => setNewsTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="topic-select">
                  Topik / Kategori Konten <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)', fontWeight: 'normal' }}>(Opsional)</span>
                </label>
                <input
                  id="topic-select"
                  type="text"
                  className="form-input"
                  placeholder="cth: Kriminal, Kebijakan, Bisnis, Umum, dll."
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <label className="form-label form-label-required" htmlFor="raw-interview" style={{ marginBottom: 0 }}>
                  Teks Berita / Bahan Konten
                </label>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>
                  {rawText.trim().split(/\s+/).filter(Boolean).length} kata | {rawText.length} karakter
                </span>
              </div>

              <textarea
                id="raw-interview"
                className="form-input form-textarea"
                rows={10}
                placeholder={`Paste teks berita atau bahan konten di sini — bisa berupa:\n• Teks berita atau transkrip wawancara\n• Kutipan langsung pejabat/tokoh\n• Siaran pers / rilis resmi instansi\n• Data fakta lapangan / kronologi kejadian\n• Laporan kebijakan, keuangan, atau hasil riset\nAI akan otomatis membedah poin 5W+1H, mengekstrak nama tokoh/narasumber beserta institusinya, menyaring kutipan, serta merancang sudut pandang dan judul SEO.`}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                style={{ fontSize: 'var(--text-base)', lineHeight: '1.6' }}
              />
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)', marginTop: '4px' }}>
                * AI akan otomatis membedah poin 5W+1H (termasuk identifikasi tokoh/narasumber dan jabatannya), menyaring kutipan, serta merancang sudut pandang dan judul SEO.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !rawText.trim()}
                style={{ minWidth: '240px', height: '40px' }}
              >
                {isAnalyzing ? (
                  <>
                    <Spinner size="sm" /> Menganalisis 5W+1H...
                  </>
                ) : (
                  <>
                    Analisis 5W+1H & Rekomendasi Judul <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* SLIDE 2: PREVIEW 5W+1H & PILIHAN JUDUL SEO                             */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {slide === 2 && analysisResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {slide2Error && <Alert type="danger">{slide2Error}</Alert>}

          {/* Grid 5W+1H */}
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-3)' }}>
              <Badge variant="info">Ekstraksi 5W+1H</Badge>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>
                Intisari Fakta dari Wawancara Narasumber
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
              {/* WHAT */}
              <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-canvas-subtle)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-accent-fg)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-accent-fg)', textTransform: 'uppercase' }}>
                  What (Peristiwa)
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-fg-default)', marginTop: '4px' }}>
                  {analysisResult.five_w_one_h?.what || '-'}
                </div>
              </div>

              {/* WHO */}
              <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-canvas-subtle)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-success-fg)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-success-fg)', textTransform: 'uppercase' }}>
                  Who (Tokoh / Narsum / Pelaku)
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-fg-default)', marginTop: '4px' }}>
                  {analysisResult.five_w_one_h?.who || '-'}
                </div>
              </div>

              {/* WHERE */}
              <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-canvas-subtle)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-attention-fg)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-attention-fg)', textTransform: 'uppercase' }}>
                  Where (Lokasi)
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-fg-default)', marginTop: '4px' }}>
                  {analysisResult.five_w_one_h?.where || '-'}
                </div>
              </div>

              {/* WHEN */}
              <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-canvas-subtle)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-attention-fg)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-attention-fg)', textTransform: 'uppercase' }}>
                  When (Waktu)
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-fg-default)', marginTop: '4px' }}>
                  {analysisResult.five_w_one_h?.when || '-'}
                </div>
              </div>

              {/* WHY */}
              <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-canvas-subtle)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-danger-fg)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-danger-fg)', textTransform: 'uppercase' }}>
                  Why (Motif / Alasan)
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-fg-default)', marginTop: '4px' }}>
                  {analysisResult.five_w_one_h?.why || '-'}
                </div>
              </div>

              {/* HOW */}
              <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-canvas-subtle)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-accent-fg)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-accent-fg)', textTransform: 'uppercase' }}>
                  How (Kronologi & Tindakan)
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-fg-default)', marginTop: '4px' }}>
                  {analysisResult.five_w_one_h?.how || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Kutipan Narsum Terpilih */}
          {analysisResult.quotes && analysisResult.quotes.length > 0 && (
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                Kutipan Kunci Narasumber (Verbatim Quotes)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {analysisResult.quotes.map((q, idx) => (
                  <blockquote
                    key={idx}
                    style={{
                      margin: 0,
                      padding: 'var(--space-2) var(--space-3)',
                      backgroundColor: 'var(--color-canvas-subtle)',
                      borderLeft: '3px solid var(--color-accent-emphasis)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-xs)',
                      fontStyle: 'italic',
                      color: 'var(--color-fg-default)'
                    }}
                  >
                    &ldquo;{q.quote}&rdquo; &mdash; <strong style={{ fontStyle: 'normal' }}>{q.speaker || analysisResult?.five_w_one_h?.who || 'Narasumber'}</strong>
                  </blockquote>
                ))}
              </div>
            </div>
          )}

          {/* Pilihan Judul SEO Google 2026 */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>
                  Pilih Rekomendasi Judul SEO Google 2026
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)', margin: 0 }}>
                  Judul dioptimasi dengan Keyword di depan, nama pejabat/narsum, dan daya tarik klik tinggi (CTR).
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              {analysisResult.titles?.map((t) => (
                <label
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${!useCustomTitle && selectedTitle === t.text ? 'var(--color-accent-emphasis)' : 'var(--color-border-default)'}`,
                    backgroundColor: !useCustomTitle && selectedTitle === t.text ? 'var(--color-canvas-subtle)' : 'var(--color-canvas-default)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="seo-title"
                    checked={!useCustomTitle && selectedTitle === t.text}
                    onChange={() => {
                      setUseCustomTitle(false);
                      setSelectedTitle(t.text);
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                      {t.text}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <Badge variant="neutral" style={{ fontSize: '10px' }}>{t.style}</Badge>
                      <span style={{ fontSize: '11px', color: 'var(--color-fg-muted)' }}>
                        Keyword: <strong>{t.keyword}</strong>
                      </span>
                    </div>
                  </div>
                </label>
              ))}

              {/* Opsi Judul Kustom */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${useCustomTitle ? 'var(--color-accent-emphasis)' : 'var(--color-border-default)'}`,
                  backgroundColor: useCustomTitle ? 'var(--color-canvas-subtle)' : 'var(--color-canvas-default)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="seo-title"
                  checked={useCustomTitle}
                  onChange={() => setUseCustomTitle(true)}
                />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Tulis Judul Kustom Sendiri</span>
                  {useCustomTitle && (
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ketik judul berita kustom Anda..."
                      value={customTitle}
                      onChange={e => setCustomTitle(e.target.value)}
                      style={{ marginTop: '6px' }}
                    />
                  )}
                </div>
              </label>
            </div>

            {/* Navigasi Slide 2 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSlide(1)}
              >
                <ArrowLeft size={16} /> Kembali ke Slide 1
              </button>

              <button
                type="button"
                className="btn btn-success"
                onClick={handleGenerateDraft}
                disabled={isGenerating}
                style={{ minWidth: '260px', height: '40px' }}
              >
                {isGenerating ? (
                  <>
                    <Spinner size="sm" /> Menulis Naskah Berdasarkan 5W+1H...
                  </>
                ) : (
                  <>
                    Generate Naskah berdasarkan 5W + 1H (±400 Kata) <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* SLIDE 3: NASKAH BERITA JADI + EDITORIAL REVIEW + KALKULATOR KATA       */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {slide === 3 && draftResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Header Berhasil */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--color-canvas-subtle)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-default)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={18} style={{ color: 'var(--color-success-fg)' }} />
                <span style={{ fontWeight: 700, color: 'var(--color-fg-default)' }}>
                  Generate Naskah berdasarkan 5W + 1H Selesai
                </span>
                <Badge variant="pass">Target SEO 2026 (±400 kata)</Badge>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)', marginTop: '2px' }}>
                Anda dapat menyunting langsung tiap paragraf di bawah (Editorial Review). Kalkulator Kata di sebelah kanan merespon secara real-time.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleToggleMode}
              >
                <Edit3 size={14} /> {fullTextMode ? 'Mode Paragraf & Label' : 'Mode Editor Teks Lengkap'}
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleCopy}
              >
                {copied ? <><Check size={14} /> Tersalin!</> : <><Copy size={14} /> Salin Naskah</>}
              </button>
            </div>
          </div>

          {/* Layout 2 Kolom: Kiri Naskah & Review, Kanan Kalkulator Kata SEO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)', gap: 'var(--space-4)', alignItems: 'start' }}>
            {/* Kolom Kiri: Naskah Berita & Editorial Review */}
            <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Judul Berita */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-fg-muted)', textTransform: 'uppercase' }}>
                  Judul Berita (Dapat disunting)
                </span>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-fg-default)', marginTop: '4px' }}
                  value={useCustomTitle ? customTitle : selectedTitle}
                  onChange={e => {
                    setUseCustomTitle(true);
                    setCustomTitle(e.target.value);
                  }}
                />
              </div>

              {/* Mode 1: Interactive Paragraphs with Inline Editorial Review */}
              {!fullTextMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {editableParagraphs.map((p, idx) => {
                    const isFact = p.type === 'FACT';
                    const isContext = p.type === 'CONTEXT';
                    const badgeVar = isFact ? 'pass' : isContext ? 'info' : 'warn';

                    return (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: 'var(--color-canvas-subtle)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border-default)',
                          borderLeft: `4px solid ${isFact ? 'var(--color-success-fg)' : isContext ? 'var(--color-accent-fg)' : 'var(--color-attention-fg)'
                            }`,
                          padding: 'var(--space-3)'
                        }}
                      >
                        {/* Sub-judul H2 jika ada */}
                        {p.section_heading && (
                          <div style={{ marginBottom: '8px', borderBottom: '1px solid var(--color-border-muted)', paddingBottom: '4px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--color-fg-muted)', fontWeight: 600 }}>SUB-JUDUL H2:</span>
                            <input
                              type="text"
                              className="form-input"
                              value={p.section_heading}
                              onChange={e => updateParagraph(idx, 'section_heading', e.target.value)}
                              style={{ fontWeight: 700, fontSize: 'var(--text-sm)', marginTop: '2px' }}
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Badge variant={badgeVar}>[{p.type || 'FACT'}]</Badge>
                            <span style={{ fontSize: '11px', color: 'var(--color-fg-muted)' }}>
                              Paragraf #{idx + 1} ({p.text.split(/\s+/).filter(Boolean).length} kata)
                            </span>
                          </div>

                          {/* Ganti label cepat */}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {['FACT', 'CONTEXT', 'OPINI'].map(label => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => updateParagraph(idx, 'type', label)}
                                className="btn btn-ghost btn-sm"
                                style={{
                                  padding: '1px 6px',
                                  fontSize: '10px',
                                  fontWeight: p.type === label ? 700 : 400,
                                  color: p.type === label ? 'var(--color-fg-default)' : 'var(--color-fg-muted)'
                                }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Textarea inline edit */}
                        <textarea
                          className="form-input"
                          rows={3}
                          value={p.text}
                          onChange={e => updateParagraph(idx, 'text', e.target.value)}
                          style={{
                            width: '100%',
                            fontSize: 'var(--text-sm)',
                            lineHeight: '1.6',
                            resize: 'vertical',
                            backgroundColor: 'var(--color-canvas-default)'
                          }}
                        />

                        {/* Kutipan asli narsum jika terhubung */}
                        {p.quote && (
                          <div style={{
                            marginTop: '6px',
                            fontSize: '11px',
                            color: 'var(--color-fg-muted)',
                            fontStyle: 'italic',
                            backgroundColor: 'var(--color-canvas-default)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            borderLeft: '2px solid var(--color-border-default)'
                          }}>
                            Kutipan Asli: &ldquo;{p.quote}&rdquo;
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Mode 2: Full Text Raw Editor */
                <div>
                  <textarea
                    className="form-input form-textarea"
                    rows={18}
                    value={fullTextContent}
                    onChange={e => {
                      const val = e.target.value;
                      setFullTextContent(val);
                      // Real-time sync ke struktur paragraf agar skor & word count selalu identik
                      const parsed = parseMarkdownToParagraphs(val, editableParagraphs);
                      setEditableParagraphs(parsed);
                    }}
                    style={{ fontSize: 'var(--text-base)', lineHeight: '1.7' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--color-fg-muted)' }}>
                    Gunakan <code>## Subjudul</code> untuk menandai H2 di naskah.
                  </span>
                </div>
              )}
            </div>

            {/* Kolom Kanan: Kalkulator Kata & Skor SEO Google 2026 */}
            <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <WordCalculatorSEO
                text={fullTextMode ? fullTextContent : serializeParagraphsToMarkdown(editableParagraphs)}
                paragraphs={editableParagraphs}
                title={useCustomTitle ? customTitle : selectedTitle}
              />

              {/* Action Buttons Box */}
              <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleSaveAndPublish}
                  style={{ height: '40px', justifyContent: 'center' }}
                >
                  <Check size={16} /> Simpan & Publish ke Dashboard
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCopy}
                  style={{ height: '36px', justifyContent: 'center' }}
                >
                  {copied ? <><Check size={16} /> Naskah Berhasil Disalin</> : <><Copy size={16} /> Salin Format Siap Tayang</>}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border-muted)' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSlide(2)}
                  >
                    <ArrowLeft size={14} /> Ke Slide 2
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setSlide(1);
                      setRawText('');
                      setAnalysisResult(null);
                      setDraftResult(null);
                    }}
                  >
                    <RefreshCw size={14} /> Berita Baru
                  </button>
                </div>
              </div>

              {savedSuccess && (
                <Alert type="pass">
                  Berita berhasil disimpan! Mengarahkan ke Dashboard...
                </Alert>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

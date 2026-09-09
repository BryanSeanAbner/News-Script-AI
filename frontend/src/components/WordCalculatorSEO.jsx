import React, { useMemo } from 'react';
import { Badge } from './UI';
import { CheckCircle, AlertTriangle, XCircle, Smartphone, Award, FileText, Hash, Quote } from 'lucide-react';

/**
 * Kalkulator Kata & SEO Score Checker 2026
 * Standar Google News / Berita Harian 2026:
 * - 350 - 500 kata (Zona Aman Paling SEO, Sweet Spot ~400 kata)
 * - Lead 5W1H (40-50 kata)
 * - 2-3 Sub-judul H2
 * - Minimal 2 kutipan narsum
 * - Maksimal 3 kalimat per paragraf untuk kenyamanan mobile
 */
export default function WordCalculatorSEO({ text = '', paragraphs = [], title = '' }) {
  // Hitung metrik naskah
  const metrics = useMemo(() => {
    // Teks gabungan dari paragraphs atau raw text
    let fullText = text;
    if ((!fullText || fullText.trim().length === 0) && paragraphs && paragraphs.length > 0) {
      fullText = paragraphs.map(p => p.text || '').join('\n\n');
    }

    const trimmed = fullText.trim();
    if (!trimmed) {
      return {
        wordCount: 0,
        charCount: 0,
        paraCount: 0,
        h2Count: 0,
        quotesCount: 0,
        leadWords: 0,
        mobileFriendly: true,
        violatingParas: [],
        seoScore: 0,
        zone: 'empty',
        zoneLabel: 'Belum Ada Naskah',
        zoneColor: 'neutral'
      };
    }

    // Hitung kata (split spasi)
    const words = trimmed.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const charCount = trimmed.length;

    // Hitung paragraf
    const paras = trimmed.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const paraCount = paras.length;

    // Hitung H2 (cek markdown ## atau baris subjudul)
    const h2Matches = trimmed.match(/^##\s+.+$/gm) || [];
    let h2Count = h2Matches.length;
    // Jika tidak pakai markdown ##, cek dari paragraphs metadata jika ada
    if (h2Count === 0 && paragraphs && paragraphs.length > 0) {
      const headingSet = new Set(paragraphs.map(p => p.section_heading).filter(Boolean));
      h2Count = headingSet.size;
    }

    // Hitung kutipan narasumber (petik ganda)
    const quoteMatches = trimmed.match(/"([^"]{5,300})"/g) || [];
    let quotesCount = quoteMatches.length;
    if (quotesCount === 0 && paragraphs && paragraphs.length > 0) {
      quotesCount = paragraphs.filter(p => p.quote && p.quote.trim().length > 0).length;
    }

    // Lead (paragraf pertama): hitung kata
    const firstPara = paras[0] || '';
    // Buang heading jika ada di awal
    const cleanFirstPara = firstPara.replace(/^#+\s+.+\n*/, '').trim();
    const leadWords = cleanFirstPara.split(/\s+/).filter(Boolean).length;

    // Cek keterbacaan mobile (maks 3 kalimat per paragraf)
    const violatingParas = [];
    paras.forEach((p, idx) => {
      // Lewati jika hanya heading
      if (p.startsWith('#')) return;
      // Hitung kalimat dengan split tanda baca .!?
      const sentences = p.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 3);
      if (sentences.length > 3) {
        violatingParas.push({ index: idx + 1, sentenceCount: sentences.length });
      }
    });
    const mobileFriendly = violatingParas.length === 0;

    // Hitung Komposisi Jurnalistik [FACT], [CONTEXT], [OPINI]
    let factCount = 0;
    let contextCount = 0;
    let opiniCount = 0;
    if (paragraphs && paragraphs.length > 0) {
      paragraphs.forEach(p => {
        const t = (p.type || '').toUpperCase();
        if (t === 'FACT') factCount++;
        else if (t === 'OPINI') opiniCount++;
        else contextCount++;
      });
    } else {
      factCount = (trimmed.match(/\[FACT\]/gi) || []).length;
      contextCount = (trimmed.match(/\[CONTEXT\]/gi) || []).length;
      opiniCount = (trimmed.match(/\[OPINI\]/gi) || []).length;
    }
    const hasFullComposition = factCount > 0 && contextCount > 0 && opiniCount > 0;

    // Tentukan Zona SEO Jumlah Kata
    let zone = 'safe';
    let zoneLabel = 'ZONA AMAN PALING SEO (Google News 2026)';
    let zoneColor = 'pass';

    if (wordCount < 200) {
      zone = 'too_thin';
      zoneLabel = 'Terlalu Tipis (<200 kata) — Potensi Tidak Terindeks';
      zoneColor = 'danger';
    } else if (wordCount < 350) {
      zone = 'brief';
      zoneLabel = 'Berita Cepat / Ringkas (200-349 kata)';
      zoneColor = 'warn';
    } else if (wordCount <= 500) {
      zone = 'sweet_spot';
      zoneLabel = 'ZONA AMAN PALING SEO (350-500 kata)';
      zoneColor = 'pass';
    } else if (wordCount <= 800) {
      zone = 'feature';
      zoneLabel = 'Agak Panjang (501-800 kata) — Format Feature/Analisis';
      zoneColor = 'info';
    } else {
      zone = 'too_long';
      zoneLabel = 'Terlalu Panjang (>800 kata) — Resiko Bounce Rate Tinggi di HP';
      zoneColor = 'danger';
    }

    // Hitung Skor SEO Kumulatif (0 - 100)
    let score = 0;

    // 1. Jumlah kata (bobot 35 poin)
    if (wordCount >= 350 && wordCount <= 500) {
      score += 35; // Sweet spot ideal
    } else if (wordCount >= 300 && wordCount <= 600) {
      score += 25;
    } else if (wordCount >= 200 && wordCount <= 800) {
      score += 15;
    } else {
      score += 5;
    }

    // 2. Lead 5W1H (bobot 20 poin)
    if (leadWords >= 35 && leadWords <= 55) {
      score += 20; // Pas 40-50 kata
    } else if (leadWords >= 25 && leadWords <= 70) {
      score += 15;
    } else if (leadWords > 0) {
      score += 8;
    }

    // 3. Sub-judul H2 (bobot 15 poin)
    if (h2Count >= 2 && h2Count <= 4) {
      score += 15;
    } else if (h2Count === 1) {
      score += 8;
    }

    // 4. Kutipan Narsum (bobot 15 poin)
    if (quotesCount >= 2) {
      score += 15;
    } else if (quotesCount === 1) {
      score += 8;
    }

    // 5. Keramahan Layar HP (bobot 15 poin)
    if (mobileFriendly && paraCount >= 3) {
      score += 15;
    } else if (violatingParas.length <= 1) {
      score += 8;
    }

    return {
      wordCount,
      charCount,
      paraCount,
      h2Count,
      quotesCount,
      leadWords,
      mobileFriendly,
      violatingParas,
      factCount,
      contextCount,
      opiniCount,
      hasFullComposition,
      seoScore: Math.min(100, score),
      zone,
      zoneLabel,
      zoneColor
    };
  }, [text, paragraphs]);

  // Persentase meter (maks 600 kata sebagai patokan visual)
  const progressPercent = Math.min(100, Math.round((metrics.wordCount / 500) * 100));

  return (
    <div style={{
      backgroundColor: 'var(--color-canvas-default)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }}>
      {/* Header Skor SEO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-muted)', paddingBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={20} style={{ color: metrics.seoScore >= 80 ? 'var(--color-success-fg)' : 'var(--color-attention-fg)' }} />
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-fg-default)' }}>
              Kalkulator Kata & Skor SEO Google 2026
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-fg-muted)' }}>
              Standar Berita Harian Google News
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 800,
            color: metrics.seoScore >= 85 ? 'var(--color-success-fg)' : metrics.seoScore >= 65 ? 'var(--color-attention-fg)' : 'var(--color-danger-fg)'
          }}>
            {metrics.seoScore}<span style={{ fontSize: 'var(--text-xs)', fontWeight: 'normal', color: 'var(--color-fg-muted)' }}>/100</span>
          </div>
        </div>
      </div>

      {/* Meter Jumlah Kata */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-fg-default)' }}>
              {metrics.wordCount}
            </span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-fg-muted)' }}>kata</span>
          </div>
          <Badge variant={metrics.zoneColor}>
            {metrics.zoneLabel}
          </Badge>
        </div>

        {/* Progress Bar dengan penanda zona */}
        <div style={{ position: 'relative', height: '10px', backgroundColor: 'var(--color-canvas-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              backgroundColor: metrics.zoneColor === 'pass' 
                ? 'var(--color-success-fg)' 
                : metrics.zoneColor === 'warn' 
                ? 'var(--color-attention-fg)' 
                : 'var(--color-danger-fg)',
              transition: 'width 0.3s ease'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-fg-muted)', marginTop: '4px' }}>
          <span>0</span>
          <span>200</span>
          <span style={{ fontWeight: 'bold', color: 'var(--color-success-fg)' }}>350-500 (Zona Aman)</span>
          <span>800+</span>
        </div>
      </div>

      {/* Checklist SEO 2026 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: 'var(--text-xs)' }}>
        <div style={{ fontWeight: 600, color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Ceklist Algoritma Google 2026
        </div>

        {/* 1. Target Kata */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {metrics.wordCount >= 350 && metrics.wordCount <= 500 ? (
              <CheckCircle size={14} style={{ color: 'var(--color-success-fg)' }} />
            ) : metrics.wordCount >= 300 && metrics.wordCount <= 550 ? (
              <AlertTriangle size={14} style={{ color: 'var(--color-attention-fg)' }} />
            ) : (
              <XCircle size={14} style={{ color: 'var(--color-danger-fg)' }} />
            )}
            <span>Zona Kata Berita (350 - 500 kata)</span>
          </div>
          <span style={{ fontWeight: 600 }}>{metrics.wordCount} kata</span>
        </div>

        {/* 2. Lead 5W1H */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {metrics.leadWords >= 35 && metrics.leadWords <= 55 ? (
              <CheckCircle size={14} style={{ color: 'var(--color-success-fg)' }} />
            ) : metrics.leadWords > 0 ? (
              <AlertTriangle size={14} style={{ color: 'var(--color-attention-fg)' }} />
            ) : (
              <XCircle size={14} style={{ color: 'var(--color-danger-fg)' }} />
            )}
            <span>Lead 5W1H Paragraf 1 (Ideal 40-50 kata)</span>
          </div>
          <span style={{ fontWeight: 600 }}>{metrics.leadWords} kata</span>
        </div>

        {/* 3. Sub-judul H2 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {metrics.h2Count >= 2 ? (
              <CheckCircle size={14} style={{ color: 'var(--color-success-fg)' }} />
            ) : (
              <AlertTriangle size={14} style={{ color: 'var(--color-attention-fg)' }} />
            )}
            <span>Sub-judul H2 (Minimal 2-3 H2)</span>
          </div>
          <span style={{ fontWeight: 600 }}>{metrics.h2Count} H2</span>
        </div>

        {/* 4. Kutipan Narsum */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {metrics.quotesCount >= 2 ? (
              <CheckCircle size={14} style={{ color: 'var(--color-success-fg)' }} />
            ) : (
              <AlertTriangle size={14} style={{ color: 'var(--color-attention-fg)' }} />
            )}
            <span>Kutipan Langsung Narsum (Minimal 2)</span>
          </div>
          <span style={{ fontWeight: 600 }}>{metrics.quotesCount} kutipan</span>
        </div>

        {/* 5. Keramahan Layar HP (Maks 3 kalimat/paragraf) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {metrics.mobileFriendly ? (
              <CheckCircle size={14} style={{ color: 'var(--color-success-fg)' }} />
            ) : (
              <XCircle size={14} style={{ color: 'var(--color-danger-fg)' }} />
            )}
            <span>Kerapatan Mobile (Maks 3 kalimat/paragraf)</span>
          </div>
          <span style={{ fontWeight: 600, color: metrics.mobileFriendly ? 'inherit' : 'var(--color-danger-fg)' }}>
            {metrics.mobileFriendly ? 'Lolos' : `${metrics.violatingParas.length} paragraf kepanjangan`}
          </span>
        </div>

        {/* 6. Komposisi Jurnalistik (FACT, CONTEXT, OPINI) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {metrics.hasFullComposition ? (
              <CheckCircle size={14} style={{ color: 'var(--color-success-fg)' }} />
            ) : (
              <AlertTriangle size={14} style={{ color: 'var(--color-attention-fg)' }} />
            )}
            <span>Komposisi Jurnalistik (Fakta, Konteks, Opini)</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <Badge variant={metrics.factCount > 0 ? 'pass' : 'neutral'} style={{ fontSize: '10px', padding: '1px 5px' }}>
              FACT: {metrics.factCount}
            </Badge>
            <Badge variant={metrics.contextCount > 0 ? 'info' : 'neutral'} style={{ fontSize: '10px', padding: '1px 5px' }}>
              CTX: {metrics.contextCount}
            </Badge>
            <Badge variant={metrics.opiniCount > 0 ? 'warn' : 'neutral'} style={{ fontSize: '10px', padding: '1px 5px' }}>
              OPINI: {metrics.opiniCount}
            </Badge>
          </div>
        </div>
      </div>

      {/* Peringatan Kalimat Berlebih di Layar HP */}
      {metrics.violatingParas.length > 0 && (
        <div style={{
          backgroundColor: 'var(--color-canvas-subtle)',
          borderLeft: '3px solid var(--color-attention-fg)',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '11px',
          color: 'var(--color-fg-muted)'
        }}>
          ⚠️ <strong>Catatan Mobile:</strong> Paragraf {metrics.violatingParas.map(p => `#${p.index}`).join(', ')} memiliki lebih dari 3 kalimat. Pecah menjadi paragraf baru agar pembaca di ponsel tidak pusing.
        </div>
      )}
    </div>
  );
}

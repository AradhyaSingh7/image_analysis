import CompareTable from './CompareTable';
import './views.css';

/* ── Shared components ──────────────────────────────────────────── */

function AnalysisModeBadge({ mode }) {
  const isChart = mode === 'chart';
  const color = isChart ? '#4ade80' : '#60a5fa';
  const label = isChart ? '◈ Chart WB' : '◎ Gray World';
  return (
    <span className="verdict-chip" style={{
      background: `${color}15`,
      border: `1px solid ${color}40`,
      color,
      fontSize: '0.55rem',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

const VERDICT_COLOR = {
  'neutral':                     '#4ade80',
  'warm (excess red, deficit blue)': '#fb923c',
  'cool (deficit red, excess blue)': '#60a5fa',
  'slightly warm (excess red)':  '#fbbf24',
  'slightly cool (excess blue)': '#93c5fd',
  'mixed':                       '#c084fc',
  'insufficient data':           '#94a3b8',
};

function VerdictBadge({ verdict }) {
  const color = VERDICT_COLOR[verdict] ?? '#94a3b8';
  return (
    <span className="verdict-chip" style={{
      background: `${color}15`,
      border: `1px solid ${color}40`,
      color,
      fontSize: '0.58rem',
      whiteSpace: 'nowrap',
      maxWidth: 200,
      textAlign: 'center',
    }}>
      {verdict ?? '—'}
    </span>
  );
}

/** CCT colour temperature pill with a warm-to-cool gradient label */
function CctPill({ cct }) {
  if (cct == null) return null;
  // Map CCT to a colour: 2500 K = amber, 6500 K = white, 10000 K = blue-ish
  const warm = { r: 255, g: 170, b: 80 };
  const neutral = { r: 255, g: 245, b: 235 };
  const cool = { r: 160, g: 200, b: 255 };

  const t = Math.min(1, Math.max(0, (cct - 2500) / (9000 - 2500)));
  const interp = (a, b, x) => Math.round(a + (b - a) * x);
  const r = t < 0.5 ? interp(warm.r, neutral.r, t * 2) : interp(neutral.r, cool.r, (t - 0.5) * 2);
  const g = t < 0.5 ? interp(warm.g, neutral.g, t * 2) : interp(neutral.g, cool.g, (t - 0.5) * 2);
  const b = t < 0.5 ? interp(warm.b, neutral.b, t * 2) : interp(neutral.b, cool.b, (t - 0.5) * 2);
  const color = `rgb(${r},${g},${b})`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{
        fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
        color, lineHeight: 1, textShadow: `0 0 12px ${color}60`,
      }}>
        {Math.round(cct).toLocaleString()} K
      </span>
      <span style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
        COLOR TEMP
      </span>
    </div>
  );
}

/** RG / BG ratio visual: centred bar showing deviation from 1.0 */
function RatioBar({ label, ratio, color }) {
  if (ratio == null) return null;
  const error = (ratio - 1.0) * 100; // % deviation
  const maxErr = 20; // display range
  const clampedErr = Math.min(maxErr, Math.max(-maxErr, error));
  const pct = (clampedErr / maxErr) * 50; // ‑50 to +50
  const positive = pct >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}>
        <span style={{ color: 'var(--text-tertiary)', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
          {ratio.toFixed(4)} ({error >= 0 ? '+' : ''}{error.toFixed(1)}%)
        </span>
      </div>
      <div style={{
        position: 'relative', height: 8,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 999,
      }}>
        {/* Centre marker */}
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.15)', transform: 'translateX(-50%)' }} />
        {/* Fill */}
        <div style={{
          position: 'absolute',
          left: positive ? '50%' : `${50 + pct}%`,
          top: 1, bottom: 1,
          width: `${Math.abs(pct)}%`,
          minWidth: 2,
          background: color,
          borderRadius: 999,
          boxShadow: `0 0 6px ${color}60`,
          transition: 'width 0.4s ease, left 0.4s ease',
        }} />
      </div>
    </div>
  );
}

/* ── Chart-mode components (existing) ───────────────────────────── */

/** Per-patch neutral swatch table */
function NeutralSwatches({ patches, color, label }) {
  if (!patches?.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: '0.6rem', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.06em', color }}>
        {label}
      </span>
      {patches.map((p, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 8px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.62rem',
          fontFamily: 'var(--font-mono)',
          gap: 8,
        }}>
          {/* Swatch */}
          <div style={{
            width: 14, height: 14, borderRadius: 3, flexShrink: 0,
            background: `rgb(${Math.round(p.r_val)},${Math.round(p.g_val)},${Math.round(p.b_val)})`,
            border: '1px solid rgba(255,255,255,0.1)',
          }} />
          <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{p.patch_name}</span>
          <span style={{ color: 'var(--text-tertiary)' }}>R/G: <span style={{ color }}>{p.rg_ratio.toFixed(3)}</span></span>
          <span style={{ color: 'var(--text-tertiary)' }}>B/G: <span style={{ color }}>{p.bg_ratio.toFixed(3)}</span></span>
        </div>
      ))}
    </div>
  );
}

function ChartWBView({ refData, testData }) {
  const refColor = 'var(--color-ref)';
  const testColor = 'var(--color-test)';

  return (
    <>
      {/* Hero: CCT + verdict */}
      <div className="metric-view__hero" style={{ flexWrap: 'wrap', gap: 24 }}>
        <div className="hero-stat hero-stat--ref">
          <span className="hero-stat__label">Reference</span>
          <CctPill cct={refData.estimated_cct_K} />
          <VerdictBadge verdict={refData.wb_verdict} />
        </div>

        <div className="hero-divider">
          <div className="hero-divider__line" />
          <span className="hero-divider__vs">VS</span>
          <div className="hero-divider__line" />
        </div>

        <div className="hero-stat hero-stat--test">
          <span className="hero-stat__label">Test</span>
          <CctPill cct={testData.estimated_cct_K} />
          <VerdictBadge verdict={testData.wb_verdict} />
        </div>
      </div>

      {/* Ratio deviation bars */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 12, padding: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius-md)',
      }}>
        <span className="metric-view__section-label">R/G channel ratio deviation (Reference)</span>
        <RatioBar label="R/G ratio" ratio={refData.mean_rg_ratio} color={refColor} />
        <RatioBar label="B/G ratio" ratio={refData.mean_bg_ratio} color={refColor} />

        <span className="metric-view__section-label" style={{ marginTop: 4 }}>R/G channel ratio deviation (Test)</span>
        <RatioBar label="R/G ratio" ratio={testData.mean_rg_ratio} color={testColor} />
        <RatioBar label="B/G ratio" ratio={testData.mean_bg_ratio} color={testColor} />
      </div>

      {/* Numeric table */}
      <CompareTable rows={[
        { label: 'Mean R/G ratio',    refValue: refData.mean_rg_ratio,  testValue: testData.mean_rg_ratio,  decimals: 4 },
        { label: 'Mean B/G ratio',    refValue: refData.mean_bg_ratio,  testValue: testData.mean_bg_ratio,  decimals: 4 },
        { label: 'R/G error (%)',     refValue: refData.rg_error_pct,   testValue: testData.rg_error_pct,   decimals: 2, unit: '%', higherIsBetter: false },
        { label: 'B/G error (%)',     refValue: refData.bg_error_pct,   testValue: testData.bg_error_pct,   decimals: 2, unit: '%', higherIsBetter: false },
        { label: 'Est. CCT (K)',      refValue: refData.estimated_cct_K, testValue: testData.estimated_cct_K, decimals: 0, unit: 'K' },
      ]} />

      {/* Per-patch swatches side by side */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        padding: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius-md)',
      }}>
        <NeutralSwatches patches={refData.per_patch} color={refColor} label="Reference neutral patches" />
        <NeutralSwatches patches={testData.per_patch} color={testColor} label="Test neutral patches" />
      </div>

      <p className="metric-view__hint">
        White balance is measured on the 6 neutral gray patches of the ColorChecker. Perfect WB means
        R/G and B/G ratios equal 1.0. R/G &gt; 1 → warm; B/G &gt; 1 → cool. CCT is a rough proxy
        estimated from the R/B ratio (valid ≈ 2500 K–10 000 K).
      </p>
    </>
  );
}

/* ── Generic-mode components (new) ──────────────────────────────── */

function GenericStat({ label, value, unit = '' }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '5px 8px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: 'var(--radius-sm)',
      fontSize: '0.62rem',
    }}>
      <span style={{ color: 'var(--text-tertiary)', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
        {typeof value === 'number' ? value.toFixed(2) : value}{unit}
      </span>
    </div>
  );
}

function ChannelBar({ r, g, b, color, label }) {
  const max = 255;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: '0.6rem', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.06em', color }}>
        {label}
      </span>
      {[
        { ch: 'R', val: r, clr: '#f87171' },
        { ch: 'G', val: g, clr: '#4ade80' },
        { ch: 'B', val: b, clr: '#60a5fa' },
      ].map(({ ch, val, clr }) => (
        <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 14, fontSize: '0.55rem', fontWeight: 700, color: clr, fontFamily: 'var(--font-mono)' }}>{ch}</span>
          <div style={{
            flex: 1, height: 8, borderRadius: 999, overflow: 'hidden',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: `${(val / max) * 100}%`, height: '100%',
              background: clr, borderRadius: 999, opacity: 0.7,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ width: 40, fontSize: '0.55rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textAlign: 'right' }}>
            {val.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CorrectionGains({ gains, color, label }) {
  if (!gains) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.55rem', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em', color }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 8, fontSize: '0.58rem', fontFamily: 'var(--font-mono)' }}>
        <span style={{ color: '#f87171' }}>R×{gains.r_gain.toFixed(3)}</span>
        <span style={{ color: '#4ade80' }}>G×{gains.g_gain.toFixed(3)}</span>
        <span style={{ color: '#60a5fa' }}>B×{gains.b_gain.toFixed(3)}</span>
      </div>
    </div>
  );
}

function GenericWBView({ refData, testData }) {
  const refColor = 'var(--color-ref)';
  const testColor = 'var(--color-test)';

  return (
    <>
      {/* Hero: CCT + cast */}
      <div className="metric-view__hero" style={{ flexWrap: 'wrap', gap: 24 }}>
        <div className="hero-stat hero-stat--ref">
          <span className="hero-stat__label">Reference</span>
          <CctPill cct={refData.estimated_cct_K} />
          <VerdictBadge verdict={refData.estimated_cast} />
        </div>

        <div className="hero-divider">
          <div className="hero-divider__line" />
          <span className="hero-divider__vs">VS</span>
          <div className="hero-divider__line" />
        </div>

        <div className="hero-stat hero-stat--test">
          <span className="hero-stat__label">Test</span>
          <CctPill cct={testData.estimated_cct_K} />
          <VerdictBadge verdict={testData.estimated_cast} />
        </div>
      </div>

      {/* Channel bars */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
        padding: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius-md)',
      }}>
        <ChannelBar r={refData.mean_r} g={refData.mean_g} b={refData.mean_b} color={refColor} label="Reference RGB means" />
        <ChannelBar r={testData.mean_r} g={testData.mean_g} b={testData.mean_b} color={testColor} label="Test RGB means" />
      </div>

      {/* Ratio bars */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 12, padding: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius-md)',
      }}>
        <span className="metric-view__section-label">Gray World ratio deviation (Reference)</span>
        <RatioBar label="R/G ratio" ratio={refData.rg_ratio} color={refColor} />
        <RatioBar label="B/G ratio" ratio={refData.bg_ratio} color={refColor} />

        <span className="metric-view__section-label" style={{ marginTop: 4 }}>Gray World ratio deviation (Test)</span>
        <RatioBar label="R/G ratio" ratio={testData.rg_ratio} color={testColor} />
        <RatioBar label="B/G ratio" ratio={testData.bg_ratio} color={testColor} />
      </div>

      {/* Correction gains */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
        padding: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius-md)',
      }}>
        <CorrectionGains gains={refData.gray_world_correction} color={refColor} label="Ref Gray World correction" />
        <CorrectionGains gains={testData.gray_world_correction} color={testColor} label="Test Gray World correction" />
      </div>

      <CompareTable rows={[
        { label: 'Mean R',     refValue: refData.mean_r,  testValue: testData.mean_r,  decimals: 2 },
        { label: 'Mean G',     refValue: refData.mean_g,  testValue: testData.mean_g,  decimals: 2 },
        { label: 'Mean B',     refValue: refData.mean_b,  testValue: testData.mean_b,  decimals: 2 },
        { label: 'R/G ratio',  refValue: refData.rg_ratio, testValue: testData.rg_ratio, decimals: 4 },
        { label: 'B/G ratio',  refValue: refData.bg_ratio, testValue: testData.bg_ratio, decimals: 4 },
        { label: 'Est. CCT (K)', refValue: refData.estimated_cct_K, testValue: testData.estimated_cct_K, decimals: 0, unit: 'K' },
      ]} />

      <p className="metric-view__hint">
        Gray World white balance estimation — no ColorChecker detected. The Gray World assumption
        says a well-balanced image has equal mean R, G, B values. R/G &gt; 1 → warm; B/G &gt; 1 → cool.
        Correction gains show the per-channel multipliers needed to achieve neutral balance.
      </p>
    </>
  );
}

/* ── Main export ────────────────────────────────────────────────── */

export default function WhiteBalanceView({ refData, testData }) {
  if (!refData || !testData) return null;

  const refMode = refData.analysis_mode;
  const testMode = testData.analysis_mode;
  const isChart = refMode === 'chart' && testMode === 'chart';

  return (
    <div className="metric-view">
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <AnalysisModeBadge mode={refMode} />
        {refMode !== testMode && <AnalysisModeBadge mode={testMode} />}
      </div>

      {isChart
        ? <ChartWBView refData={refData} testData={testData} />
        : <GenericWBView refData={refData} testData={testData} />
      }
    </div>
  );
}

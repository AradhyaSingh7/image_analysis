import './views.css';

/* ── Shared components ──────────────────────────────────────────── */

function AnalysisModeBadge({ mode }) {
  const isChart = mode === 'chart';
  const color = isChart ? '#4ade80' : '#60a5fa';
  const label = isChart ? '◈ Chart Gamma' : '◎ Generic Stats';
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

/* ── Chart-mode components (existing) ───────────────────────────── */

/** Tiny SVG ring gauge for gamma */
function GammaArc({ gamma, color }) {
  // Gamma expected range: 0.2 – 0.8 (typical camera encoding)
  const min = 0.2, max = 0.8;
  const pct = Math.min(1, Math.max(0, (gamma - min) / (max - min)));
  const r = 40;
  const cx = 50, cy = 50;

  // 220° gauge arc, open at the bottom.
  // Arc starts at 160° (lower-left) and sweeps 220° clockwise to 380° / 20° (lower-right).
  const startAngle = 160; // degrees (0° = 3 o'clock)
  const trackDeg   = 220; // degrees of drawn arc

  const toRad = (d) => (d * Math.PI) / 180;
  const arcX  = (a) => cx + r * Math.cos(toRad(a));
  const arcY  = (a) => cy + r * Math.sin(toRad(a));

  const endAngle = startAngle + trackDeg;
  const sX = arcX(startAngle), sY = arcY(startAngle);
  const eX = arcX(endAngle),   eY = arcY(endAngle);

  // large-arc flag = 1 because 220° > 180°, sweep = 1 (clockwise)
  const arcPath = `M ${sX.toFixed(3)} ${sY.toFixed(3)} A ${r} ${r} 0 1 1 ${eX.toFixed(3)} ${eY.toFixed(3)}`;

  // Arc length of the 220° track
  const totalLength  = (trackDeg / 360) * 2 * Math.PI * r;
  const filledLength = totalLength * pct;

  return (
    <svg width="120" height="100" viewBox="0 0 100 100" aria-hidden="true">
      {/* Background track — full 220° arc */}
      <path
        d={arcPath}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Progress fill — identical path, dash controls visible portion */}
      {pct > 0 && (
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${filledLength.toFixed(3)} ${totalLength.toFixed(3)}`}
          style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
        />
      )}
      {/* Value label */}
      <text x={cx} y={cy + 2} textAnchor="middle" fontSize="14" fontWeight="800"
        fontFamily="var(--font-mono)" fill={color}>
        {gamma != null ? gamma.toFixed(3) : '—'}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="6.5" fontWeight="600"
        fill="rgba(255,255,255,0.35)" letterSpacing="0.08em">
        GAMMA
      </text>
    </svg>
  );
}

/** Tonal curve visualiser using the 6 neutral patch points */
function TonalCurve({ neutralPatches, color, label }) {
  if (!neutralPatches || neutralPatches.length === 0) return null;

  const W = 260, H = 120;
  const pad = 10;

  // Sort by reference_L descending (white → black)
  const sorted = [...neutralPatches].sort((a, b) => b.reference_L - a.reference_L);

  const pts = sorted.map((p) => {
    const x = pad + (p.reference_L / 100) * (W - 2 * pad);
    const y = H - pad - p.pixel_val_norm * (H - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Ideal diagonal
  const idealPts = [
    `${pad},${H - pad}`,
    `${W - pad},${pad}`,
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.6rem', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
        {label}
      </span>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
        style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}
        aria-label={`Tonal curve for ${label}`}>
        {/* Grid lines */}
        {[25, 50, 75].map(v => {
          const x = pad + (v / 100) * (W - 2 * pad);
          const y = H - pad - (v / 100) * (H - 2 * pad);
          return (
            <g key={v}>
              <line x1={x} y1={pad} x2={x} y2={H - pad} stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3" />
              <line x1={pad} y1={y} x2={W - pad} y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3" />
            </g>
          );
        })}
        {/* Ideal line */}
        <polyline points={idealPts.join(' ')} fill="none"
          stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3,3" />
        {/* Measured curve */}
        <polyline points={pts.join(' ')} fill="none"
          stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 3px ${color}60)` }} />
        {/* Dots */}
        {sorted.map((p, i) => {
          const x = pad + (p.reference_L / 100) * (W - 2 * pad);
          const y = H - pad - p.pixel_val_norm * (H - 2 * pad);
          return <circle key={i} cx={x} cy={y} r={3} fill={color} opacity={0.9} />;
        })}
        {/* Axis labels */}
        <text x={pad} y={H - 1} fontSize="5" fill="rgba(255,255,255,0.25)">Dark</text>
        <text x={W - pad} y={H - 1} fontSize="5" textAnchor="end" fill="rgba(255,255,255,0.25)">Bright</text>
      </svg>
    </div>
  );
}

function VerdictBadge({ verdict }) {
  const isNormal = verdict?.includes('normal');
  const isLower  = verdict?.includes('lower');
  const color = isNormal ? '#4ade80' : isLower ? '#facc15' : '#f87171';
  return (
    <span className="verdict-chip" style={{
      background: `${color}15`,
      border: `1px solid ${color}40`,
      color,
      fontSize: '0.58rem',
      whiteSpace: 'nowrap',
    }}>
      {verdict ?? '—'}
    </span>
  );
}

function ChartTonalView({ refData, testData }) {
  return (
    <>
      {/* Hero: gamma arcs */}
      <div className="metric-view__hero">
        <div className="hero-stat hero-stat--ref">
          <span className="hero-stat__label">Reference</span>
          <div className="hero-stat__gauge">
            <GammaArc gamma={refData.estimated_gamma} color="var(--color-ref)" />
          </div>
          <VerdictBadge verdict={refData.tonal_verdict} />
        </div>

        <div className="hero-divider">
          <div className="hero-divider__line" />
          <span className="hero-divider__vs">VS</span>
          <div className="hero-divider__line" />
        </div>

        <div className="hero-stat hero-stat--test">
          <span className="hero-stat__label">Test</span>
          <div className="hero-stat__gauge">
            <GammaArc gamma={testData.estimated_gamma} color="var(--color-test)" />
          </div>
          <VerdictBadge verdict={testData.tonal_verdict} />
        </div>
      </div>

      {/* Tonal curves */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
        padding: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius-md)',
        justifyItems: 'center',
      }}>
        <TonalCurve neutralPatches={refData.neutral_patches} color="var(--color-ref)" label="Reference tonal curve" />
        <TonalCurve neutralPatches={testData.neutral_patches} color="var(--color-test)" label="Test tonal curve" />
      </div>

      {/* Neutral patch table */}
      <div style={{
        padding: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius-md)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <span className="metric-view__section-label">Neutral patch measurements</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: '4px 12px', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
          {/* Header */}
          {['Patch', 'Ref L*', 'Meas L* (REF)', 'Meas L* (TEST)', 'Pixel (REF)'].map(h => (
            <span key={h} style={{ color: 'var(--text-tertiary)', fontSize: '0.54rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
          {/* Rows */}
          {(refData.neutral_patches ?? []).map((rp, i) => {
            const tp = testData.neutral_patches?.[i];
            return (
              <>
                <span key={`n${i}`} style={{ color: 'var(--text-secondary)' }}>{rp.patch_name}</span>
                <span key={`rl${i}`} style={{ color: 'var(--text-tertiary)' }}>{rp.reference_L.toFixed(1)}</span>
                <span key={`ml${i}`} style={{ color: 'var(--color-ref)' }}>{rp.measured_L.toFixed(1)}</span>
                <span key={`tl${i}`} style={{ color: 'var(--color-test)' }}>{tp?.measured_L.toFixed(1) ?? '—'}</span>
                <span key={`pv${i}`} style={{ color: 'var(--text-secondary)' }}>{rp.pixel_val_norm.toFixed(3)}</span>
              </>
            );
          })}
        </div>
      </div>

      {/* Fit quality */}
      <div className="info-row">
        <div className="info-pill">
          <span className="info-pill__key">REF R²</span>
          <span className="info-pill__val">{refData.r_squared?.toFixed(4) ?? '—'}</span>
        </div>
        <div className="info-pill">
          <span className="info-pill__key">TEST R²</span>
          <span className="info-pill__val">{testData.r_squared?.toFixed(4) ?? '—'}</span>
        </div>
      </div>

      <p className="metric-view__hint">
        Gamma is fitted from 6 neutral gray patches (white → black). A value near 0.45 means
        standard sRGB-like encoding (display gamma ≈ 2.2). The tonal curve shows measured pixel
        brightness vs reference L* — a perfect camera lies on the dashed diagonal.
      </p>
    </>
  );
}

/* ── Generic-mode components (new) ──────────────────────────────── */

function BrightnessGauge({ value, label, color }) {
  const pct = Math.min((value / 255) * 100, 100);
  const verdict = value < 60 ? 'Dark' : value < 100 ? 'Low' : value < 170 ? 'Balanced' : value < 210 ? 'Bright' : 'Overexposed';
  const vColor = value < 60 ? '#60a5fa' : value < 100 ? '#93c5fd' : value < 170 ? '#4ade80' : value < 210 ? '#facc15' : '#f87171';
  return (
    <div className="delta-gauge">
      <div className="delta-gauge__ring">
        <svg viewBox="0 0 80 80" width="80" height="80">
          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="32" fill="none"
            stroke={color} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * (2 * Math.PI * 32)} ${2 * Math.PI * 32}`}
            strokeDashoffset={2 * Math.PI * 32 * 0.25}
            style={{ transition: 'stroke-dasharray 800ms ease', opacity: 0.75 }}
          />
          <text x="40" y="43" textAnchor="middle" fill={color} fontSize="12" fontWeight="700" fontFamily="var(--font-mono)">
            {value.toFixed(1)}
          </text>
        </svg>
      </div>
      <span className="delta-gauge__label">{label}</span>
      <span className="delta-gauge__verdict" style={{ color: vColor }}>{verdict}</span>
    </div>
  );
}

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

function ZoneBar({ shadow, midtone, highlight }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.55rem', fontWeight: 650, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Tonal distribution
      </span>
      <div style={{
        display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ width: `${shadow}%`, background: '#3b82f6', transition: 'width 0.4s ease' }} title={`Shadows: ${shadow.toFixed(1)}%`} />
        <div style={{ width: `${midtone}%`, background: '#a78bfa', transition: 'width 0.4s ease' }} title={`Midtones: ${midtone.toFixed(1)}%`} />
        <div style={{ width: `${highlight}%`, background: '#fbbf24', transition: 'width 0.4s ease' }} title={`Highlights: ${highlight.toFixed(1)}%`} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        <span>◼ Shadows {shadow.toFixed(1)}%</span>
        <span>◼ Midtones {midtone.toFixed(1)}%</span>
        <span>◼ Highlights {highlight.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function GenericTonalPanel({ data, label, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
      <span style={{ fontSize: '0.6rem', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.06em', color }}>
        {label}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <GenericStat label="Brightness σ" value={data.brightness_std} />
        <GenericStat label="Michelson contrast" value={data.contrast_michelson} />
        <GenericStat label="RMS contrast" value={data.rms_contrast} />
        <GenericStat label="Histogram entropy" value={data.histogram_entropy} unit=" bits" />
        <GenericStat label="Dynamic range" value={data.dynamic_range_estimate} />
      </div>
      <ZoneBar shadow={data.shadow_pct} midtone={data.midtone_pct} highlight={data.highlight_pct} />
    </div>
  );
}

function GenericTonalView({ refData, testData }) {
  return (
    <>
      <div className="metric-view__gauges">
        <BrightnessGauge value={refData.mean_brightness} label="Ref Brightness" color="var(--color-ref)" />
        <BrightnessGauge value={testData.mean_brightness} label="Test Brightness" color="var(--color-test)" />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
        padding: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius-md)',
      }}>
        <GenericTonalPanel data={refData} label="Reference" color="var(--color-ref)" />
        <GenericTonalPanel data={testData} label="Test" color="var(--color-test)" />
      </div>

      <p className="metric-view__hint">
        Generic tonal analysis — no ColorChecker detected. Brightness is measured on the grayscale
        image (0–255). Michelson contrast = (max−min)/(max+min). Histogram entropy measures tonal
        distribution complexity (higher = more spread). Shadow/midtone/highlight zones show pixel distribution.
      </p>
    </>
  );
}

/* ── Main export ────────────────────────────────────────────────── */

export default function TonalResponseView({ refData, testData }) {
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
        ? <ChartTonalView refData={refData} testData={testData} />
        : <GenericTonalView refData={refData} testData={testData} />
      }
    </div>
  );
}

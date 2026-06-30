import CompareTable from './CompareTable';
import './views.css';

/* ── Shared components ──────────────────────────────────────────── */

function AnalysisModeBadge({ mode }) {
  const isChart = mode === 'chart';
  const color = isChart ? '#4ade80' : '#60a5fa';
  const label = isChart ? '◈ Chart ΔE' : '◎ Generic Stats';
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

function DeltaEGauge({ value, label, color }) {
  const pct = Math.min((value / 10) * 100, 100);
  const verdict = value < 2 ? 'Excellent' : value < 5 ? 'Good' : 'Needs Work';
  const vColor = value < 2 ? '#4ade80' : value < 5 ? '#facc15' : '#f87171';
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
            {value.toFixed(2)}
          </text>
        </svg>
      </div>
      <span className="delta-gauge__label">{label}</span>
      <span className="delta-gauge__verdict" style={{ color: vColor }}>{verdict}</span>
    </div>
  );
}

function ChartColorView({ refData, testData }) {
  const worstRef = [...refData.per_patch].sort((a, b) => b.delta_e_2000 - a.delta_e_2000).slice(0, 5);

  return (
    <>
      <div className="metric-view__gauges">
        <DeltaEGauge value={refData.mean_delta_e} label="Ref Mean ΔE" color="var(--color-ref)" />
        <DeltaEGauge value={testData.mean_delta_e} label="Test Mean ΔE" color="var(--color-test)" />
      </div>

      <CompareTable rows={[
        { label: 'Mean ΔE2000', refValue: refData.mean_delta_e, testValue: testData.mean_delta_e, higherIsBetter: false, decimals: 3 },
        { label: 'Max ΔE2000', refValue: refData.max_delta_e, testValue: testData.max_delta_e, higherIsBetter: false, decimals: 3 },
        { label: 'Patches ΔE < 2', refValue: refData.patches_under_2, testValue: testData.patches_under_2, higherIsBetter: true, decimals: 0 },
        { label: 'Patches ΔE < 5', refValue: refData.patches_under_5, testValue: testData.patches_under_5, higherIsBetter: true, decimals: 0 },
      ]} />

      <div className="metric-view__section-label">Worst Patches (Reference)</div>
      <div className="patch-list">
        {worstRef.map((p) => (
          <div className="patch-item" key={p.patch_id}>
            <span className="patch-item__name">{p.patch_name}</span>
            <span className={`patch-item__de ${p.delta_e_2000 < 2 ? 'text-good' : p.delta_e_2000 < 5 ? 'text-warn' : 'text-bad'}`}>
              ΔE {p.delta_e_2000.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <p className="metric-view__hint">
        ΔE &lt; 2 = imperceptible · ΔE 2–5 = trained eye only · ΔE &gt; 5 = clearly visible
      </p>
    </>
  );
}

/* ── Generic-mode components (new) ──────────────────────────────── */

function ColorfulnessGauge({ value, label, color }) {
  // Hasler & Süsstrunk scale: 0 = monochrome, ~100+ = very colourful
  const pct = Math.min((value / 120) * 100, 100);
  const verdict = value < 15 ? 'Low' : value < 45 ? 'Moderate' : value < 80 ? 'Vibrant' : 'Very Vivid';
  const vColor = value < 15 ? '#94a3b8' : value < 45 ? '#facc15' : value < 80 ? '#4ade80' : '#f472b6';
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

function DominantColorSwatches({ colors, label, color }) {
  if (!colors?.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: '0.6rem', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.06em', color }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {colors.map((c, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: `rgb(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]})`,
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: `0 0 8px rgba(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]},0.3)`,
            }} />
            <span style={{ fontSize: '0.5rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {c.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CastBadge({ cast }) {
  const colorMap = {
    'warm': '#fb923c',
    'cool': '#60a5fa',
    'neutral': '#4ade80',
  };
  const c = colorMap[cast] ?? '#94a3b8';
  return (
    <span className="verdict-chip" style={{
      background: `${c}15`, border: `1px solid ${c}40`, color: c,
      fontSize: '0.55rem', whiteSpace: 'nowrap',
    }}>
      {cast ?? '—'}
    </span>
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

function GenericColorPanel({ data, label, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
      <span style={{ fontSize: '0.6rem', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.06em', color }}>
        {label}
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <GenericStat label="R mean" value={data.channel_means.R} />
        <GenericStat label="G mean" value={data.channel_means.G} />
        <GenericStat label="B mean" value={data.channel_means.B} />
        <GenericStat label="Mean Hue" value={data.hsv_stats.mean_hue} unit="°" />
        <GenericStat label="Mean Saturation" value={data.hsv_stats.mean_saturation} />
        <GenericStat label="Sat σ" value={data.hsv_stats.std_saturation} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: '0.55rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Cast:</span>
        <CastBadge cast={data.color_cast} />
      </div>

      <DominantColorSwatches colors={data.dominant_colors} label="Dominant colours" color={color} />
    </div>
  );
}

function GenericColorView({ refData, testData }) {
  return (
    <>
      <div className="metric-view__gauges">
        <ColorfulnessGauge value={refData.colorfulness} label="Ref Colorfulness" color="var(--color-ref)" />
        <ColorfulnessGauge value={testData.colorfulness} label="Test Colorfulness" color="var(--color-test)" />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
        padding: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius-md)',
      }}>
        <GenericColorPanel data={refData} label="Reference" color="var(--color-ref)" />
        <GenericColorPanel data={testData} label="Test" color="var(--color-test)" />
      </div>

      <p className="metric-view__hint">
        Generic colour analysis — no ColorChecker detected. Colorfulness uses the Hasler &amp; Süsstrunk
        metric (higher = more colourful). Dominant colours extracted via k-means clustering.
      </p>
    </>
  );
}

/* ── Main export ────────────────────────────────────────────────── */

export default function ColorView({ refData, testData }) {
  if (!refData || !testData) {
    return (
      <div className="metric-view metric-view--empty">
        <div className="empty-state">
          <span className="empty-state__icon">◑</span>
          <h3 className="empty-state__title">No Data</h3>
          <p className="empty-state__desc">
            Color analysis data is not available for one or both images.
          </p>
        </div>
      </div>
    );
  }

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
        ? <ChartColorView refData={refData} testData={testData} />
        : <GenericColorView refData={refData} testData={testData} />
      }
    </div>
  );
}

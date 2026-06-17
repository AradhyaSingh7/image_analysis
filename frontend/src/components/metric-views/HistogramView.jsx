import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import './views.css';

/** Down-sample 256 bins → N bins for a cleaner chart */
function downsample(hist, buckets = 64) {
  const step = Math.floor(hist.length / buckets);
  const result = [];
  for (let i = 0; i < buckets; i++) {
    const slice = hist.slice(i * step, (i + 1) * step);
    const sum = slice.reduce((a, b) => a + b, 0);
    result.push({ x: i * step, v: sum });
  }
  return result;
}

/** Merge ref + test bins into a single array for dual-area chart */
function mergeHistograms(refHist, testHist, buckets = 64) {
  const refDs = downsample(refHist, buckets);
  const testDs = downsample(testHist, buckets);
  return refDs.map((d, i) => ({
    x: d.x,
    ref: d.v,
    test: testDs[i]?.v ?? 0,
  }));
}

/** Compute peak, mean, median from a 256-bin histogram */
function histStats(hist) {
  const total = hist.reduce((a, b) => a + b, 0);
  if (total === 0) return { peak: 0, mean: 0, median: 0 };

  let sum = 0;
  let median = 0;
  let peakIdx = 0;
  let peakVal = 0;

  for (let i = 0; i < hist.length; i++) {
    sum += hist[i] * i;
    if (hist[i] > peakVal) { peakVal = hist[i]; peakIdx = i; }
    if (median === 0 && hist.slice(0, i + 1).reduce((a, b) => a + b, 0) >= total / 2) {
      median = i;
    }
  }

  return { peak: peakIdx, mean: Math.round(sum / total), median };
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(14, 16, 26, 0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: '0.7rem',
      fontFamily: 'var(--font-mono)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>Lum {label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 8 }}>
          <span>{p.dataKey === 'ref' ? 'Reference' : 'Test'}</span>
          <span style={{ color: 'var(--text-primary)' }}>{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

function SingleHistogram({ hist, color, label, accentColor }) {
  const data = downsample(hist, 64).map((d) => ({ x: d.x, v: d.v }));
  const stats = histStats(hist);
  const maxV = Math.max(...data.map((d) => d.v));

  return (
    <div className="histogram-card" style={{ '--hist-color': color }}>
      <div className="histogram-card__header">
        <span className="histogram-card__label" style={{ color: accentColor }}>{label}</span>
        <div className="histogram-card__stats">
          <span className="histogram-card__stat">
            <span className="histogram-card__stat-key">Mean</span>
            <span className="histogram-card__stat-val">{stats.mean}</span>
          </span>
          <span className="histogram-card__stat">
            <span className="histogram-card__stat-key">Peak</span>
            <span className="histogram-card__stat-val">{stats.peak}</span>
          </span>
          <span className="histogram-card__stat">
            <span className="histogram-card__stat-key">Median</span>
            <span className="histogram-card__stat-val">{stats.median}</span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={accentColor} stopOpacity={0.5} />
              <stop offset="95%" stopColor={accentColor} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 9, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            ticks={[0, 64, 128, 192, 255]}
          />
          <YAxis hide domain={[0, maxV * 1.1]} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={Math.round(stats.mean / 4)} stroke={accentColor} strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.5} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={accentColor}
            strokeWidth={1.5}
            fill={`url(#grad-${label.replace(/\s/g, '')})`}
            isAnimationActive={true}
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Shadow / Midtone / Highlight zones */}
      <div className="histogram-card__zones">
        <span className="histogram-card__zone histogram-card__zone--shadow">Shadows</span>
        <span className="histogram-card__zone histogram-card__zone--mid">Midtones</span>
        <span className="histogram-card__zone histogram-card__zone--hi">Highlights</span>
      </div>
    </div>
  );
}

function OverlayHistogram({ refHist, testHist }) {
  const data = mergeHistograms(refHist, testHist, 64);
  const maxV = Math.max(...data.map((d) => Math.max(d.ref, d.test)));

  return (
    <div className="histogram-overlay">
      <div className="histogram-overlay__header">
        <span className="histogram-overlay__title">Overlay Comparison</span>
        <div className="histogram-overlay__legend">
          <span className="histogram-overlay__dot" style={{ background: '#38bdf8' }} />
          <span>Reference</span>
          <span className="histogram-overlay__dot" style={{ background: '#a78bfa', marginLeft: 8 }} />
          <span>Test</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-ref-overlay" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="grad-test-overlay" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 9, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            ticks={[0, 64, 128, 192, 255]}
          />
          <YAxis hide domain={[0, maxV * 1.1]} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="ref"
            stroke="#38bdf8"
            strokeWidth={1.5}
            fill="url(#grad-ref-overlay)"
            isAnimationActive={true}
            animationDuration={600}
          />
          <Area
            type="monotone"
            dataKey="test"
            stroke="#a78bfa"
            strokeWidth={1.5}
            fill="url(#grad-test-overlay)"
            isAnimationActive={true}
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function HistogramView({ refData, testData }) {
  const refHist = refData?.histogram;
  const testHist = testData?.histogram;

  if (!refHist || !testHist) {
    return (
      <div className="metric-view metric-view--empty">
        <div className="empty-state">
          <div className="empty-state__icon">📊</div>
          <p className="empty-state__title">No histogram data</p>
          <p className="empty-state__desc">Run analysis to generate luminance histograms.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="metric-view">
      {/* Side-by-side individual histograms */}
      <div className="histogram-grid">
        <SingleHistogram hist={refHist} label="Reference" accentColor="#38bdf8" />
        <SingleHistogram hist={testHist} label="Test" accentColor="#a78bfa" />
      </div>

      {/* Overlay comparison chart */}
      <OverlayHistogram refHist={refHist} testHist={testHist} />

      <p className="metric-view__hint">
        Luminance histogram (256 bins, grayscale). Shadows ← left; Highlights → right.
        Peaks near 0 indicate underexposure; near 255 indicate overexposure.
      </p>
    </div>
  );
}

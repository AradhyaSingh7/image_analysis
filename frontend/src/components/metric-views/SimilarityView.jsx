import './views.css';

function SimilarityRing({ value, label, max = 1, unit = '', color, decimals = 4 }) {
  const pct = Math.min((value / max) * 100, 100);
  const r = 42;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;

  const qualityLabel = pct >= 95 ? 'Excellent' : pct >= 80 ? 'Good' : pct >= 60 ? 'Fair' : 'Poor';
  const qualityColor = pct >= 95 ? '#34d399' : pct >= 80 ? '#38bdf8' : pct >= 60 ? '#fbbf24' : '#f87171';

  return (
    <div className="sim-ring">
      <svg viewBox="0 0 100 100" width="100" height="100">
        {/* Track */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        {/* Fill */}
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          strokeDashoffset={circ * 0.25}
          style={{
            transition: 'stroke-dasharray 1000ms cubic-bezier(0.34,1.56,0.64,1)',
            filter: `drop-shadow(0 0 6px ${color}70)`,
          }}
        />
        {/* Value */}
        <text x="50" y="46" textAnchor="middle" fill={color} fontSize="11" fontWeight="700" fontFamily="monospace">
          {typeof value === 'number' ? value.toFixed(decimals) : value}
        </text>
        <text x="50" y="58" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="monospace">
          {unit}
        </text>
      </svg>
      <span className="sim-ring__label">{label}</span>
      <span className="sim-ring__quality" style={{ color: qualityColor }}>{qualityLabel}</span>
    </div>
  );
}

export default function SimilarityView({ data }) {
  const ssimPct = (data.ssim * 100).toFixed(2);
  const histPct = (data.hist_correlation * 100).toFixed(2);

  return (
    <div className="metric-view">
      <div className="sim-hero">
        <span className="sim-hero__label">Overall Similarity</span>
        <span className="sim-hero__value" style={{
          background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {ssimPct}%
        </span>
        <span className="sim-hero__sublabel">SSIM Score</span>
      </div>

      <div className="sim-rings">
        <SimilarityRing
          value={data.ssim}
          label="SSIM"
          max={1}
          unit="index"
          color="#38bdf8"
          decimals={4}
        />
        <SimilarityRing
          value={data.hist_correlation}
          label="Histogram Corr."
          max={1}
          color="#a78bfa"
          unit="corr"
          decimals={4}
        />
        <SimilarityRing
          value={Math.min(data.psnr_db, 50)}
          label="PSNR"
          max={50}
          unit="dB"
          color="#34d399"
          decimals={2}
        />
      </div>

      <div className="sim-stats">
        <div className="sim-stat">
          <span className="sim-stat__key">MSE</span>
          <span className="sim-stat__val">{data.mse.toFixed(3)}</span>
          <span className="sim-stat__hint">lower = more similar</span>
        </div>
        <div className="sim-stat">
          <span className="sim-stat__key">PSNR</span>
          <span className="sim-stat__val">{data.psnr_db.toFixed(2)} dB</span>
          <span className="sim-stat__hint">higher = better fidelity</span>
        </div>
        <div className="sim-stat">
          <span className="sim-stat__key">Mean |Diff|</span>
          <span className="sim-stat__val">{data.mean_abs_diff.toFixed(3)}</span>
          <span className="sim-stat__hint">per-pixel difference</span>
        </div>
      </div>

      <p className="metric-view__hint">
        SSIM &gt; 0.95 = near-identical · PSNR &gt; 40 dB = high fidelity · MSE close to 0 = minimal pixel error
      </p>
    </div>
  );
}

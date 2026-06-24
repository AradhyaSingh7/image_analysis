import './views.css';

function SimilarityRing({ value, label, max = 1, unit = '', color, decimals = 4 }) {
  const pct = Math.min((value / max) * 100, 100);
  const r = 40;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;

  const qualityLabel = pct >= 95 ? 'Excellent' : pct >= 80 ? 'Good' : pct >= 60 ? 'Fair' : 'Poor';
  const qualityColor = pct >= 95 ? '#4ade80' : pct >= 80 ? 'var(--color-ref)' : pct >= 60 ? '#facc15' : '#f87171';

  return (
    <div className="sim-ring">
      <svg viewBox="0 0 100 100" width="96" height="96">
        {/* Track */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
        {/* Fill */}
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          strokeDashoffset={circ * 0.25}
          style={{
            transition: 'stroke-dasharray 900ms ease',
            opacity: 0.75,
          }}
        />
        {/* Value */}
        <text x="50" y="46" textAnchor="middle" fill={color} fontSize="11" fontWeight="700" fontFamily="var(--font-mono)" opacity="0.9">
          {typeof value === 'number' ? value.toFixed(decimals) : value}
        </text>
        <text x="50" y="58" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="var(--font-mono)">
          {unit}
        </text>
      </svg>
      <span className="sim-ring__label">{label}</span>
      <span className="sim-ring__quality" style={{ color: qualityColor }}>{qualityLabel}</span>
    </div>
  );
}

export default function SimilarityView({ data }) {
  // overall_similarity_pct is already 0–100
  const overallPct = typeof data.overall_similarity_pct === 'number'
    ? data.overall_similarity_pct.toFixed(2)
    : 'N/A';

  // Normalise MSE into a 0-1 similarity (lower MSE = higher similarity)
  // We cap MSE at 10000 (≈ max realistic value) for the ring display
  const mseSimilarity = Math.max(0, 1 - data.mse / 10000);

  return (
    <div className="metric-view">
      <div className="sim-hero">
        <span className="sim-hero__label">Overall Similarity</span>
        <span className="sim-hero__value" style={{
          background: 'linear-gradient(135deg, var(--color-ref), var(--color-test))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {overallPct}%
        </span>
        <span className="sim-hero__sublabel">
          Hist. Corr. × 70% + Pixel Diff. × 30%
        </span>
      </div>

      <div className="sim-rings">
        <SimilarityRing
          value={data.hist_correlation}
          label="Histogram Corr."
          max={1}
          unit="corr"
          color="var(--color-ref)"
          decimals={4}
        />
        <SimilarityRing
          value={mseSimilarity}
          label="MSE Similarity"
          max={1}
          unit="norm"
          color="var(--color-test)"
          decimals={4}
        />
        <SimilarityRing
          value={Math.min(data.psnr_db, 50)}
          label="PSNR"
          max={50}
          unit="dB"
          color="#4ade80"
          decimals={2}
        />
      </div>

      <div className="sim-stats">
        <div className="sim-stat">
          <span className="sim-stat__key">Hist. Correlation</span>
          <span className="sim-stat__val">{data.hist_correlation.toFixed(4)}</span>
          <span className="sim-stat__hint">70% weight in score</span>
        </div>
        <div className="sim-stat">
          <span className="sim-stat__key">MSE</span>
          <span className="sim-stat__val">{data.mse.toFixed(3)}</span>
          <span className="sim-stat__hint">lower = more similar</span>
        </div>
        <div className="sim-stat">
          <span className="sim-stat__key">Mean |Diff|</span>
          <span className="sim-stat__val">{data.mean_abs_diff.toFixed(3)}</span>
          <span className="sim-stat__hint">30% weight in score</span>
        </div>
        <div className="sim-stat">
          <span className="sim-stat__key">PSNR</span>
          <span className="sim-stat__val">{data.psnr_db.toFixed(2)} dB</span>
          <span className="sim-stat__hint">higher = better fidelity</span>
        </div>
      </div>

      <p className="metric-view__hint">
        Score = Hist. Corr. × 0.70 + (1 − Mean|Diff| / 255) × 0.30 · PSNR &gt; 40 dB = high fidelity · MSE close to 0 = minimal pixel error
      </p>
    </div>
  );
}

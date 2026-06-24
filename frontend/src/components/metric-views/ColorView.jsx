import CompareTable from './CompareTable';
import './views.css';

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

export default function ColorView({ refData, testData }) {
  const noChart = !refData && !testData;
  const partialChart = !refData || !testData;

  if (noChart || partialChart) {
    return (
      <div className="metric-view metric-view--empty">
        <div className="empty-state">
          <span className="empty-state__icon">◑</span>
          <h3 className="empty-state__title">Chart Not Detected</h3>
          <p className="empty-state__desc">
            Color accuracy requires a ColorChecker chart with ArUco markers in the image.
            Upload chart images to see ΔE2000 analysis.
          </p>
        </div>
      </div>
    );
  }

  const worstRef = [...refData.per_patch].sort((a, b) => b.delta_e_2000 - a.delta_e_2000).slice(0, 5);

  return (
    <div className="metric-view">
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
    </div>
  );
}

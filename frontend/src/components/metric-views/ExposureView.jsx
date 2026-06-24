import CompareTable from './CompareTable';
import './views.css';

function BrightnessGauge({ value, label, color }) {
  const r = 36;
  const pct = Math.min((value / 255) * 100, 100);
  const zone = value < 64 ? 'Under' : value > 200 ? 'Over' : 'Good';
  const zoneColor = value < 64 ? '#f87171' : value > 200 ? '#facc15' : '#4ade80';

  return (
    <div className="brightness-gauge">
      <svg width="90" height="54" viewBox="0 0 90 54">
        <path
          d="M 9 45 A 36 36 0 0 1 81 45"
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 9 45 A 36 36 0 0 1 81 45"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * (Math.PI * r)} ${Math.PI * r}`}
          style={{ transition: 'stroke-dasharray 800ms ease', opacity: 0.8 }}
        />
        <text x="45" y="46" textAnchor="middle" fill={color} fontSize="13" fontWeight="700" fontFamily="var(--font-mono)">
          {value.toFixed(0)}
        </text>
      </svg>
      <span className="brightness-gauge__label" style={{ color: zoneColor }}>
        {label} · {zone}
      </span>
    </div>
  );
}

export default function ExposureView({ refData, testData }) {
  return (
    <div className="metric-view">
      <div className="metric-view__gauges">
        <BrightnessGauge value={refData.mean_brightness} label="Reference" color="var(--color-ref)" />
        <BrightnessGauge value={testData.mean_brightness} label="Test" color="var(--color-test)" />
      </div>

      <CompareTable rows={[
        { label: 'Mean Brightness',    refValue: refData.mean_brightness,    testValue: testData.mean_brightness,    decimals: 1 },
        { label: 'Brightness Std Dev', refValue: refData.brightness_std,     testValue: testData.brightness_std,     decimals: 1 },
        { label: 'Shadow Clipping',    refValue: refData.shadow_clip_pct,    testValue: testData.shadow_clip_pct,    unit: '%', higherIsBetter: false, decimals: 2 },
        { label: 'Highlight Clipping', refValue: refData.highlight_clip_pct, testValue: testData.highlight_clip_pct, unit: '%', higherIsBetter: false, decimals: 2 },
        { label: 'HSV Value Mean',     refValue: refData.hsv_value_mean,     testValue: testData.hsv_value_mean,     decimals: 1 },
      ]} />

      {/* Percentile strip */}
      <div className="metric-view__section-label">Tone Percentiles (p5 → p95)</div>
      <div className="percentile-strips">
        {[{ label: 'REF', data: refData.percentiles, color: 'var(--color-ref)' },
          { label: 'TST', data: testData.percentiles, color: 'var(--color-test)' }].map(({ label, data, color }) => (
          <div className="percentile-strip" key={label}>
            <span className="percentile-strip__tag" style={{ color }}>{label}</span>
            <div className="percentile-strip__bar">
              {[data.p5, data.p25, data.p50, data.p75, data.p95].map((val, i) => (
                <div
                  key={i}
                  className="percentile-strip__marker"
                  style={{ left: `${(val / 255) * 100}%`, background: color }}
                  title={`p${[5, 25, 50, 75, 95][i]}: ${val}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="metric-view__hint">
        Optimal mean brightness: 100–180. High clipping % indicates blown highlights or crushed shadows.
      </p>
    </div>
  );
}

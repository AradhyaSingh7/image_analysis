import CompareTable from './CompareTable';
import './views.css';

function VerdictChip({ sharp }) {
  return (
    <span className={`verdict-chip ${sharp ? 'verdict-chip--pass' : 'verdict-chip--fail'}`}>
      {sharp ? '✓ Sharp' : '✗ Soft'}
    </span>
  );
}

export default function SharpnessView({ refData, testData }) {
  return (
    <div className="metric-view">
      <div className="metric-view__hero">
        <div className="hero-stat hero-stat--ref">
          <span className="hero-stat__label">Reference</span>
          <span className="hero-stat__value" style={{ color: '#38bdf8' }}>
            {refData.laplacian_variance.toFixed(0)}
          </span>
          <span className="hero-stat__unit">Laplacian Var.</span>
          {/* <VerdictChip sharp={refData.is_sharp} /> */}
        </div>

        <div className="hero-divider">
          <div className="hero-divider__line" />
          <span className="hero-divider__vs">VS</span>
          <div className="hero-divider__line" />
        </div>

        <div className="hero-stat hero-stat--test">
          <span className="hero-stat__label">Test</span>
          <span className="hero-stat__value" style={{ color: '#a78bfa' }}>
            {testData.laplacian_variance.toFixed(0)}
          </span>
          <span className="hero-stat__unit">Laplacian Var.</span>
          {/* <VerdictChip sharp={testData.is_sharp} /> */}
        </div>
      </div>

      <CompareTable rows={[
        { label: 'Laplacian Variance', refValue: refData.laplacian_variance, testValue: testData.laplacian_variance, higherIsBetter: true, decimals: 1 },
        { label: 'Gradient Magnitude', refValue: refData.gradient_magnitude, testValue: testData.gradient_magnitude, higherIsBetter: true, decimals: 2 },
        { label: 'Tenengrad Score', refValue: refData.tenengrad_score, testValue: testData.tenengrad_score, higherIsBetter: true, decimals: 0 },
      ]} />

      <p className="metric-view__hint">
        Higher Laplacian variance = sharper edges. Values above 100 are considered sharp.
      </p>
    </div>
  );
}

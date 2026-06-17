import CompareTable from './CompareTable';
import './views.css';

function BlurVerdictBadge({ isBlurry, blurType }) {
  if (!isBlurry) {
    return <span className="verdict-chip verdict-chip--pass">✓ In Focus</span>;
  }
  return (
    <div className="blur-badges">
      {/* <span className="verdict-chip verdict-chip--fail">✗ Blurry</span>
      {blurType !== 'none' && (
        // <span className="verdict-chip verdict-chip--warn">
        //   {blurType === 'motion' ? '⟿ Motion' : '◎ Defocus'}
        // </span>
      )} */}
    </div>
  );
}

export default function BlurView({ refData, testData }) {
  return (
    <div className="metric-view">
      <div className="metric-view__hero">
        <div className="hero-stat hero-stat--ref">
          <span className="hero-stat__label">Reference</span>
          <span className="hero-stat__value" style={{ color: '#38bdf8' }}>
            {(refData.blurry_region_pct).toFixed(1)}
          </span>
          <span className="hero-stat__unit">% blurry area</span>
          {/* <BlurVerdictBadge isBlurry={refData.is_blurry} blurType={refData.blur_type} /> */}
        </div>

        <div className="hero-divider">
          <div className="hero-divider__line" />
          <span className="hero-divider__vs">VS</span>
          <div className="hero-divider__line" />
        </div>

        <div className="hero-stat hero-stat--test">
          <span className="hero-stat__label">Test</span>
          <span className="hero-stat__value" style={{ color: '#a78bfa' }}>
            {(testData.blurry_region_pct).toFixed(1)}
          </span>
          <span className="hero-stat__unit">% blurry area</span>
          {/* <BlurVerdictBadge isBlurry={testData.is_blurry} blurType={testData.blur_type} /> */}
        </div>
      </div>

      {/* <div className="metric-view__bars">
        <CompareBar
          label="Laplacian Variance"
          refValue={refData.laplacian_variance}
          testValue={testData.laplacian_variance}
          higherIsBetter={true}
          decimals={1}
        />
        <CompareBar
          label="HF Energy Ratio"
          refValue={refData.hf_energy_ratio}
          testValue={testData.hf_energy_ratio}
          higherIsBetter={true}
          decimals={4}
        />
        <CompareBar
          label="Blurry Region %"
          refValue={refData.blurry_region_pct}
          testValue={testData.blurry_region_pct}
          unit="%"
          higherIsBetter={false}
          decimals={1}
        />
        <CompareBar
          label="Directional Anisotropy"
          refValue={refData.anisotropy}
          testValue={testData.anisotropy}
          higherIsBetter={false}
          decimals={4}
        />
      </div> */}
      <CompareTable rows={[
        { label: "Laplacian Variance", refValue: refData.laplacian_variance, testValue: testData.laplacian_variance, decimals: 1 },
        { label: "HF Energy Ratio", refValue: refData.hf_energy_ratio, testValue: testData.hf_energy_ratio, decimals: 4 },
        { label: "Blurry Region %", refValue: refData.blurry_region_pct, testValue: testData.blurry_region_pct, decimals: 1, unit: "%", higherIsBetter: false },
        { label: "Directional Anisotropy", refValue: refData.anisotropy, testValue: testData.anisotropy, decimals: 4 }
      ]} />

      {/* Blur direction row */}
      <div className="info-row">
        <div className="info-pill">
          <span className="info-pill__key">REF blur axis</span>
          <span className="info-pill__val">{refData.blur_direction}</span>
        </div>
        <div className="info-pill">
          <span className="info-pill__key">TEST blur axis</span>
          <span className="info-pill__val">{testData.blur_direction}</span>
        </div>
      </div>

      <p className="metric-view__hint">
        Anisotropy &gt; 0.3 suggests motion blur. High HF ratio = sharp, well-focused image.
      </p>
    </div>
  );
}

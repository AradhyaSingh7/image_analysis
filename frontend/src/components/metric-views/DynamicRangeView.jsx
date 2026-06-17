import CompareTable from './CompareTable';
import './views.css';

export default function DynamicRangeView({ refData, testData }) {
  // effective_range is 0-255 scale
  const refRangePct = ((refData.effective_range / 255) * 100).toFixed(1);
  const testRangePct = ((testData.effective_range / 255) * 100).toFixed(1);

  return (
    <div className="metric-view">
      <div className="metric-view__hero">
        <div className="hero-stat hero-stat--ref">
          <span className="hero-stat__label">Reference DR</span>
          <span className="hero-stat__value" style={{ color: '#38bdf8' }}>
            {refRangePct}
          </span>
          <span className="hero-stat__unit">% tonal range (p1–p99)</span>
        </div>

        <div className="hero-divider">
          <div className="hero-divider__line" />
          <span className="hero-divider__vs">VS</span>
          <div className="hero-divider__line" />
        </div>

        <div className="hero-stat hero-stat--test">
          <span className="hero-stat__label">Test DR</span>
          <span className="hero-stat__value" style={{ color: '#a78bfa' }}>
            {testRangePct}
          </span>
          <span className="hero-stat__unit">% tonal range (p1–p99)</span>
        </div>
      </div>

      {/* <div className="metric-view__bars">
        <CompareBar
          label="Effective Tonal Range"
          refValue={refData.effective_range}
          testValue={testData.effective_range}
          maxValue={255}
          higherIsBetter={true}
          decimals={1}
        />
        <CompareBar
          label="Histogram Entropy"
          refValue={refData.histogram_entropy}
          testValue={testData.histogram_entropy}
          higherIsBetter={true}
          decimals={3}
        />
        <CompareBar
          label="Shadow Clipping %"
          refValue={refData.shadow_clipping_pct}
          testValue={testData.shadow_clipping_pct}
          unit="%"
          higherIsBetter={false}
          decimals={2}
        />
        <CompareBar
          label="Highlight Clipping %"
          refValue={refData.highlight_clipping_pct}
          testValue={testData.highlight_clipping_pct}
          unit="%"
          higherIsBetter={false}
          decimals={2}
        />
      </div> */}
      <CompareTable rows={[
        { label: "Effective Tonal Range", refValue: refData.effective_range, testValue: testData.effective_range, maxValue: 255, higherIsBetter: true, decimals: 1 },
        { label: "Histogram Entropy", refValue: refData.histogram_entropy, testValue: testData.histogram_entropy, higherIsBetter: true, decimals: 3 },
        { label: "Shadow Clipping %", refValue: refData.shadow_clipping_pct, testValue: testData.shadow_clipping_pct, unit: "%", higherIsBetter: false, decimals: 2 },
        { label: "Highlight Clipping %", refValue: refData.highlight_clipping_pct, testValue: testData.highlight_clipping_pct, unit: "%", higherIsBetter: false, decimals: 2 }
      ]} />

      <p className="metric-view__hint">
        Higher entropy = more evenly distributed tones. Shadow/highlight clipping &lt; 1% is ideal.
      </p>
    </div>
  );
}

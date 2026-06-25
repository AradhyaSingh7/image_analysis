import CompareTable from './CompareTable';
import './views.css';

const SEVERITY_COLOR = {
  none:     '#4ade80',
  low:      '#a3e635',
  moderate: '#facc15',
  high:     '#f87171',
  unknown:  '#94a3b8',
};

function SeverityBadge({ severity }) {
  const color = SEVERITY_COLOR[severity] ?? '#94a3b8';
  const label = severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : '—';
  return (
    <span
      className="verdict-chip"
      style={{
        background: `${color}15`,
        border: `1px solid ${color}40`,
        color,
      }}
    >
      {label}
    </span>
  );
}

/** Shift-magnitude bar: shows sub-pixel offset as a centred bar */
function ShiftBar({ label, refShift, testShift }) {
  const maxAbs = 2.0; // px range displayed
  const toPos = (v) => `${((v / maxAbs) * 50 + 50).toFixed(1)}%`;
  const refColor = 'var(--color-ref)';
  const testColor = 'var(--color-test)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: refColor }}>REF {refShift > 0 ? '+' : ''}{refShift.toFixed(3)}</span>
          {' / '}
          <span style={{ color: testColor }}>TEST {testShift > 0 ? '+' : ''}{testShift.toFixed(3)}</span>
          {' px'}
        </span>
      </div>
      {/* Track */}
      <div style={{
        position: 'relative',
        height: 10,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 999,
        overflow: 'visible',
      }}>
        {/* Centre line */}
        <div style={{
          position: 'absolute', left: '50%', top: 0, width: 1, height: '100%',
          background: 'rgba(255,255,255,0.12)', transform: 'translateX(-50%)',
        }} />
        {/* Ref marker */}
        <div style={{
          position: 'absolute', top: '50%', left: toPos(refShift),
          width: 8, height: 8, borderRadius: '50%', background: refColor,
          transform: 'translate(-50%, -50%)',
          boxShadow: `0 0 6px ${refColor}80`,
          transition: 'left 0.4s ease',
        }} />
        {/* Test marker */}
        <div style={{
          position: 'absolute', top: '50%', left: toPos(testShift),
          width: 8, height: 8, borderRadius: '50%', background: testColor,
          transform: 'translate(-50%, -50%)',
          boxShadow: `0 0 6px ${testColor}80`,
          transition: 'left 0.4s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>
        <span>−{maxAbs}px</span><span>0</span><span>+{maxAbs}px</span>
      </div>
    </div>
  );
}

export default function LCAView({ refData, testData }) {
  return (
    <div className="metric-view">
      {/* Hero: severity badges */}
      <div className="metric-view__hero">
        <div className="hero-stat hero-stat--ref">
          <span className="hero-stat__label">Reference</span>
          <SeverityBadge severity={refData.lca_severity} />
          <span className="hero-stat__unit">outer shift {Math.max(Math.abs(refData.outer_r_shift_px), Math.abs(refData.outer_b_shift_px)).toFixed(3)} px</span>
        </div>

        <div className="hero-divider">
          <div className="hero-divider__line" />
          <span className="hero-divider__vs">VS</span>
          <div className="hero-divider__line" />
        </div>

        <div className="hero-stat hero-stat--test">
          <span className="hero-stat__label">Test</span>
          <SeverityBadge severity={testData.lca_severity} />
          <span className="hero-stat__unit">outer shift {Math.max(Math.abs(testData.outer_r_shift_px), Math.abs(testData.outer_b_shift_px)).toFixed(3)} px</span>
        </div>
      </div>

      {/* Shift bars */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 14,
        padding: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius-md)',
      }}>
        <span className="metric-view__section-label">Channel shifts (centre of image)</span>
        <ShiftBar label="R channel" refShift={refData.center_r_shift_px} testShift={testData.center_r_shift_px} />
        <ShiftBar label="B channel" refShift={refData.center_b_shift_px} testShift={testData.center_b_shift_px} />

        <span className="metric-view__section-label" style={{ marginTop: 4 }}>Channel shifts (outer / corners)</span>
        <ShiftBar label="R channel" refShift={refData.outer_r_shift_px} testShift={testData.outer_r_shift_px} />
        <ShiftBar label="B channel" refShift={refData.outer_b_shift_px} testShift={testData.outer_b_shift_px} />
      </div>

      {/* Numeric table */}
      <CompareTable rows={[
        { label: 'Mean R shift (px)', refValue: refData.mean_r_shift_px, testValue: testData.mean_r_shift_px, decimals: 3, higherIsBetter: false },
        { label: 'Mean B shift (px)', refValue: refData.mean_b_shift_px, testValue: testData.mean_b_shift_px, decimals: 3, higherIsBetter: false },
        { label: 'Center R shift (px)', refValue: refData.center_r_shift_px, testValue: testData.center_r_shift_px, decimals: 3, higherIsBetter: false },
        { label: 'Center B shift (px)', refValue: refData.center_b_shift_px, testValue: testData.center_b_shift_px, decimals: 3, higherIsBetter: false },
        { label: 'Outer R shift (px)', refValue: refData.outer_r_shift_px, testValue: testData.outer_r_shift_px, decimals: 3, higherIsBetter: false },
        { label: 'Outer B shift (px)', refValue: refData.outer_b_shift_px, testValue: testData.outer_b_shift_px, decimals: 3, higherIsBetter: false },
      ]} />

      <p className="metric-view__hint">
        LCA measures sub-pixel displacement of R and B channels relative to green at detected edges.
        Outer region shifts are more meaningful — values under 0.5 px are typically imperceptible.
        Severity: none &lt; 0.2 px · low &lt; 0.5 px · moderate &lt; 1.0 px · high ≥ 1.0 px.
      </p>
    </div>
  );
}

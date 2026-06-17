import './CompareBar.css';

/**
 * CompareBar — side-by-side animated comparison bar for ref vs test values.
 *
 * Props:
 *   label         string   — metric label
 *   refValue      number
 *   testValue     number
 *   unit          string   — e.g. 'dB', '%', ''
 *   higherIsBetter bool    — determines delta color coding
 *   maxValue      number   — optional, defaults to max(ref, test)
 *   decimals      number   — decimal places for display (default 1)
 */
export default function CompareBar({
  label,
  refValue,
  testValue,
  unit = '',
  higherIsBetter = true,
  maxValue,
  decimals = 1,
}) {
  const max = maxValue ?? Math.max(refValue, testValue, 0.001);
  const refPct  = Math.min((refValue  / max) * 100, 100);
  const testPct = Math.min((testValue / max) * 100, 100);

  const delta = testValue - refValue;
  const deltaPct = refValue !== 0 ? ((delta / Math.abs(refValue)) * 100) : 0;

  // Positive delta = test is higher than ref
  const isImproved = higherIsBetter ? delta > 0 : delta < 0;
  const isSame     = Math.abs(deltaPct) < 2;

  const deltaClass  = isSame ? 'compare-bar__delta--neutral'
                    : isImproved ? 'compare-bar__delta--good'
                    : 'compare-bar__delta--bad';

  const deltaSign   = delta > 0 ? '+' : '';
  const deltaLabel  = isSame
    ? '≈ same'
    : `${deltaSign}${deltaPct.toFixed(1)}%`;

  const fmt = (v) => {
    if (v === null || v === undefined) return '—';
    return typeof v === 'number' ? `${v.toFixed(decimals)}${unit}` : `${v}${unit}`;
  };

  return (
    <div className="compare-bar">
      <div className="compare-bar__header">
        <span className="compare-bar__label">{label}</span>
        <span className={`compare-bar__delta ${deltaClass}`}>{deltaLabel}</span>
      </div>

      <div className="compare-bar__tracks">
        {/* Reference track */}
        <div className="compare-bar__row">
          <span className="compare-bar__tag compare-bar__tag--ref">REF</span>
          <div className="compare-bar__track">
            <div
              className="compare-bar__fill compare-bar__fill--ref"
              style={{ width: `${refPct}%` }}
            />
          </div>
          <span className="compare-bar__value">{fmt(refValue)}</span>
        </div>

        {/* Test track */}
        <div className="compare-bar__row">
          <span className="compare-bar__tag compare-bar__tag--test">TEST</span>
          <div className="compare-bar__track">
            <div
              className={`compare-bar__fill compare-bar__fill--test ${isImproved && !isSame ? 'compare-bar__fill--win' : ''} ${!isImproved && !isSame ? 'compare-bar__fill--lose' : ''}`}
              style={{ width: `${testPct}%` }}
            />
          </div>
          <span className="compare-bar__value">{fmt(testValue)}</span>
        </div>
      </div>
    </div>
  );
}

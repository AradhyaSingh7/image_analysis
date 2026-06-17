import './CompareTable.css';

/**
 * CompareTable — clean comparison table for ref vs test values.
 *
 * rows: [{ label, refValue, testValue, unit, higherIsBetter, decimals }]
 */
export default function CompareTable({ rows }) {
  const fmt = (v, decimals = 1, unit = '') => {
    if (v === null || v === undefined) return '—';
    return typeof v === 'number' ? `${v.toFixed(decimals)}${unit}` : `${v}${unit}`;
  };

  return (
    <div className="compare-table">
      <div className="compare-table__header">
        <span className="compare-table__th compare-table__th--label">Metric</span>
        <span className="compare-table__th compare-table__th--ref">Reference</span>
        <span className="compare-table__th compare-table__th--test">Test</span>
        <span className="compare-table__th compare-table__th--delta">Delta</span>
      </div>

      {rows.map((row, i) => {
        const { label, refValue, testValue, unit = '', higherIsBetter = true, decimals = 1 } = row;
        const delta = testValue - refValue;
        const deltaPct = refValue !== 0 ? ((delta / Math.abs(refValue)) * 100) : 0;
        const isSame = Math.abs(deltaPct) < 2;
        const isImproved = higherIsBetter ? delta > 0 : delta < 0;

        const deltaClass = isSame ? 'delta--neutral'
          : isImproved ? 'delta--good'
          : 'delta--bad';

        const deltaSign = delta > 0 ? '+' : '';
        const deltaText = isSame ? '≈' : `${deltaSign}${deltaPct.toFixed(1)}%`;

        return (
          <div className="compare-table__row" key={i}>
            <span className="compare-table__label">{label}</span>
            <span className="compare-table__val compare-table__val--ref">{fmt(refValue, decimals, unit)}</span>
            <span className="compare-table__val compare-table__val--test">{fmt(testValue, decimals, unit)}</span>
            <span className={`compare-table__delta ${deltaClass}`}>{deltaText}</span>
          </div>
        );
      })}
    </div>
  );
}

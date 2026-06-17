import './MetricTabs.css';

export default function MetricTabs({ metrics, activeKey, onSelect, disabled }) {
  return (
    <div className="metric-tabs" role="tablist" aria-label="Analysis metrics">
      <div className="metric-tabs__scroll">
        {metrics.map((m) => {
          const isActive = m.key === activeKey;
          return (
            <button
              key={m.key}
              role="tab"
              aria-selected={isActive}
              className={`metric-tab ${isActive ? 'metric-tab--active' : ''} ${disabled ? 'metric-tab--disabled' : ''}`}
              style={{ '--tab-color': m.color }}
              onClick={() => !disabled && onSelect(m.key)}
              id={`tab-${m.key}`}
              aria-controls={`panel-${m.key}`}
            >
              <span className="metric-tab__icon">{m.icon}</span>
              <span className="metric-tab__label">{m.label}</span>
              {isActive && <span className="metric-tab__dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

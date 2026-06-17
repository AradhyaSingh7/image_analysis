import { useMemo } from 'react';
import SharpnessView from './metric-views/SharpnessView';
import NoiseView from './metric-views/NoiseView';
import ExposureView from './metric-views/ExposureView';
import ColorView from './metric-views/ColorView';
import BlurView from './metric-views/BlurView';
import DynamicRangeView from './metric-views/DynamicRangeView';
import SimilarityView from './metric-views/SimilarityView';
import HistogramView from './metric-views/HistogramView';
import './AnalysisPanel.css';

/** Map metric key → view component factory */
const VIEW_MAP = {
  sharpness: (data) => <SharpnessView refData={data.reference.sharpness} testData={data.test.sharpness} />,
  noise: (data) => <NoiseView refData={data.reference.noise} testData={data.test.noise} />,
  exposure: (data) => <ExposureView refData={data.reference.exposure} testData={data.test.exposure} />,
  color_accuracy: (data) => <ColorView refData={data.reference.color_accuracy} testData={data.test.color_accuracy} />,
  blur: (data) => <BlurView refData={data.reference.blur} testData={data.test.blur} />,
  dynamic_range: (data) => <DynamicRangeView refData={data.reference.dynamic_range} testData={data.test.dynamic_range} />,
  histogram: (data) => <HistogramView refData={data.reference} testData={data.test} />,
  similarity: (data) => <SimilarityView data={data.similarity} />,
};

/** Skeleton loader shown while API call is in flight */
function PanelSkeleton() {
  return (
    <div className="panel-skeleton">
      <div className="panel-skeleton__hero">
        <div className="skel skel--hero" />
        <div className="skel skel--divider" />
        <div className="skel skel--hero" />
      </div>
      <div className="panel-skeleton__bars">
        {[100, 85, 70].map((w, i) => (
          <div key={i} className="panel-skeleton__bar-row">
            <div className="skel skel--label" />
            <div className="skel skel--bar" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder before first analysis */
function PanelPlaceholder({ activeMetric, metrics }) {
  const active = metrics.find((m) => m.key === activeMetric);
  return (
    <div className="panel-placeholder">
      <div className="panel-placeholder__icon" style={{ color: active?.color }}>
        {active?.icon ?? '◈'}
      </div>
      <p className="panel-placeholder__text">
        Click <strong>Analyze</strong> to run the{' '}
        <span style={{ color: active?.color }}>{active?.label ?? 'selected'}</span> analysis
      </p>
      <p className="panel-placeholder__sub">Upload both images, then hit the button above</p>
    </div>
  );
}

export default function AnalysisPanel({ data, isAnalyzing, activeMetric, metrics }) {
  const activeConfig = useMemo(
    () => metrics.find((m) => m.key === activeMetric),
    [metrics, activeMetric]
  );

  const renderView = () => {
    if (isAnalyzing) return <PanelSkeleton />;
    if (!data) return <PanelPlaceholder activeMetric={activeMetric} metrics={metrics} />;

    const viewFn = VIEW_MAP[activeMetric];
    if (!viewFn) return <p className="panel-placeholder__text">Unknown metric.</p>;
    return viewFn(data);
  };

  return (
    <section
      className="analysis-panel"
      id={`panel-${activeMetric}`}
      aria-label={`${activeConfig?.label ?? 'Analysis'} results panel`}
      style={{ '--panel-color': activeConfig?.color ?? '#0ea5e9' }}
    >
      {/* Panel header */}
      <div className="analysis-panel__header">
        <div className="analysis-panel__title-row">
          <span className="analysis-panel__icon">{activeConfig?.icon}</span>
          <h2 className="analysis-panel__title">{activeConfig?.label}</h2>
          {data && !isAnalyzing && (
            <span className="analysis-panel__badge">
              <span className="analysis-panel__badge-dot" />
              Live
            </span>
          )}
        </div>

        {/* Legend */}
        {activeMetric !== 'similarity' && (
          <div className="analysis-panel__legend">
            <span className="legend-dot legend-dot--ref" />
            <span className="legend-label">Reference</span>
            <span className="legend-dot legend-dot--test" />
            <span className="legend-label">Test</span>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="analysis-panel__body" key={activeMetric}>
        {renderView()}
      </div>
    </section>
  );
}

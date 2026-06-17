/**
 * metricsConfig.js
 * Single source of truth for all analysis metrics.
 * To add a new metric: add one entry here + create its view component.
 */
export const METRICS_CONFIG = [
  { key: 'sharpness',     label: 'Sharpness',      icon: '◈', color: '#0ea5e9' },
  { key: 'noise',         label: 'Noise',           icon: '◉', color: '#a78bfa' },
  { key: 'exposure',      label: 'Exposure',        icon: '◐', color: '#fbbf24' },
  { key: 'color_accuracy',label: 'Color Accuracy',  icon: '◑', color: '#34d399' },
  { key: 'blur',          label: 'Blur',            icon: '⬡', color: '#fb923c' },
  { key: 'dynamic_range', label: 'Dynamic Range',   icon: '▤', color: '#f472b6' },
  { key: 'histogram',     label: 'Histogram',       icon: '▦', color: '#e879f9' },
  { key: 'similarity',    label: 'Similarity',      icon: '◎', color: '#38bdf8' },
];

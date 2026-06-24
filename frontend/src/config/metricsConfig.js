/**
 * metricsConfig.js
 * Single source of truth for all analysis metrics.
 * To add a new metric: add one entry here + create its view component.
 */
export const METRICS_CONFIG = [
  { key: 'sharpness',     label: 'Sharpness',      icon: '◈', color: '#5ba8d6' },
  { key: 'noise',         label: 'Noise',           icon: '◉', color: '#9b82d4' },
  { key: 'exposure',      label: 'Exposure',        icon: '◐', color: '#e6b844' },
  { key: 'color_accuracy',label: 'Color Accuracy',  icon: '◑', color: '#4abe7b' },
  { key: 'blur',          label: 'Blur',            icon: '⬡', color: '#e89050' },
  { key: 'dynamic_range', label: 'Dynamic Range',   icon: '▤', color: '#d675a6' },
  { key: 'histogram',     label: 'Histogram',       icon: '▦', color: '#c476d9' },
  { key: 'similarity',    label: 'Similarity',      icon: '◎', color: '#5ba8d6' },
];

import { useState, useRef, useCallback, useEffect } from 'react';
import './ImageComparison.css';

export default function ImageComparison({ referenceImage, testImage }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const getPositionFromEvent = useCallback((e) => {
    if (!containerRef.current) return 50;
    const rect = containerRef.current.getBoundingClientRect();
    let clientX;
    if (e.touches) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    const x = clientX - rect.left;
    const pct = (x / rect.width) * 100;
    return Math.max(0, Math.min(100, pct));
  }, []);

  const handleMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    setSliderPosition(getPositionFromEvent(e));
  }, [isDragging, getPositionFromEvent]);

  const handleStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    setSliderPosition(getPositionFromEvent(e));
  }, [getPositionFromEvent]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  if (!referenceImage || !testImage) return null;

  return (
    <section className="comparison animate-fade-in-up" id="comparison-section">
      <div className="comparison__header">
        <h2 className="comparison__title">Visual Comparison</h2>
        <p className="comparison__desc">Drag the divider to compare both images</p>
      </div>

      <div
        className={`comparison__container ${isDragging ? 'comparison__container--dragging' : ''}`}
        ref={containerRef}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        role="slider"
        aria-label="Image comparison slider"
        aria-valuenow={Math.round(sliderPosition)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setSliderPosition((p) => Math.max(0, p - 2));
          if (e.key === 'ArrowRight') setSliderPosition((p) => Math.min(100, p + 2));
        }}
        id="comparison-slider"
      >
        {/* Reference (left side — full image underneath) */}
        <div className="comparison__image-layer comparison__image-layer--reference">
          <img src={referenceImage.url} alt="Reference image" draggable={false} />
        </div>

        {/* Test (right side — clipped) */}
        <div
          className="comparison__image-layer comparison__image-layer--test"
          style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
        >
          <img src={testImage.url} alt="Test image" draggable={false} />
        </div>

        {/* Labels */}
        <div className="comparison__label comparison__label--ref" style={{ opacity: sliderPosition > 12 ? 1 : 0 }}>
          REFERENCE
        </div>
        <div className="comparison__label comparison__label--test" style={{ opacity: sliderPosition < 88 ? 1 : 0 }}>
          TEST
        </div>

        {/* Slider line + handle */}
        <div
          className="comparison__slider"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="comparison__slider-line"></div>
          <div className="comparison__slider-handle">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 6L4 10L7 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13 6L16 10L13 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

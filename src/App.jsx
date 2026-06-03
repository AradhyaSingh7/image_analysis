import { useState, useCallback } from 'react';
import ImageUploader from './components/ImageUploader';
import ImageComparison from './components/ImageComparison';
import SubmitButton from './components/SubmitButton';
import './App.css';

const METRIC_PILLS = [
  { icon: '◈', label: 'Sharpness' },
  { icon: '◉', label: 'Noise' },
  { icon: '◐', label: 'Exposure' },
  { icon: '◑', label: 'Color Accuracy' },
  { icon: '◇', label: 'Contrast' },
];

function App() {
  const [referenceImage, setReferenceImage] = useState(null);
  const [testImage, setTestImage] = useState(null);
  const [clearVersion, setClearVersion] = useState(0);

  const handleReferenceSelect = useCallback((img) => setReferenceImage(img), []);
  const handleTestSelect = useCallback((img) => setTestImage(img), []);

  const bothSelected = referenceImage && testImage;
  const hasImages = referenceImage || testImage;

  const handleClearImages = useCallback(() => {
    setReferenceImage(null);
    setTestImage(null);
    setClearVersion((version) => version + 1);
  }, []);

  const handleSubmit = () => {
    console.log('Submitting images for analysis:', { referenceImage, testImage });
  };

  return (
    <>
      {/* Background decorative elements */}
      <div className="bg-decor" aria-hidden="true">
        <div className="bg-decor__grid"></div>
      </div>

      <main className="main" id="main-content">
        <header className="hero animate-fade-in-up" id="hero-section">
          <h1 className="hero__title">
            Intelligent Image{' '}
            <span className="hero__title--accent">Quality Analysis</span>
          </h1>
          {/* Animated underline accent */}
          <div className="hero__underline" aria-hidden="true"></div>
        </header>

        {/* ── Upload Section ── */}
        <section className="upload-section animate-fade-in-up delay-1" id="upload-section">
          <div className="upload-section__label">
            <span className="upload-section__label-line"></span>
            <span className="upload-section__label-text">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1v6M7 7l-2.5-2.5M7 7l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1.5 9.5v1A1.5 1.5 0 003 12h8a1.5 1.5 0 001.5-1.5v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Select images to compare
            </span>
            <span className="upload-section__label-line"></span>
          </div>

          <div className="upload-grid">
            <div className="animate-fade-in-up delay-2">
              <ImageUploader
                key={`reference-${clearVersion}`}
                label="Reference Image"
                sublabel="| Baseline"
                onImageSelect={handleReferenceSelect}
                image={referenceImage}
                id="reference-uploader"
              />
            </div>

            <div className="upload-grid__divider animate-fade-in delay-2">
              <div className="upload-grid__divider-line"></div>
              <div className="upload-grid__divider-badge">VS</div>
              <div className="upload-grid__divider-line"></div>
            </div>

            <div className="animate-fade-in-up delay-3">
              <ImageUploader
                key={`test-${clearVersion}`}
                label="Test Image"
                sublabel="| Subject"
                onImageSelect={handleTestSelect}
                image={testImage}
                id="test-uploader"
              />
            </div>
          </div>

          {/* Metric pills — nestled between grid and status */}
          <div className="metric-strip animate-fade-in delay-3">
            <span className="metric-strip__label">Metrics analyzed</span>
            <div className="metric-pills">
              {METRIC_PILLS.map((m) => (
                <span key={m.label} className="metric-pill">
                  <span className="metric-pill__icon">{m.icon}</span>
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Status indicators */}
          <div className="upload-status animate-fade-in-up delay-4">
            <div className={`upload-status__item ${referenceImage ? 'upload-status__item--done' : ''}`}>
              <div className="upload-status__check">
                {referenceImage ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span className="upload-status__number">1</span>
                )}
              </div>
              <span className="upload-status__label">Reference image</span>
            </div>

            <div className="upload-status__connector">
              <div className={`upload-status__connector-line ${referenceImage ? 'upload-status__connector-line--active' : ''}`}></div>
            </div>

            <div className={`upload-status__item ${testImage ? 'upload-status__item--done' : ''}`}>
              <div className="upload-status__check">
                {testImage ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span className="upload-status__number">2</span>
                )}
              </div>
              <span className="upload-status__label">Test image</span>
            </div>

            <div className="upload-status__connector">
              <div className={`upload-status__connector-line ${bothSelected ? 'upload-status__connector-line--active' : ''}`}></div>
            </div>

            <div className={`upload-status__item ${bothSelected ? 'upload-status__item--ready' : ''}`}>
              <div className="upload-status__check">
                {bothSelected ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span className="upload-status__number">3</span>
                )}
              </div>
              <span className="upload-status__label">Ready to analyze</span>
            </div>
          </div>

        </section>

        {/* Image Comparison Slider */}
        {bothSelected && (
          <ImageComparison
            referenceImage={referenceImage}
            testImage={testImage}
          />
        )}

        {/* Submit Section */}
        <section className="submit-section animate-fade-in-up delay-4" id="submit-section">
          <SubmitButton disabled={!bothSelected} onClick={handleSubmit} />
          {hasImages && (
            <button
              className="clear-images-btn"
              type="button"
              onClick={handleClearImages}
              aria-label="Clear both uploaded images"
            >
              <svg className="clear-images-btn__icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <span>Clear images</span>
            </button>
          )}
          {!bothSelected && (
            <p className="submit-section__hint">
              Upload both images to enable analysis
            </p>
          )}
          {bothSelected && (
            <p className="submit-section__ready">
              Both images loaded — ready for analysis
            </p>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="footer" id="footer">
        <div className="footer__inner">
          <div className="footer-badge">
            <span className="footer-badge__item footer-badge__item--primary">
              <span className="footer-badge__dot"></span>
              AI-powered assessment
            </span>
            <span className="footer-badge__divider" aria-hidden="true"></span>
            <span className="footer-badge__item footer-badge__item--muted">
              Built with
            </span>
            <span className="footer-tech">OpenCV</span>
            <span className="footer-tech">Scikit-image</span>
            <span className="footer-tech">Python</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;

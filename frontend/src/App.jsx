import { useState, useCallback, useRef } from 'react';
import ImageUploader from './components/ImageUploader';
import SubmitButton from './components/SubmitButton';
import MetricTabs from './components/MetricTabs';
import AnalysisPanel from './components/AnalysisPanel';
import { METRICS_CONFIG } from './config/metricsConfig';
import './App.css';

const API_BASE = 'http://localhost:5000';

function App() {
  const [referenceImage, setReferenceImage] = useState(null);
  const [testImage, setTestImage] = useState(null);
  const [clearVersion, setClearVersion] = useState(0);

  const [activeMetric, setActiveMetric] = useState(METRICS_CONFIG[0].key);
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  const panelRef = useRef(null);

  const handleReferenceSelect = useCallback((img) => {
    setReferenceImage(img)
    setAnalysisData(null)
    setAnalyzeError(null)
  }, []);
  const handleTestSelect = useCallback((img) => {
    setTestImage(img)
    setAnalysisData(null)
    setAnalyzeError(null)
  }, []);

  const bothSelected = referenceImage && testImage;
  const hasImages = referenceImage || testImage;

  const handleClearImages = useCallback(() => {
    setReferenceImage(null);
    setTestImage(null);
    setAnalysisData(null);
    setAnalyzeError(null);
    setClearVersion((v) => v + 1);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!bothSelected || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      // Convert data-URL → Blob for FormData
      const toBlob = async (dataUrl, filename) => {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        return new File([blob], filename, { type: blob.type });
      };

      const [refFile, testFile] = await Promise.all([
        toBlob(referenceImage.url, referenceImage.name),
        toBlob(testImage.url, testImage.name),
      ]);

      const form = new FormData();
      form.append('reference', refFile);
      form.append('test', testFile);

      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }

      const data = await response.json();
      setAnalysisData(data);

      // Scroll panel into view after results land
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);

    } catch (err) {
      setAnalyzeError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [bothSelected, isAnalyzing, referenceImage, testImage]);

  const handleTabSelect = useCallback((key) => {
    setActiveMetric(key);
  }, []);

  return (
    <>
      {/* Background decorative elements */}
      <div className="bg-decor" aria-hidden="true">
        <div className="bg-decor__grid" />
      </div>

      <main className="main" id="main-content">
        <header className="hero animate-fade-in-up" id="hero-section">
          <h1 className="hero__title">
            Intelligent Image{' '}
            <span className="hero__title--accent">Quality Analysis</span>
          </h1>
          <div className="hero__underline" aria-hidden="true" />
        </header>

        {/* ── Upload Section ── */}
        <section className="upload-section animate-fade-in-up delay-1" id="upload-section">
          <div className="upload-section__label">
            <span className="upload-section__label-line" />
            <span className="upload-section__label-text">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1v6M7 7l-2.5-2.5M7 7l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1.5 9.5v1A1.5 1.5 0 003 12h8a1.5 1.5 0 001.5-1.5v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Select images to compare
            </span>
            <span className="upload-section__label-line" />
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
              <div className="upload-grid__divider-line" />
              <div className="upload-grid__divider-badge">VS</div>
              <div className="upload-grid__divider-line" />
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

          {/* Status indicators */}
          {!isAnalyzing && !analysisData && (<div className="upload-status animate-fade-in-up delay-4">
            <div className={`upload-status__item ${referenceImage ? 'upload-status__item--done' : ''}`}>
              <div className="upload-status__check">
                {referenceImage ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="upload-status__number">1</span>
                )}
              </div>
              <span className="upload-status__label">Reference image</span>
            </div>

            <div className="upload-status__connector">
              <div className={`upload-status__connector-line ${referenceImage ? 'upload-status__connector-line--active' : ''}`} />
            </div>

            <div className={`upload-status__item ${testImage ? 'upload-status__item--done' : ''}`}>
              <div className="upload-status__check">
                {testImage ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="upload-status__number">2</span>
                )}
              </div>
              <span className="upload-status__label">Test image</span>
            </div>

            <div className="upload-status__connector">
              <div className={`upload-status__connector-line ${bothSelected ? 'upload-status__connector-line--active' : ''}`} />
            </div>

            <div className={`upload-status__item ${bothSelected ? 'upload-status__item--ready' : ''}`}>
              <div className="upload-status__check">
                {bothSelected ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="upload-status__number">3</span>
                )}
              </div>
              <span className="upload-status__label">Ready to analyze</span>
            </div>
          </div>)}
        </section>

        {/* Submit Section */}
        {!analysisData && (<section className="submit-section animate-fade-in-up delay-4" id="submit-section">
          <SubmitButton
            disabled={!bothSelected}
            onClick={handleSubmit}
            isLoading={isAnalyzing}
          />
          {hasImages && !isAnalyzing && (
            <button
              className="clear-images-btn"
              type="button"
              onClick={handleClearImages}
              aria-label="Clear both uploaded images"
            >
              <svg className="clear-images-btn__icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span>Clear images</span>
            </button>
          )}
          {!bothSelected && !isAnalyzing && (
            <p className="submit-section__hint">Upload both images to enable analysis</p>
          )}
          {analyzeError && (
            <p className="submit-section__error">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {analyzeError}
            </p>
          )}
        </section>)}

        {/* ── Metric Tabs + Analysis Panel ── */}
        <section className="analysis-section animate-fade-in-up delay-4" id="analysis-section">
          <div className="analysis-section__label">
            <span className="upload-section__label-line" />
            <span className="upload-section__label-text">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 10V7M5 10V4M8 10V6M11 10V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Analysis Results
            </span>
            <span className="upload-section__label-line" />
          </div>

          <MetricTabs
            metrics={METRICS_CONFIG}
            activeKey={activeMetric}
            onSelect={handleTabSelect}
            disabled={!analysisData && !isAnalyzing}
          />

          <div ref={panelRef}>
            <AnalysisPanel
              data={analysisData}
              isAnalyzing={isAnalyzing}
              activeMetric={activeMetric}
              metrics={METRICS_CONFIG}
            />
          </div>
        </section>
        {analysisData && (
          <button
            className="clear-images-btn"
            type="button"
            onClick={handleClearImages}
            aria-label="Clear both uploaded images"
          >
            <svg className="clear-images-btn__icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span>Clear Images</span>
          </button>
        )}
      </main>

      {/* Footer */}
      <footer className="footer" id="footer">
        <div className="footer__inner">
          <div className="footer-badge">
            <span className="footer-badge__item footer-badge__item--primary">
              <span className="footer-badge__dot" />
              AI-powered assessment
            </span>
            <span className="footer-badge__divider" aria-hidden="true" />
            <span className="footer-badge__item footer-badge__item--muted">Built with</span>
            <span className="footer-tech">OpenCV</span>
            <span className="footer-tech">Scikit-image</span>
            <span className="footer-tech">Flask</span>
            <span className="footer-tech">React</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;

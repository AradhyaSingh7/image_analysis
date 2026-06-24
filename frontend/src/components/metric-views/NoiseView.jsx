import CompareTable from './CompareTable';
import './views.css';

export default function NoiseView({ refData, testData }) {
  const channels = ['B', 'G', 'R'];
  const channelColors = { B: '#60a5fa', G: '#4ade80', R: '#f87171' };

  return (
    <div className="metric-view">
      <div className="metric-view__hero">
        <div className="hero-stat hero-stat--ref">
          <span className="hero-stat__label">Reference SNR</span>
          <span className="hero-stat__value" style={{ color: 'var(--color-ref)' }}>
            {refData.snr_db.toFixed(1)}
          </span>
          <span className="hero-stat__unit">dB</span>
        </div>

        <div className="hero-divider">
          <div className="hero-divider__line" />
          <span className="hero-divider__vs">VS</span>
          <div className="hero-divider__line" />
        </div>

        <div className="hero-stat hero-stat--test">
          <span className="hero-stat__label">Test SNR</span>
          <span className="hero-stat__value" style={{ color: 'var(--color-test)' }}>
            {testData.snr_db.toFixed(1)}
          </span>
          <span className="hero-stat__unit">dB</span>
        </div>
      </div>

      <CompareTable rows={[
        { label: 'Noise Std Dev',       refValue: refData.noise_std, testValue: testData.noise_std, higherIsBetter: false, decimals: 3 },
        { label: 'Signal-to-Noise',     refValue: refData.snr_db,    testValue: testData.snr_db,    unit: ' dB', higherIsBetter: true, decimals: 1 },
      ]} />

      {/* Per-channel noise */}
      <div className="metric-view__section-label">Per-Channel Noise</div>
      <div className="metric-view__channel-grid">
        {channels.map((ch) => {
          const refNoise  = refData.channel_noise[ch];
          const testNoise = testData.channel_noise[ch];
          const better = testNoise < refNoise;
          return (
            <div className="channel-card" key={ch} style={{ '--ch-color': channelColors[ch] }}>
              <span className="channel-card__label">{ch}</span>
              <div className="channel-card__values">
                <div className="channel-card__val">
                  <span className="channel-card__tag">REF</span>
                  <span>{refNoise.toFixed(3)}</span>
                </div>
                <div className="channel-card__val">
                  <span className="channel-card__tag">TST</span>
                  <span className={better ? 'text-good' : 'text-bad'}>{testNoise.toFixed(3)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="metric-view__hint">
        Lower noise std dev = cleaner image. Higher SNR = better signal quality.
      </p>
    </div>
  );
}

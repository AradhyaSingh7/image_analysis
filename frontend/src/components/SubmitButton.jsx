import './SubmitButton.css';

export default function SubmitButton({ disabled, onClick, isLoading }) {
  return (
    <button
      className={`submit-btn ${disabled || isLoading ? 'submit-btn--disabled' : ''} ${isLoading ? 'submit-btn--loading' : ''}`}
      disabled={disabled || isLoading}
      onClick={onClick}
      id="submit-analysis"
      aria-label={isLoading ? 'Analyzing images…' : 'Submit images for analysis'}
    >
      <span className="submit-btn__content">
        {isLoading ? (
          <>
            <span className="submit-btn__spinner" />
            <span className="submit-btn__text">Analyzing…</span>
          </>
        ) : (
          <span className="submit-btn__text">Analyze</span>
        )}
      </span>
    </button>
  );
}


import './SubmitButton.css';

export default function SubmitButton({ disabled, onClick }) {
  return (
    <button
      className={`submit-btn ${disabled ? 'submit-btn--disabled' : ''}`}
      disabled={disabled}
      onClick={onClick}
      id="submit-analysis"
      aria-label="Submit images for analysis"
    >
      <span className="submit-btn__content">
        <span className="submit-btn__text">Analyze</span>
      </span>
    </button>
  );
}

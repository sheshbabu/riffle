import Button from '../../commons/components/Button.jsx';
import './DedupeForm.css';

export default function DedupeForm({
  enableNearDuplicates,
  setEnableNearDuplicates,
  isAnalyzing,
  onSubmit
}) {
  const buttonText = isAnalyzing ? 'Analyzing...' : 'Analyze Photos';

  return (
    <div className="dedupe-form">
      <div className="checkbox-field">
        <label>
          <input
            type="checkbox"
            checked={enableNearDuplicates}
            onChange={(e) => setEnableNearDuplicates(e.target.checked)}
          />
          <span className="checkbox-label">Enable near-duplicate detection (experimental)</span>
        </label>
        <div className="checkbox-hint">
          Finds visually similar images using perceptual hashing. Display only - not auto-moved.
        </div>
      </div>

      <div className="submit-button">
        <Button
          className='primary'
          onClick={onSubmit}
          disabled={isAnalyzing}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}

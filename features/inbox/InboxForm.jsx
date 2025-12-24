import Button from '../../commons/components/Button.jsx';
import './InboxForm.css';

export default function InboxForm({ isAnalyzing, analyzeButtonText, onAnalyze }) {
  return (
    <div className="inbox-form">
      <div className="submit-button">
        <Button className='primary' onClick={onAnalyze} disabled={isAnalyzing}>
          {analyzeButtonText}
        </Button>
      </div>
    </div>
  );
}

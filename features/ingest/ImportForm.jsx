import Button from '../../commons/components/Button.jsx';
import './ImportForm.css';

export default function ImportForm({ isAnalyzing, analyzeButtonText, onAnalyze }) {
  return (
    <div className="import-form">
      <div className="submit-button">
        <Button className='primary' onClick={onAnalyze} disabled={isAnalyzing}>
          {analyzeButtonText}
        </Button>
      </div>
    </div>
  );
}

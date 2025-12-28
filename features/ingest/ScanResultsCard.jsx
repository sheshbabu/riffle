import Button from '../../commons/components/Button.jsx';
import './ScanResultsCard.css';

export default function ScanResultsCard({ results, isImporting, copyMode, onCopyModeChange, onImportClick }) {
  if (results === null) {
    return null
  }

  const filesToImport = results.totalScanned - results.duplicatesRemoved;

  let buttonText = 'Import to Library';
  if (isImporting) {
    buttonText = copyMode ? 'Copying...' : 'Importing...';
  }

  let helpText = `Found ${filesToImport.toLocaleString()} files to import.`;
  if (results.duplicatesRemoved > 0) {
    helpText += ` ${results.duplicatesRemoved.toLocaleString()} duplicates will be skipped.`;
  }

  return (
    <div className="scan-results-card">
      <h3>Scan Complete</h3>
      <div className="help">{helpText}</div>
      <div className="import-options">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={copyMode}
            onChange={(e) => onCopyModeChange(e.target.checked)}
            disabled={isImporting}
          />
          Keep original files (copy instead of move)
        </label>
      </div>
      <Button className='primary' onClick={onImportClick} isLoading={isImporting}>
        {buttonText}
      </Button>
    </div>
  );
}

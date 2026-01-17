import Button from '../../commons/components/Button.jsx';
import './ScanResultsCard.css';

export default function ScanResultsCard({ results, isImporting, importMode, onImportClick, progress }) {
  if (results === null) {
    return null
  }

  const filesToImport = results.filesToImport.length;

  if (filesToImport === 0) {
    let message = 'No new files to import.';
    if (results.alreadyImported > 0) {
      message = `All ${results.alreadyImported.toLocaleString()} files are already in the library.`;
    } else if (results.totalScanned === 0) {
      message = 'No files found in import folder.';
    }

    return (
      <div className="scan-results-card">
        <h3>Scan Complete</h3>
        <div className="help">{message}</div>
      </div>
    );
  }

  let buttonText = importMode === 'copy' ? 'Copy to Library' : 'Move to Library';
  if (isImporting) {
    buttonText = importMode === 'copy' ? 'Copying...' : 'Moving...';
  }

  let helpText = `Found ${filesToImport.toLocaleString()} files to import.`;
  if (results.alreadyImported > 0) {
    helpText += ` ${results.alreadyImported.toLocaleString()} already imported.`;
  }
  if (results.duplicatesRemoved > 0) {
    helpText += ` ${results.duplicatesRemoved.toLocaleString()} duplicates will be skipped.`;
  }

  let progressText = null;
  if (isImporting && progress && progress.status === 'importing') {
    progressText = (
      <div className="import-progress">
        {importMode === 'copy' ? 'Copying' : 'Importing'} {progress.completed.toLocaleString()} / {progress.total.toLocaleString()} ({progress.percent}%)
      </div>
    );
  }

  return (
    <div className="scan-results-card">
      <h3>Scan Complete</h3>
      <div className="help">{helpText}</div>
      <Button className='primary' onClick={onImportClick} isLoading={isImporting}>
        {buttonText}
      </Button>
      {progressText}
    </div>
  );
}

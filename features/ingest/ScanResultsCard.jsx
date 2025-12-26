import Button from '../../commons/components/Button.jsx';
import './ScanResultsCard.css';

export default function ScanResultsCard({ results, onImportClick }) {
  if (results === null) {
    return null
  }

  const filesToImport = results.totalScanned - results.duplicatesRemoved;

  return (
    <div className="scan-results-card">
      <h3>Scan Complete</h3>
      <div className="help">
        Found {filesToImport.toLocaleString()} files to import. {results.duplicatesRemoved > 0 ? `${results.duplicatesRemoved.toLocaleString()} duplicates will be skipped.` : ''}
      </div>
      <Button className='primary' onClick={onImportClick}>
        Import to Library
      </Button>
    </div>
  );
}

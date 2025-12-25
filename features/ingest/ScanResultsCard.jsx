import Button from '../../commons/components/Button.jsx';
import './ScanResultsCard.css';

export default function ScanResultsCard({ results, onImportClick }) {
  if (results === null) {
    return null
  }

  const duplicateCount = results.totalScanned - results.uniqueFiles;

  return (
    <div className="scan-results-card">
      <h3>Scan Complete</h3>
      <div className="help">
        Found {results.uniqueFiles} unique files to import. {duplicateCount > 0 ? `${duplicateCount} duplicates will be skipped.` : ''}
      </div>
      <table className="results-table">
        <tbody>
          <tr>
            <td>Files scanned:</td>
            <td>{results.totalScanned}</td>
          </tr>
          <tr>
            <td>Files to import:</td>
            <td><strong>{results.uniqueFiles}</strong></td>
          </tr>
          <tr>
            <td>Duplicates detected:</td>
            <td>{duplicateCount}</td>
          </tr>
        </tbody>
      </table>
      <Button className='primary' onClick={onImportClick}>
        Import to Library
      </Button>
    </div>
  );
}

import Button from '../../commons/components/Button.jsx';
import './ScanImportCard.css';

export default function ScanImportCard({ isScanning, results, onScanClick }) {
  if (isScanning || results !== null) {
    return null;
  }

  return (
    <div className="scan-card">
      <div className="scan-button">
        <Button className='primary' onClick={onScanClick} disabled={isScanning}>
          Scan Import Folder
        </Button>
      </div>

      <div className="help">Scan analyzes your import folder for duplicates without moving files.<br />Review results before importing.</div>
    </div>
  );
}
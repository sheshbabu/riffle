import Button from '../../commons/components/Button.jsx';
import './ScanImportCard.css';

export default function ScanImportCard({ isScanning, onScanClick }) {
  const buttonText = isScanning ? 'Scanning...' : 'Scan Import Folder';

  return (
    <div className="scan-card">
      <div className="scan-button">
        <Button className='primary' onClick={onScanClick} disabled={isScanning}>
          {buttonText}
        </Button>
      </div>
      <div className="help">Scan analyzes your import folder for duplicates without moving files.<br />Review results before importing.</div>
    </div>
  );
}

import ApiClient from '../../commons/http/ApiClient.js';
import ScanImportCard from './ScanImportCard.jsx';
import ScanProgressCard from './ScanProgressCard.jsx';
import ScanResultsCard from './ScanResultsCard.jsx';
import DuplicateGroups from './DuplicateGroups.jsx';

const { useState, useEffect } = React;

export default function ImportPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!isScanning && !isImporting) {
      return;
    }

    const pollInterval = setInterval(async () => {
      if (isScanning) {
        try {
          const progressData = await ApiClient.getScanProgress();
          setProgress(progressData);

          if (progressData.status === 'complete') {
            const data = await ApiClient.getScanResults();
            setResults(data);
            setIsScanning(false);
            setProgress(null);
          }
        } catch (error) {
          // Progress not ready yet, keep polling
        }
      } else if (isImporting) {
        try {
          const data = await ApiClient.getScanResults();
          setResults(data);

          if (data.movedToLibrary > 0 || data.movedToTrash > 0) {
            setIsImporting(false);
          }
        } catch (error) {
          // Results not ready yet, keep polling
        }
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [isScanning, isImporting]);

  async function handleScanClick() {
    setIsScanning(true);
    setResults(null);

    try {
      await ApiClient.scanImportFolder({});
    } catch (error) {
      setIsScanning(false);
    }
  }

  async function handleImport() {
    setIsImporting(true);

    try {
      await ApiClient.importToLibrary({});
    } catch (error) {
      setIsImporting(false);
    }
  }

  let statsElement = null;
  if (results) {
    statsElement = <ScanResultsCard stats={results} />;
  }

  const importButtonText = isImporting ? 'Importing...' : 'Import to Library';

  return (
    <div className="page-container">
      <ScanImportCard isScanning={isScanning} results={results} onScanClick={handleScanClick} />
      <ScanProgressCard isScanning={isScanning} progress={progress} />
      {statsElement}
      <DuplicateGroups duplicates={results?.duplicates} importPath={results?.importPath} onImport={handleImport} isImporting={isImporting} importButtonText={importButtonText} hasResults={results != null} />
    </div>
  );
}

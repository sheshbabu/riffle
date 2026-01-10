import ApiClient from '../../commons/http/ApiClient.js';
import { showToast } from '../../commons/components/Toast.jsx';
import { navigateTo } from '../../commons/components/Link.jsx';
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
  const [copyMode, setCopyMode] = useState(false);

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
            const resultsData = await ApiClient.getScanResults();
            setResults(resultsData);
            setIsScanning(false);
            setProgress(null);
          }
        } catch (error) {
          // Progress not ready yet, keep polling
        }
      } else if (isImporting) {
        try {
          const resultsData = await ApiClient.getScanResults();
          setResults(resultsData);

          if (resultsData.movedToLibrary > 0) {
            setIsImporting(false);
            const action = copyMode ? 'Copied' : 'Imported';
            showToast(`${action} ${resultsData.movedToLibrary.toLocaleString()} files to library`);
            navigateTo('/curate');
          }
        } catch (error) {
          // Results not ready yet, keep polling
        }
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [isScanning, isImporting, copyMode]);

  async function handleScanClick() {
    setIsScanning(true);
    setResults(null);
    setProgress({ status: 'scanning', completed: 0, total: 0, percent: 0 });

    try {
      await ApiClient.scanImportFolder({});
    } catch (error) {
      setIsScanning(false);
      setProgress(null);
    }
  }

  async function handleImportClick() {
    setIsImporting(true);

    try {
      await ApiClient.importToLibrary(copyMode);
    } catch (error) {
      setIsImporting(false);
    }
  }

  function handleCopyModeChange(value) {
    setCopyMode(value);
  }

  return (
    <div className="page-container">
      <ScanImportCard isScanning={isScanning} results={results} onScanClick={handleScanClick} />
      <ScanProgressCard isScanning={isScanning} progress={progress} />
      <ScanResultsCard results={results} isImporting={isImporting} copyMode={copyMode} onCopyModeChange={handleCopyModeChange} onImportClick={handleImportClick} />
      <DuplicateGroups duplicates={results?.duplicates} importPath={results?.importPath} hasResults={results != null} />
    </div>
  );
}

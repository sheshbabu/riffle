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
  const [importMode, setImportMode] = useState('move');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const settings = await ApiClient.getSettings();
      setImportMode(settings.import_mode || 'move');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  useEffect(() => {
    if (!isScanning && !isImporting) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const progressData = await ApiClient.getImportProgress();
        setProgress(progressData);

        if (isScanning && progressData.status === 'scanning_complete') {
          const resultsData = await ApiClient.getScanResults();
          setResults(resultsData);
          setIsScanning(false);
        }

        if (isImporting && progressData.status === 'importing_complete') {
          const resultsData = await ApiClient.getScanResults();
          setIsImporting(false);
          setProgress(null);
          const action = importMode === 'copy' ? 'Copied' : 'Moved';
          showToast(`${action} ${resultsData.movedToLibrary.toLocaleString()} files to library`);
          navigateTo('/curate');
        }
      } catch (error) {
        // Progress not ready yet, keep polling
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [isScanning, isImporting, importMode]);

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
      await ApiClient.importToLibrary();
    } catch (error) {
      setIsImporting(false);
    }
  }

  return (
    <div className="page-container">
      <ScanImportCard isScanning={isScanning} results={results} onScanClick={handleScanClick} />
      <ScanProgressCard isScanning={isScanning} progress={progress} />
      <ScanResultsCard results={results} isImporting={isImporting} importMode={importMode} onImportClick={handleImportClick} progress={progress} />
      <DuplicateGroups duplicates={results?.duplicates} importPath={results?.importPath} hasResults={results != null} />
    </div>
  );
}

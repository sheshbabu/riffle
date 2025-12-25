import ApiClient from '../../commons/http/ApiClient.js';
import ScanImportCard from './ScanImportCard.jsx';
import ImportAnalysisStats from './ImportAnalysisStats.jsx';
import DuplicateGroups from './DuplicateGroups.jsx';

const { useState, useEffect } = React;

export default function ImportPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!isScanning && !isImporting) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const data = await ApiClient.getImportAnalysis();
        setResults(data);

        if (isScanning) {
          setIsScanning(false);
          setMessage('Analysis completed!');
        }

        if (isImporting) {
          setIsImporting(false);
          setMessage('Import completed!');
        }
      } catch (error) {
        // Results not ready yet, keep polling
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isScanning, isImporting]);

  async function handleScanClick() {
    setIsScanning(true);
    setMessage('Scanning import folder...');
    setResults(null);

    try {
      const response = await ApiClient.analyzeImport({});

      setMessage(response.message || 'Scan started');
    } catch (error) {
      setMessage(error.message || 'Failed to start analysis');
      setIsScanning(false);
    }
  }

  async function handleImport() {
    setIsImporting(true);
    setMessage('Importing photos...');

    try {
      const response = await ApiClient.importToLibrary({});

      setMessage(response.message || 'Import started');
    } catch (error) {
      setMessage(error.message || 'Failed to import');
      setIsImporting(false);
    }
  }

  /**
   * Show "Scan Import Folder" first
   * Once the results have come, hide the above button
   * Show the "Import to Library" button next with results and duplicates
   */

  let messageElement = null;
  if (message) {
    messageElement = (
      <div className="message-box">
        {message}
      </div>
    );
  }

  let statsElement = null;
  if (results) {
    statsElement = <ImportAnalysisStats stats={results} />;
  }

  const importButtonText = isImporting ? 'Importing...' : 'Import to Library';

  return (
    <div className="page-container">
      <ScanImportCard isScanning={isScanning} onScanClick={handleScanClick} />
      {messageElement}
      {statsElement}
      <DuplicateGroups duplicates={results?.duplicates} importPath={results?.importPath} onImport={handleImport} isImporting={isImporting} importButtonText={importButtonText} hasResults={results != null} />
    </div>
  );
}

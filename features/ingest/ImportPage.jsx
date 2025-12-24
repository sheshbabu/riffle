import ApiClient from '../../commons/http/ApiClient.js';
import ImportForm from './ImportForm.jsx';
import ImportAnalysisStats from './ImportAnalysisStats.jsx';
import DuplicateGroups from './DuplicateGroups.jsx';

const { useState, useEffect } = React;

export default function ImportPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!isAnalyzing && !isImporting) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const data = await ApiClient.getImportAnalysis();
        setResults(data);

        if (isAnalyzing) {
          setIsAnalyzing(false);
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
  }, [isAnalyzing, isImporting]);

  async function handleAnalyze() {
    setIsAnalyzing(true);
    setMessage('Analyzing import folder...');
    setResults(null);

    try {
      const response = await ApiClient.analyzeImport({});

      setMessage(response.message || 'Analysis started');
    } catch (error) {
      setMessage(error.message || 'Failed to start analysis');
      setIsAnalyzing(false);
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

  const analyzeButtonText = isAnalyzing ? 'Analyzing...' : 'Analyze Import Folder';
  const importButtonText = isImporting ? 'Importing...' : 'Import to Library';

  return (
    <div className="page-container">
      <h2>Import</h2>

      <ImportForm
        isAnalyzing={isAnalyzing}
        analyzeButtonText={analyzeButtonText}
        onAnalyze={handleAnalyze}
      />

      {messageElement}
      {statsElement}
      <DuplicateGroups
        duplicates={results?.duplicates}
        importPath={results?.importPath}
        onImport={handleImport}
        isImporting={isImporting}
        importButtonText={importButtonText}
        hasResults={results != null}
      />
    </div>
  );
}

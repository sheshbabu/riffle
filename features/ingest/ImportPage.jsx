import ApiClient from '../../commons/http/ApiClient.js';
import { showToast } from '../../commons/components/Toast.jsx';
import { navigateTo } from '../../commons/components/Link.jsx';
import ImportCard from './ImportCard.jsx';
import DuplicateGroups from './DuplicateGroups.jsx';

const { useState, useEffect } = React;

export default function ImportPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'scanning' | 'importing' | 'complete'
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
    if (phase === 'idle' || phase === 'complete') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const progressData = await ApiClient.getImportProgress();
        setProgress(progressData);

        // Auto-transition from scanning to importing
        if (phase === 'scanning' && progressData.status === 'scanning_complete') {
          setPhase('importing');
          await ApiClient.importToLibrary();
        }

        // Complete importing
        if (phase === 'importing' && progressData.status === 'importing_complete') {
          const resultsData = await ApiClient.getScanResults();
          setResults(resultsData);
          setPhase('complete');
          setIsProcessing(false);
        }
      } catch (error) {
        // Progress not ready yet, keep polling
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [phase, importMode]);

  async function handleImportClick() {
    setIsProcessing(true);
    setPhase('scanning');
    setResults(null);
    setProgress({ status: 'scanning', completed: 0, total: 0, percent: 0 });

    try {
      await ApiClient.scanImportFolder({});
    } catch (error) {
      setIsProcessing(false);
      setPhase('idle');
      setProgress(null);
    }
  }

  function handleImportMoreClick() {
    setPhase('idle');
    setResults(null);
    setProgress(null);
  }

  return (
    <div className="page-container">
      <ImportCard
        isProcessing={isProcessing}
        phase={phase}
        progress={progress}
        results={results}
        importMode={importMode}
        onImportClick={handleImportClick}
        onImportMoreClick={handleImportMoreClick}
      />
      <DuplicateGroups duplicates={results?.duplicates} importPath={results?.importPath} hasResults={results != null} />
    </div>
  );
}

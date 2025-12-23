import './assets/reset.css';
import './assets/index.css';
import ApiClient from './commons/http/ApiClient.js';
import DedupeForm from './features/dedupe/DedupeForm.jsx';
import DedupeStats from './features/dedupe/DedupeStats.jsx';
import DuplicateGroups from './features/dedupe/DuplicateGroups.jsx';

const { useState, useEffect } = React;

function App() {
  const [inboxPath, setInboxPath] = useState('');
  const [libraryPath, setLibraryPath] = useState('');
  const [trashPath, setTrashPath] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!isAnalyzing && !isExecuting) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const data = await ApiClient.getDedupeAnalysis();
        setResults(data);

        if (isAnalyzing) {
          setIsAnalyzing(false);
          setMessage('Analysis completed!');
        }

        if (isExecuting) {
          setIsExecuting(false);
          setMessage('Execution completed!');
        }
      } catch (error) {
        // Results not ready yet, keep polling
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isAnalyzing, isExecuting]);

  async function handleDedupe() {
    if (!inboxPath || !libraryPath || !trashPath) {
      setMessage('Please fill in all folder paths');
      return;
    }

    setIsAnalyzing(true);
    setMessage('Analyzing photos...');
    setResults(null);

    try {
      const response = await ApiClient.dedupe({
        inboxPath,
        libraryPath,
        trashPath
      });

      setMessage(response.message || 'Analysis started successfully');
    } catch (error) {
      setMessage(error.message || 'Failed to start analysis');
      setIsAnalyzing(false);
    }
  }

  async function handleExecute() {
    if (!libraryPath || !trashPath) {
      setMessage('Library and trash paths are required');
      return;
    }

    setIsExecuting(true);
    setMessage('Executing file moves...');

    try {
      const response = await ApiClient.executeDeduplication({
        libraryPath,
        trashPath
      });

      setMessage(response.message || 'Execution started successfully');
    } catch (error) {
      setMessage(error.message || 'Failed to execute');
      setIsExecuting(false);
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
    statsElement = <DedupeStats stats={results} />;
  }

  return (
    <div className="app-container">
      <h1>Riffle</h1>

      <DedupeForm
        inboxPath={inboxPath}
        setInboxPath={setInboxPath}
        libraryPath={libraryPath}
        setLibraryPath={setLibraryPath}
        trashPath={trashPath}
        setTrashPath={setTrashPath}
        isAnalyzing={isAnalyzing}
        onSubmit={handleDedupe}
      />

      {messageElement}
      {statsElement}
      <DuplicateGroups
        duplicates={results?.duplicates}
        onExecute={handleExecute}
        isExecuting={isExecuting}
        hasResults={results != null}
      />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

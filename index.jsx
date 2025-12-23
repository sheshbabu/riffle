import './assets/reset.css';
import './assets/index.css';
import './index.css';
import ApiClient from './commons/http/ApiClient.js';
import DedupeForm from './features/dedupe/DedupeForm.jsx';
import DedupeStats from './features/dedupe/DedupeStats.jsx';
import DuplicateGroups from './features/dedupe/DuplicateGroups.jsx';

const { useState, useEffect } = React;

function App() {
  const [inboxPath, setInboxPath] = useState('');
  const [libraryPath, setLibraryPath] = useState('');
  const [trashPath, setTrashPath] = useState('');
  const [isDryRun, setIsDryRun] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!isProcessing) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const data = await ApiClient.getDedupeResults();
        setResults(data);
        setIsProcessing(false);
        setMessage('Deduplication completed!');
      } catch (error) {
        // Results not ready yet, keep polling
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isProcessing]);

  async function handleDedupe() {
    if (!inboxPath || !libraryPath || !trashPath) {
      setMessage('Please fill in all folder paths');
      return;
    }

    setIsProcessing(true);
    setMessage('Starting deduplication...');
    setResults(null);

    try {
      const response = await ApiClient.dedupe({
        inboxPath,
        libraryPath,
        trashPath,
        isDryRun
      });

      setMessage(response.message || 'Deduplication started successfully');
    } catch (error) {
      setMessage(error.message || 'Failed to start deduplication');
      setIsProcessing(false);
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
        isDryRun={isDryRun}
        setIsDryRun={setIsDryRun}
        isProcessing={isProcessing}
        onSubmit={handleDedupe}
      />

      {messageElement}
      {statsElement}
      <DuplicateGroups duplicates={results?.duplicates} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

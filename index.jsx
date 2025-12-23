import './assets/reset.css';
import './assets/index.css';
import ApiClient from './commons/http/ApiClient.js';
import DedupeForm from './features/dedupe/DedupeForm.jsx';
import DedupeStats from './features/dedupe/DedupeStats.jsx';
import DuplicateGroups from './features/dedupe/DuplicateGroups.jsx';

const { useState, useEffect } = React;

function App() {
  const [enableNearDuplicates, setEnableNearDuplicates] = useState(false);
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
    setIsAnalyzing(true);
    setMessage('Analyzing photos...');
    setResults(null);

    try {
      const response = await ApiClient.dedupe({
        enableNearDuplicates
      });

      setMessage(response.message || 'Analysis started successfully');
    } catch (error) {
      setMessage(error.message || 'Failed to start analysis');
      setIsAnalyzing(false);
    }
  }

  async function handleExecute() {
    setIsExecuting(true);
    setMessage('Executing file moves...');

    try {
      const response = await ApiClient.executeDeduplication({});

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
        enableNearDuplicates={enableNearDuplicates}
        setEnableNearDuplicates={setEnableNearDuplicates}
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

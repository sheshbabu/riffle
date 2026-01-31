import ApiClient from '../../commons/http/ApiClient.js';
import Button from '../../commons/components/Button.jsx';
import ImportTable from './ImportTable.jsx';
import ImportSessionDetail from './ImportSessionDetail.jsx';
import './ImportPage.css';

const { useState, useEffect } = React;
const POLL_INTERVAL = 5 * 1000; // 5s

export default function ImportPage() {
  const [progress, setProgress] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [shouldShowModal, setShouldShowModal] = useState(false); // shows on import click and page nav while active import

  useEffect(() => {
    loadSettings();
    loadImportSessions();
    checkActiveImport();
  }, []);

  useEffect(() => {
    document.title = getProgressTitle(progress);

    if (!hasActiveImport(progress)) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const data = await ApiClient.getImportProgress();
        setProgress(data);
        if (data.status === 'importing_complete') {
          loadImportSessions();
        }
      } catch (error) {
        // Continue
      }
    }, POLL_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [progress]);

  async function checkActiveImport() {
    try {
      const data = await ApiClient.getImportProgress();
      if (hasActiveImport(data)) {
        setProgress(data);
        setShouldShowModal(true);
      }
    } catch (error) {
      // No active import
    }
  }

  async function loadSettings() {
    try {
      const data = await ApiClient.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async function loadImportSessions() {
    try {
      const sessions = await ApiClient.getImportSessions();
      setSessions(sessions);
    } catch (error) {
      console.error('Failed to load import sessions:', error);
    }
  }

  async function handleImportClick() {
    try {
      await ApiClient.startImportSession();
      await checkActiveImport();
    } catch (error) {
      setProgress(null);
    }
  }

  function handleCloseModal() {
    setSelectedSession(null);
    setShouldShowModal(false);
  }

  function handleSessionClick(session) {
    setShouldShowModal(true);
    setSelectedSession(session);
  }

  let mainContent = null;
  if (sessions.length > 0) {
    mainContent = <ImportTable sessions={sessions} onSessionClick={handleSessionClick} />;
  } else {
    mainContent = (
      <div className="import-sessions">
        <div className="import-empty-state">
          <p>No imports yet. Click the Import button above to start your first import</p>
        </div>
      </div>
    );
  }

  let modalContent = null;
  if (shouldShowModal) {
    if (selectedSession !== null) {
      modalContent = (
        <ImportSessionDetail
          session={selectedSession}
          hasCompleted={true}
          importMode={selectedSession.import_mode}
          onClose={handleCloseModal}
        />
      );
    } else if (hasActiveImport(progress)) {
      modalContent = (
        <ImportSessionDetail
          session={progress}
          hasCompleted={false}
          importMode={settings.import_mode}
          onClose={handleCloseModal}
        />
      );
    }
  }

  return (
    <div className="page-container import-page">
      <div className="import-action">
        <Button variant="primary" onClick={handleImportClick} isDisabled={hasActiveImport(progress)}>
          Import
        </Button>
      </div>
      {mainContent}
      {modalContent}
    </div>
  );
}

function getProgressTitle(progress) {
  if (progress === null) {
    return 'riffle';
  }

  let titlePrefix = '';

  if (progress.status === 'scanning') {
    titlePrefix = 'Scanning...';
  } else if (progress.status === 'hashing') {
    titlePrefix = `Hashing ${progress.percent || 0}%`;
  } else if (progress.status === 'checking_imported') {
    titlePrefix = `Checking ${progress.percent || 0}%`;
  } else if (progress.status === 'finding_duplicates') {
    titlePrefix = 'Finding duplicates...';
  } else if (progress.status === 'importing') {
    titlePrefix = `Importing ${progress.percent || 0}%`;
  }

  return titlePrefix ? `${titlePrefix} - riffle` : 'riffle';
}

function hasActiveImport(progress) {
  return progress && progress.status !== '' && progress.status !== 'importing_complete'
}

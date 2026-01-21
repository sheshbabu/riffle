import ApiClient from '../../commons/http/ApiClient.js';
import Badge from '../../commons/components/Badge.jsx';
import Button from '../../commons/components/Button.jsx';
import ImportSessionDetail from './ImportSessionDetail.jsx';
import DuplicateGroups from './DuplicateGroups.jsx';
import formatDateTime from '../../commons/utils/formatDateTime.js';
import '../../commons/components/Badge.css';
import './ImportPage.css';

const { useState, useEffect } = React;

export default function ImportPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'scanning' | 'importing' | 'complete'
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(null);
  const [importMode, setImportMode] = useState('move');
  const [importSessions, setImportSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    loadSettings();
    loadImportSessions();
    checkActiveImport();
  }, []);

  async function checkActiveImport() {
    try {
      const progressData = await ApiClient.getImportProgress();
      if (progressData && progressData.status !== "" && progressData.status !== 'importing_complete') {
        setProgress(progressData);
        setIsProcessing(true);
        setPhase('importing');
        setShowModal(true);
      }
    } catch (error) {
      // No active import
    }
  }

  useEffect(() => {
    document.title = getProgressTitle(phase, progress, importMode);
  }, [phase, progress, importMode]);

  useEffect(() => {
    if (showModal && !progress) {
      setShowModal(false);
    }
  }, [showModal, progress]);

  async function loadSettings() {
    try {
      const settings = await ApiClient.getSettings();
      setImportMode(settings.import_mode || 'move');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async function loadImportSessions() {
    try {
      const sessions = await ApiClient.getImportSessions();
      setImportSessions(sessions);
    } catch (error) {
      console.error('Failed to load import sessions:', error);
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

        // Complete importing
        if (progressData.status === 'importing_complete') {
          setPhase('complete');
          setIsProcessing(false);
          setResults({ imported: true });
          loadImportSessions();
          setShowModal(false);
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
    setShowModal(true);

    try {
      await ApiClient.startImportSession({});
    } catch (error) {
      setIsProcessing(false);
      setPhase('idle');
      setProgress(null);
      setShowModal(false);
    }
  }

  function handleCloseModal() {
    if (!isProcessing) {
      setShowModal(false);
    }
  }

  function handleSessionClick(session) {
    setSelectedSession(session);
  }

  function handleCloseSessionDetail() {
    setSelectedSession(null);
  }

  function renderSessionItem(session) {
    const formattedDateTime = formatDateTime(session.started_at);

    let statusBadge = null;
    if (session.status === 'completed') {
      statusBadge = <Badge variant="success">Completed</Badge>;
    } else if (session.status === 'error') {
      statusBadge = <Badge variant="error">Error</Badge>;
    } else {
      statusBadge = <Badge variant="warning">Running</Badge>;
    }

    let durationText = '';
    if (session.duration_seconds) {
      const seconds = session.duration_seconds;
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      durationText = minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
    }

    const modeText = session.import_mode === 'copy' ? 'Copy' : 'Move';

    let alreadyImportedStat = null;
    if (session.already_imported > 0) {
      alreadyImportedStat = <span>{session.already_imported} already imported</span>;
    }

    let duplicateGroupsStat = null;
    if (session.duplicate_groups > 0) {
      duplicateGroupsStat = <span>{session.duplicate_groups} duplicate groups</span>;
    }

    let errorsStat = null;
    if (session.error_count > 0) {
      errorsStat = <span className="session-errors">{session.error_count} errors</span>;
    }

    let durationStat = null;
    if (durationText) {
      durationStat = <span>{durationText}</span>;
    }

    let errorMessageEl = null;
    if (session.error_message) {
      errorMessageEl = <div className="session-error-message">{session.error_message}</div>;
    }

    return (
      <div key={session.import_id} className="session-item" onClick={() => handleSessionClick(session)}>
        <div className="session-header">
          <div className="session-date">
            {formattedDateTime}
          </div>
          <div className="session-tags">
            <Badge variant="neutral">{modeText}</Badge>
            {statusBadge}
          </div>
        </div>
        <div className="session-details">
          <div className="session-stats">
            <span>{session.moved_to_library}/{session.total_scanned} photos imported</span>
            {alreadyImportedStat}
            {duplicateGroupsStat}
            {errorsStat}
            {durationStat}
          </div>

        </div>
        {errorMessageEl}
      </div>
    );
  }

  let sessionsList = null;
  if (importSessions.length > 0) {
    const sessionsItems = importSessions.map(session => renderSessionItem(session));

    sessionsList = (
      <div className="import-sessions">
        <div className="sessions-list">
          {sessionsItems}
        </div>
      </div>
    );
  } else {
    sessionsList = (
      <div className="import-sessions">
        <div className="import-empty-state">
          <p>No imports yet. Click the Import button above to start your first import.</p>
        </div>
      </div>
    );
  }

  let modalContent = null;
  if (showModal && progress) {
    modalContent = (
      <ImportSessionDetail
        session={progress}
        isLiveProgress={true}
        importMode={importMode}
        onClose={handleCloseModal}
      />
    );
  }

  let sessionDetailModal = null;
  if (selectedSession) {
    sessionDetailModal = (
      <ImportSessionDetail
        session={selectedSession}
        isLiveProgress={false}
        importMode={selectedSession.import_mode}
        onClose={handleCloseSessionDetail}
      />
    );
  }

  return (
    <div className="page-container import-page">
      <div className="import-action">
        <Button variant="primary" onClick={handleImportClick} isDisabled={isProcessing}>
          Import
        </Button>
      </div>
      <DuplicateGroups duplicates={results?.duplicates} importPath={results?.importPath} hasResults={results != null} />
      {sessionsList}
      {modalContent}
      {sessionDetailModal}
    </div>
  );
}

function getProgressTitle(phase, progress) {
  if (phase === 'idle' || phase === 'complete') {
    return 'riffle';
  }

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

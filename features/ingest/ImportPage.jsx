import ApiClient from '../../commons/http/ApiClient.js';
import Badge from '../../commons/components/Badge.jsx';
import Button from '../../commons/components/Button.jsx';
import ImportSessionDetail from './ImportSessionDetail.jsx';
import formatDateTime from '../../commons/utils/formatDateTime.js';
import formatDuration from '../../commons/utils/formatDuration.js';
import '../../commons/components/Badge.css';
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
      await ApiClient.startImportSession({});
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

    const durationText = formatDuration(session.duration_seconds);

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
            <Badge variant="neutral">{session.import_mode}</Badge>
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
  if (sessions.length > 0) {
    const sessionsItems = sessions.map(session => renderSessionItem(session));

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
      {sessionsList}
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

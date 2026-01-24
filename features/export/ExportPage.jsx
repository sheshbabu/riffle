import ApiClient from '../../commons/http/ApiClient.js';
import Button from '../../commons/components/Button.jsx';
import Badge from '../../commons/components/Badge.jsx';
import ExportSessionDetail from './ExportSessionDetail.jsx';
import formatDateTime from '../../commons/utils/formatDateTime.js';
import formatDuration from '../../commons/utils/formatDuration.js';
import '../../commons/components/Badge.css';
import './ExportPage.css';

const { useState, useEffect } = React;
const POLL_INTERVAL = 5 * 1000; // 5s

export default function ExportPage() {
  const [progress, setProgress] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [shouldShowModal, setShouldShowModal] = useState(false);

  useEffect(() => {
    loadExportSessions();
    checkActiveExport();
  }, []);

  useEffect(() => {
    if (!hasActiveExport(progress)) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const data = await ApiClient.getExportProgress();
        setProgress(data);
        if (data.status === 'export_complete' || data.status === 'export_error') {
          loadExportSessions();
        }
      } catch (error) {
        // Continue
      }
    }, POLL_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [progress]);

  async function checkActiveExport() {
    try {
      const data = await ApiClient.getExportProgress();
      if (hasActiveExport(data)) {
        setProgress(data);
        setShouldShowModal(true);
      }
    } catch (error) {
      // No active export
    }
  }

  async function loadExportSessions() {
    try {
      const sessions = await ApiClient.getExportSessions();
      setSessions(sessions);
    } catch (error) {
      console.error('Failed to load export sessions:', error);
    }
  }

  async function handleStartExport() {
    try {
      await ApiClient.startExportSession();
      await checkActiveExport();
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

  let modalContent = null;
  if (shouldShowModal) {
    if (hasActiveExport(progress)) {
      modalContent = (
        <ExportSessionDetail
          session={progress}
          hasCompleted={false}
          onClose={handleCloseModal}
        />
      );
    } else if (selectedSession !== null) {
      modalContent = (
        <ExportSessionDetail
          session={selectedSession}
          hasCompleted={true}
          onClose={handleCloseModal}
        />
      );
    }
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

    let criteriaText = `Rating ≥ ${session.min_rating}`;
    if (session.curation_status) {
      criteriaText += session.curation_status === 'pick' ? ', Picked only' : ', All photos';
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
      <div key={session.export_id} className="session-item" onClick={() => handleSessionClick(session)}>
        <div className="session-header">
          <div className="session-date">
            {formattedDateTime}
          </div>
          <div className="session-tags">
            <Badge variant="neutral">{criteriaText}</Badge>
            {statusBadge}
          </div>
        </div>
        <div className="session-details">
          <div className="session-stats">
            <span>{session.exported_photos}/{session.total_photos} photos exported</span>
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
      <div className="export-sessions">
        <div className="sessions-list">
          {sessionsItems}
        </div>
      </div>
    );
  } else {
    sessionsList = (
      <div className="export-sessions">
        <div className="export-empty-state">
          <p>No exports yet. Click the Export button above to start your first export.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container export-page">
      <div className="export-content">
        <div className="export-action">
          <Button variant="primary" onClick={handleStartExport} isDisabled={hasActiveExport(progress)}>
            Export
          </Button>
        </div>
        {sessionsList}
      </div>
      {modalContent}
    </div>
  );
}

function hasActiveExport(progress) {
  return progress && progress.status !== '' && progress.status !== 'export_complete' && progress.status !== 'export_error';
}

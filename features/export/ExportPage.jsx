import ApiClient from '../../commons/http/ApiClient.js';
import Button from '../../commons/components/Button.jsx';
import ExportTable from './ExportTable.jsx';
import ExportSessionDetail from './ExportSessionDetail.jsx';
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

  let mainContent = null;
  if (sessions.length > 0) {
    mainContent = <ExportTable sessions={sessions} onSessionClick={handleSessionClick} />;
  } else {
    mainContent = (
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
        {mainContent}
      </div>
      {modalContent}
    </div>
  );
}

function hasActiveExport(progress) {
  return progress && progress.status !== '' && progress.status !== 'export_complete' && progress.status !== 'export_error';
}

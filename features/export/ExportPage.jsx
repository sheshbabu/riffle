import ApiClient from '../../commons/http/ApiClient.js';
import Button from '../../commons/components/Button.jsx';
import { ModalBackdrop, ModalContainer, ModalHeader, ModalContent, ModalFooter } from '../../commons/components/Modal.jsx';
import { showToast } from '../../commons/components/Toast.jsx';
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
  const [shouldShowCleanupConfirm, setShouldShowCleanupConfirm] = useState(false);

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
        if (data.status === 'export_complete') {
          loadExportSessions();
          const count = data.current;
          showToast(`Exported ${count} ${pluralize(count, 'photo')}`);
        } else if (data.status === 'export_error') {
          loadExportSessions();
          const errorMsg = data.message || 'Unknown error';
          showToast(`Export failed: ${errorMsg}`);
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
      const settings = await ApiClient.getSettings();
      const cleanupEnabled = settings.export_cleanup_enabled === 'true';

      if (cleanupEnabled) {
        setShouldShowCleanupConfirm(true);
      } else {
        startExport();
      }
    } catch (error) {
      console.error('Failed to check export settings:', error);
      startExport();
    }
  }

  async function startExport() {
    try {
      await ApiClient.startExportSession();
      await checkActiveExport();
    } catch (error) {
      setProgress(null);
    }
  }

  function handleConfirmCleanup() {
    setShouldShowCleanupConfirm(false);
    startExport();
  }

  function handleCancelCleanup() {
    setShouldShowCleanupConfirm(false);
  }

  function handleCloseModal() {
    setSelectedSession(null);
    setShouldShowModal(false);
  }

  function handleSessionClick(session) {
    setShouldShowModal(true);
    setSelectedSession(session);
  }

  let cleanupConfirmModal = null;
  if (shouldShowCleanupConfirm) {
    cleanupConfirmModal = (
      <ModalBackdrop onClose={handleCancelCleanup}>
        <ModalContainer>
          <ModalHeader title="Confirm Export Cleanup" onClose={handleCancelCleanup} />
          <ModalContent>
            <p className="modal-description">Clear export folder is enabled. All existing files will be <b>permanently deleted</b> before export.</p>
            <p className="modal-description">Continue with export?</p>
          </ModalContent>
          <ModalFooter isRightAligned={true}>
            <Button variant="secondary" onClick={handleCancelCleanup}>Cancel</Button>
            <Button variant="primary" onClick={handleConfirmCleanup}>Continue</Button>
          </ModalFooter>
        </ModalContainer>
      </ModalBackdrop>
    );
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
          <p>No exports yet. Click the Export button above to start your first export</p>
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
      {cleanupConfirmModal}
      {modalContent}
    </div>
  );
}

function hasActiveExport(progress) {
  return progress && progress.status !== '' && progress.status !== 'export_complete' && progress.status !== 'export_error';
}

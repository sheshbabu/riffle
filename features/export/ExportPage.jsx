import ApiClient from '../../commons/http/ApiClient.js';
import Button from '../../commons/components/Button.jsx';
import Badge from '../../commons/components/Badge.jsx';
import ExportSessionDetail from './ExportSessionDetail.jsx';
import formatDateTime from '../../commons/utils/formatDateTime.js';
import formatDuration from '../../commons/utils/formatDuration.js';
import '../../commons/components/Badge.css';
import './ExportPage.css';

const { useState, useEffect } = React;

export default function ExportPage() {
  const [minRating, setMinRating] = useState('0');
  const [curationStatus, setCurationStatus] = useState('pick');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(null);
  const [exportSessions, setExportSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    loadSettings();
    loadExportSessions();
    checkActiveExport();
  }, []);

  async function checkActiveExport() {
    try {
      const progressData = await ApiClient.getExportProgress();
      if (progressData && progressData.status !== '' && progressData.status !== 'export_complete' && progressData.status !== 'export_error') {
        setExportProgress(progressData);
        setIsExporting(true);
        setShowModal(true);
      }
    } catch (error) {
      // No active export
    }
  }

  useEffect(() => {
    if (showModal && !exportProgress) {
      setShowModal(false);
    }
  }, [showModal, exportProgress]);

  useEffect(() => {
    let intervalId;
    if (isExporting) {
      intervalId = setInterval(pollExportProgress, 1000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isExporting]);

  async function loadSettings() {
    try {
      const settings = await ApiClient.getSettings();
      setMinRating(settings.export_min_rating || '0');
      setCurationStatus(settings.export_curation_status || 'pick');
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadExportSessions() {
    try {
      const sessions = await ApiClient.getExportSessions();
      setExportSessions(sessions);
    } catch (error) {
      console.error('Failed to load export sessions:', error);
    }
  }

  async function handleStartExport() {
    try {
      setIsExporting(true);
      setShowModal(true);
      setExportProgress(null);
      await ApiClient.startExportSession(parseInt(minRating), curationStatus);
    } catch (error) {
      console.error('Failed to start export:', error);
      setIsExporting(false);
      setShowModal(false);
    }
  }

  async function pollExportProgress() {
    try {
      const progress = await ApiClient.getExportProgress();
      setExportProgress(progress);

      if (progress.status === 'export_complete' || progress.status === 'export_error') {
        setIsExporting(false);
        loadExportSessions();
      }
    } catch (error) {
      console.error('Failed to poll export progress:', error);
    }
  }

  function handleCloseModal() {
    if (!isExporting) {
      setShowModal(false);
      setExportProgress(null);
    }
  }

  function handleSessionClick(session) {
    setSelectedSession(session);
  }

  function handleCloseSessionDetail() {
    setSelectedSession(null);
  }

  if (isLoading) {
    return (
      <div className="export-page">
        <p>Loading...</p>
      </div>
    );
  }

  let modalContent = null;
  if (showModal && exportProgress) {
    modalContent = (
      <ExportSessionDetail
        session={exportProgress}
        isLiveProgress={true}
        onClose={handleCloseModal}
      />
    );
  }

  let sessionDetailModal = null;
  if (selectedSession) {
    sessionDetailModal = (
      <ExportSessionDetail
        session={selectedSession}
        isLiveProgress={false}
        onClose={handleCloseSessionDetail}
      />
    );
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
  if (exportSessions.length > 0) {
    const sessionsItems = exportSessions.map(session => renderSessionItem(session));

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
          <Button variant="primary" onClick={handleStartExport} isDisabled={isExporting}>
            Export
          </Button>
        </div>
        {sessionsList}
      </div>
      {modalContent}
      {sessionDetailModal}
    </div>
  );
}

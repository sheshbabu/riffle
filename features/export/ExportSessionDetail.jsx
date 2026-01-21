import { LoadingSpinner } from '../../commons/components/Icon.jsx';
import { ModalBackdrop, ModalContainer, ModalContent } from '../../commons/components/Modal.jsx';
import Badge from '../../commons/components/Badge.jsx';
import formatDateTime from '../../commons/utils/formatDateTime.js';

export default function ExportSessionDetail({
  session,
  isLiveProgress = false,
  onClose
}) {
  let modalBody = null;
  let title = 'Export Details';
  let canClose = true;

  if (isLiveProgress) {
    title = 'Export Progress';
    canClose = session.status === 'export_complete' || session.status === 'export_error';

    if (session.status === 'export_complete') {
      modalBody = (
        <div className="export-message export-message-success">
          {session.message}
        </div>
      );
    } else if (session.status === 'export_error') {
      modalBody = (
        <div className="export-message export-message-error">
          Export failed: {session.message}
        </div>
      );
    } else {
      let statusText = session.message || 'Processing...';

      let progressCount = null;
      if (session.total > 0) {
        progressCount = (
          <div className="export-progress-count">
            {session.completed} / {session.total}
          </div>
        );
      }

      modalBody = (
        <div className="export-progress-section">
          <div className="export-progress-content">
            <LoadingSpinner size={20} />
            <div className="export-progress-text">
              <div>{statusText}</div>
              {progressCount}
            </div>
          </div>
        </div>
      );
    }
  } else if (session) {
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
      const minutes = Math.floor(session.duration_seconds / 60);
      const seconds = session.duration_seconds % 60;
      durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    }

    let criteriaText = `Rating ≥ ${session.min_rating}`;
    if (session.curation_status) {
      criteriaText += session.curation_status === 'pick' ? ', Picked only' : ', All photos';
    }

    let errorMessageEl = null;
    if (session.error_message) {
      errorMessageEl = (
        <div className="session-detail-section">
          <div className="session-detail-label">Error</div>
          <div className="session-detail-value session-detail-error">{session.error_message}</div>
        </div>
      );
    }

    modalBody = (
      <div className="session-detail-container">
        <div className="session-detail-header">
          <div className="session-detail-date">{formattedDateTime}</div>
          <div className="session-detail-badges">
            <Badge variant="neutral">{criteriaText}</Badge>
            {statusBadge}
          </div>
        </div>

        <div className="session-detail-section">
          <div className="session-detail-label">Exported Photos</div>
          <div className="session-detail-value">{session.exported_photos} / {session.total_photos}</div>
        </div>

        {session.error_count > 0 && (
          <div className="session-detail-section">
            <div className="session-detail-label">Errors</div>
            <div className="session-detail-value session-detail-error">{session.error_count}</div>
          </div>
        )}

        {durationText && (
          <div className="session-detail-section">
            <div className="session-detail-label">Duration</div>
            <div className="session-detail-value">{durationText}</div>
          </div>
        )}

        {errorMessageEl}
      </div>
    );
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalContainer>
        <ModalContent>
          {modalBody}
        </ModalContent>
      </ModalContainer>
    </ModalBackdrop>
  );
}

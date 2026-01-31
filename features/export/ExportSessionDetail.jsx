import { LoadingSpinner } from '../../commons/components/Icon.jsx';
import { ModalBackdrop, ModalContainer, ModalContent } from '../../commons/components/Modal.jsx';
import Badge from '../../commons/components/Badge.jsx';
import { DescriptionList, DescriptionItem } from '../../commons/components/DescriptionList.jsx';
import formatDateTime from '../../commons/utils/formatDateTime.js';

export default function ExportSessionDetail({ session, hasCompleted = true, onClose }) {
  let modalBody = null;

  if (!hasCompleted) {
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

    let durationEl = null;
    if (durationText) {
      durationEl = <DescriptionItem label="Duration" value={durationText} />;
    }

    let errorsEl = null;
    if (session.error_count > 0) {
      errorsEl = (
        <DescriptionItem label="Errors">
          <span className="session-detail-error">{session.error_count}</span>
        </DescriptionItem>
      );
    }

    let errorMessageEl = null;
    if (session.error_message) {
      errorMessageEl = (
        <DescriptionItem label="Error">
          <span className="session-detail-error">{session.error_message}</span>
        </DescriptionItem>
      );
    }

    modalBody = (
      <DescriptionList className="session-detail-container">
        <DescriptionItem label="Date" value={formattedDateTime} />
        <DescriptionItem label="Destination Folder" value={session.export_path} />
        <DescriptionItem label="Criteria" value={criteriaText} />
        {durationEl}
        <DescriptionItem label="Status">{statusBadge}</DescriptionItem>
        <DescriptionItem label="Exported Photos" value={`${session.exported_photos}/${session.total_photos}`} />
        {errorsEl}
        {errorMessageEl}
      </DescriptionList>
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

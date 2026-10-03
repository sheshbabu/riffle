import { LoadingSpinner } from '../../commons/components/Icon.jsx';
import { ModalBackdrop, ModalContainer, ModalContent } from '../../commons/components/Modal.jsx';
import StatusBadge from '../../commons/components/StatusBadge.jsx';
import Alert from '../../commons/components/Alert.jsx';
import { DescriptionList, DescriptionItem } from '../../commons/components/DescriptionList.jsx';
import formatDateTime from '../../commons/utils/formatDateTime.js';

export default function ExportSessionDetail({ session, hasCompleted = true, onClose }) {
  let modalBody = null;

  if (!hasCompleted) {
    if (session.status === 'export_complete') {
      modalBody = <Alert variant="success">{session.message}</Alert>;
    } else if (session.status === 'export_error') {
      modalBody = <Alert variant="error">Export failed: {session.message}</Alert>;
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
    const formattedDateTime = formatDateTime(session.startedAt);

    let durationText = '';
    if (session.durationSeconds) {
      const minutes = Math.floor(session.durationSeconds / 60);
      const seconds = session.durationSeconds % 60;
      durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    }

    let criteriaText = `Rating ≥ ${session.minRating}`;
    if (session.curationStatus) {
      criteriaText += session.curationStatus === 'pick' ? ', Picked only' : ', All photos';
    }

    let durationEl = null;
    if (durationText) {
      durationEl = <DescriptionItem label="Duration" value={durationText} />;
    }

    let errorsEl = null;
    if (session.errorCount > 0) {
      errorsEl = (
        <DescriptionItem label="Errors">
          <span className="session-detail-error">{session.errorCount}</span>
        </DescriptionItem>
      );
    }

    let errorMessageEl = null;
    if (session.errorMessage) {
      errorMessageEl = (
        <DescriptionItem label="Error">
          <span className="session-detail-error">{session.errorMessage}</span>
        </DescriptionItem>
      );
    }

    modalBody = (
      <DescriptionList className="session-detail-container">
        <DescriptionItem label="Date" value={formattedDateTime} />
        <DescriptionItem label="Destination Folder" value={session.exportPath} />
        <DescriptionItem label="Criteria" value={criteriaText} />
        {durationEl}
        <DescriptionItem label="Status">
          <StatusBadge status={session.status} />
        </DescriptionItem>
        <DescriptionItem label="Exported Photos" value={`${session.exportedPhotos}/${session.totalPhotos}`} />
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

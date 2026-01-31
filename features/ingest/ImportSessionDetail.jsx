import { TaskDoneIcon, TaskInProgressIcon, TaskNotStartedIcon } from '../../commons/components/Icon.jsx';
import { ModalBackdrop, ModalContainer, ModalContent } from '../../commons/components/Modal.jsx';
import Badge from '../../commons/components/Badge.jsx';
import { DescriptionList, DescriptionItem } from '../../commons/components/DescriptionList.jsx';
import formatDateTime from '../../commons/utils/formatDateTime.js';
import formatCount from '../../commons/utils/formatCount.js';

const stepOrder = ["scanning", "hashing", "checking_imported", "finding_duplicates", "scanning_complete", "importing", "importing_complete"];

export default function ImportSessionDetail({ session, hasCompleted = true, importMode, onClose }) {
  let modalBody = null;

  if (!hasCompleted) {
    modalBody = (
      <div className="import-progress-container">
        <div className="import-help">This may take a few minutes depending on folder size.</div>
        <div className="import-steps">
          <StatusLine stepStatus="scanning" progress={session} />
          <StatusLine stepStatus="hashing" progress={session} />
          <StatusLine stepStatus="checking_imported" progress={session} />
          <StatusLine stepStatus="finding_duplicates" progress={session} />
          <StatusLine stepStatus="importing" progress={session} importMode={importMode} />
        </div>
      </div>
    );
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

    const modeText = session.import_mode === 'copy' ? 'Copy' : 'Move';

    let uniqueFilesEl = null;
    if (session.unique_files > 0) {
      uniqueFilesEl = <DescriptionItem label="Unique Files" value={session.unique_files} />;
    }

    let duplicatesRemovedEl = null;
    if (session.duplicates_removed > 0) {
      duplicatesRemovedEl = <DescriptionItem label="Duplicates Removed" value={session.duplicates_removed} />;
    }

    let duplicateGroupsEl = null;
    if (session.duplicate_groups > 0) {
      duplicateGroupsEl = <DescriptionItem label="Duplicate Groups" value={session.duplicate_groups} />;
    }

    let alreadyImportedEl = null;
    if (session.already_imported > 0) {
      alreadyImportedEl = <DescriptionItem label="Already Imported" value={session.already_imported} />;
    }

    let errorsEl = null;
    if (session.error_count > 0) {
      errorsEl = (
        <DescriptionItem label="Errors">
          <span className="session-detail-error">{session.error_count}</span>
        </DescriptionItem>
      );
    }

    let durationEl = null;
    if (durationText) {
      durationEl = <DescriptionItem label="Duration" value={durationText} />;
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
        <DescriptionItem label="Source Folder" value={session.import_path} />
        <DescriptionItem label="Import Mode" value={modeText} />
        {durationEl}
        <DescriptionItem label="Status">{statusBadge}</DescriptionItem>
        <DescriptionItem label="Total Scanned" value={session.total_scanned} />
        {uniqueFilesEl}
        {duplicatesRemovedEl}
        {duplicateGroupsEl}
        {alreadyImportedEl}
        <DescriptionItem label="Moved to Library" value={session.moved_to_library} />
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

function StatusLine({ stepStatus, progress, importMode }) {
  const currentStepIndex = stepOrder.indexOf(stepStatus);
  const progressingStepIndex = stepOrder.indexOf(progress?.status || '');

  let icon = null;
  let stepName = "";
  let subText = <div className="import-step-subtext">Not started</div>;

  if (currentStepIndex < progressingStepIndex) {
    icon = <div className="import-step-done"><TaskDoneIcon /></div>;
  } else if (currentStepIndex === progressingStepIndex) {
    icon = <div className="import-step-inprogress"><TaskInProgressIcon /></div>;
  } else {
    icon = <div className="import-step-notstarted"><TaskNotStartedIcon /></div>;
  }

  if (stepStatus === "scanning") {
    stepName = "Discovering files";
    if (currentStepIndex < progressingStepIndex) {
      subText = <div className="import-step-subtext">{`Found ${formatCount(progress?.total, 0)} photos and videos`}</div>;
    } else if (currentStepIndex === progressingStepIndex) {
      subText = <div className="import-step-subtext">Scanning...</div>;
    }
  }

  if (stepStatus === "hashing") {
    stepName = "Computing hashes";
    if (currentStepIndex < progressingStepIndex) {
      subText = <div className="import-step-subtext">Finished</div>;
    } else if (currentStepIndex === progressingStepIndex) {
      subText = <div className="import-step-subtext">{`Processing ${formatCount(progress?.completed, 0)} / ${formatCount(progress?.total, 0)} (${progress?.percent || 0}%)`}</div>;
    }
  }

  if (stepStatus === "checking_imported") {
    stepName = "Matching with library";
    if (currentStepIndex < progressingStepIndex) {
      subText = <div className="import-step-subtext">Finished</div>;
    } else if (currentStepIndex === progressingStepIndex) {
      subText = <div className="import-step-subtext">{`Checking ${formatCount(progress?.completed, 0)} / ${formatCount(progress?.total, 0)} (${progress?.percent || 0}%)`}</div>;
    }
  }

  if (stepStatus === "finding_duplicates") {
    stepName = "Finding duplicates";
    if (currentStepIndex < progressingStepIndex) {
      subText = <div className="import-step-subtext">Finished</div>;
    }
  }

  if (stepStatus === "importing") {
    stepName = importMode === 'copy' ? "Copying files" : "Moving files";
    if (currentStepIndex < progressingStepIndex) {
      subText = <div className="import-step-subtext">Finished</div>;
    } else if (currentStepIndex === progressingStepIndex) {
      subText = <div className="import-step-subtext">{`${importMode === 'copy' ? 'Copying' : 'Moving'} ${formatCount(progress?.completed, 0)} / ${formatCount(progress?.total, 0)} (${progress?.percent || 0}%)`}</div>;
    }
  }

  return (
    <div className="import-step-container">
      {icon}
      <div>
        <div>{stepName}</div>
        {subText}
      </div>
    </div>
  );
}

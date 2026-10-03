import { TaskDoneIcon, TaskInProgressIcon, TaskNotStartedIcon } from '../../commons/components/Icon.jsx';
import { ModalBackdrop, ModalContainer, ModalContent } from '../../commons/components/Modal.jsx';
import StatusBadge from '../../commons/components/StatusBadge.jsx';
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
    const formattedDateTime = formatDateTime(session.startedAt);

    let durationText = '';
    if (session.durationSeconds) {
      const minutes = Math.floor(session.durationSeconds / 60);
      const seconds = session.durationSeconds % 60;
      durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    }

    const modeText = session.importMode === 'copy' ? 'Copy' : 'Move';

    let uniqueFilesEl = null;
    if (session.uniqueFiles > 0) {
      uniqueFilesEl = <DescriptionItem label="Unique Files" value={session.uniqueFiles} />;
    }

    let duplicatesRemovedEl = null;
    if (session.duplicatesRemoved > 0) {
      duplicatesRemovedEl = <DescriptionItem label="Duplicates Removed" value={session.duplicatesRemoved} />;
    }

    let duplicateGroupsEl = null;
    if (session.duplicateGroups > 0) {
      duplicateGroupsEl = <DescriptionItem label="Duplicate Groups" value={session.duplicateGroups} />;
    }

    let alreadyImportedEl = null;
    if (session.alreadyImported > 0) {
      alreadyImportedEl = <DescriptionItem label="Already Imported" value={session.alreadyImported} />;
    }

    let errorsEl = null;
    if (session.errorCount > 0) {
      errorsEl = (
        <DescriptionItem label="Errors">
          <span className="session-detail-error">{session.errorCount}</span>
        </DescriptionItem>
      );
    }

    let durationEl = null;
    if (durationText) {
      durationEl = <DescriptionItem label="Duration" value={durationText} />;
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
        <DescriptionItem label="Source Folder" value={session.importPath} />
        <DescriptionItem label="Import Mode" value={modeText} />
        {durationEl}
        <DescriptionItem label="Status">
          <StatusBadge status={session.status} />
        </DescriptionItem>
        <DescriptionItem label="Total Scanned" value={session.totalScanned} />
        {uniqueFilesEl}
        {duplicatesRemovedEl}
        {duplicateGroupsEl}
        {alreadyImportedEl}
        <DescriptionItem label="Moved to Library" value={session.movedToLibrary} />
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

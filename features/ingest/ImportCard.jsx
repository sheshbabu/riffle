import Button from '../../commons/components/Button.jsx';
import { TaskDoneIcon, TaskInProgressIcon, TaskNotStartedIcon } from '../../commons/components/Icon.jsx';
import { navigateTo } from '../../commons/components/Link.jsx';
import './ImportCard.css';

const stepOrder = ["scanning", "hashing", "checking_imported", "finding_duplicates", "scanning_complete", "importing", "importing_complete"];

export default function ImportCard({
  isProcessing,
  phase,
  progress,
  results,
  importMode,
  onImportClick,
  onImportMoreClick
}) {
  if (phase === 'idle') {
    return (
      <div className="import-card-initial">
        <div className="import-button">
          <Button className='primary' onClick={onImportClick} disabled={isProcessing}>
            Import Files
          </Button>
        </div>
        <div className="help">
          Analyzes folder, removes duplicates, and {importMode === 'copy' ? 'copies' : 'moves'} files to your library
        </div>
      </div>
    );
  }

  if (phase === 'scanning' || phase === 'importing') {
    return (
      <div className="import-card-container">
        <div className="import-card">
          <h3>Importing to Library</h3>
          <div className="help">This may take a few minutes depending on folder size.</div>
          <div className="progress-container">
            <StatusLine stepStatus="scanning" progress={progress} phase={phase} />
            <StatusLine stepStatus="hashing" progress={progress} phase={phase} />
            <StatusLine stepStatus="checking_imported" progress={progress} phase={phase} />
            <StatusLine stepStatus="finding_duplicates" progress={progress} phase={phase} />
            <StatusLine stepStatus="importing" progress={progress} phase={phase} importMode={importMode} />
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    const filesToImport = results?.filesToImport?.length || 0;
    const movedToLibrary = results?.movedToLibrary || 0;
    const alreadyImported = results?.alreadyImported || 0;
    const duplicatesRemoved = results?.duplicatesRemoved || 0;

    let resultsSummary = null;
    let actionButtons = null;

    if (filesToImport === 0 && movedToLibrary === 0) {
      let message = 'No new files found';
      let submessage = null;

      if (alreadyImported > 0) {
        submessage = `All ${alreadyImported.toLocaleString()} files are already in the library`;
      } else if (results?.totalScanned === 0) {
        submessage = 'No files found in import folder';
      }

      resultsSummary = (
        <div className="results-summary">
          <div className="result-message">{message}</div>
          {submessage && <div className="result-submessage">{submessage}</div>}
        </div>
      );

      actionButtons = (
        <div className="action-buttons">
          <Button className='primary' onClick={onImportMoreClick}>
            Import More
          </Button>
        </div>
      );
    } else {
      const verb = importMode === 'copy' ? 'Copied' : 'Moved';

      resultsSummary = (
        <div className="results-summary">
          <div className="result-primary">{verb} {movedToLibrary.toLocaleString()} files to library</div>
          {alreadyImported > 0 && (
            <div className="result-detail">{alreadyImported.toLocaleString()} already imported</div>
          )}
          {duplicatesRemoved > 0 && (
            <div className="result-detail">{duplicatesRemoved.toLocaleString()} duplicates skipped</div>
          )}
        </div>
      );

      actionButtons = (
        <div className="action-buttons">
          <Button className='primary' onClick={() => navigateTo('/curate')}>
            View Library
          </Button>
          <Button className='secondary' onClick={onImportMoreClick}>
            Import More
          </Button>
        </div>
      );
    }

    return (
      <div className="import-card-container">
        <div className="import-card">
          <h3>Importing to Library</h3>
          <div className="progress-container">
            <StatusLine stepStatus="scanning" progress={progress} phase={phase} isComplete={true} />
            <StatusLine stepStatus="hashing" progress={progress} phase={phase} isComplete={true} />
            <StatusLine stepStatus="checking_imported" progress={progress} phase={phase} isComplete={true} />
            <StatusLine stepStatus="finding_duplicates" progress={progress} phase={phase} isComplete={true} />
            <StatusLine stepStatus="importing" progress={progress} phase={phase} importMode={importMode} isComplete={true} />
          </div>
          {resultsSummary}
          {actionButtons}
        </div>
      </div>
    );
  }

  return null;
}

function StatusLine({ stepStatus, progress, phase, importMode, isComplete = false }) {
  const currentStepIndex = stepOrder.indexOf(stepStatus);
  const progressingStepIndex = stepOrder.indexOf(progress?.status || '');

  let icon = null;
  let stepName = "";
  let subText = <div className="subtext">Not started</div>;

  if (isComplete || currentStepIndex < progressingStepIndex) {
    icon = <div className="step-done"><TaskDoneIcon /></div>;
  } else if (currentStepIndex === progressingStepIndex) {
    icon = <div className="step-inprogress"><TaskInProgressIcon /></div>;
  } else {
    icon = <div className="step-notstarted"><TaskNotStartedIcon /></div>;
  }

  if (stepStatus === "scanning") {
    stepName = "Discovering files";
    if (isComplete || currentStepIndex < progressingStepIndex) {
      subText = <div className="subtext">{`Found ${progress?.total?.toLocaleString() || 0} photos and videos`}</div>;
    } else if (currentStepIndex === progressingStepIndex) {
      subText = <div className="subtext">Scanning...</div>;
    }
  }

  if (stepStatus === "hashing") {
    stepName = "Computing hashes";
    if (isComplete || currentStepIndex < progressingStepIndex) {
      subText = <div className="subtext">Finished</div>;
    } else if (currentStepIndex === progressingStepIndex) {
      subText = <div className="subtext">{`Processing ${progress?.completed?.toLocaleString() || 0} / ${progress?.total?.toLocaleString() || 0} (${progress?.percent || 0}%)`}</div>;
    }
  }

  if (stepStatus === "checking_imported") {
    stepName = "Matching with library";
    if (isComplete || currentStepIndex < progressingStepIndex) {
      subText = <div className="subtext">Finished</div>;
    } else if (currentStepIndex === progressingStepIndex) {
      subText = <div className="subtext">{`Checking ${progress?.completed?.toLocaleString() || 0} / ${progress?.total?.toLocaleString() || 0} (${progress?.percent || 0}%)`}</div>;
    }
  }

  if (stepStatus === "finding_duplicates") {
    stepName = "Finding duplicates";
    if (isComplete || currentStepIndex < progressingStepIndex) {
      subText = <div className="subtext">Finished</div>;
    }
  }

  if (stepStatus === "importing") {
    stepName = importMode === 'copy' ? "Copying files" : "Moving files";
    if (isComplete) {
      subText = <div className="subtext">Finished</div>;
    } else if (currentStepIndex === progressingStepIndex) {
      subText = <div className="subtext">{`${importMode === 'copy' ? 'Copying' : 'Moving'} ${progress?.completed?.toLocaleString() || 0} / ${progress?.total?.toLocaleString() || 0} (${progress?.percent || 0}%)`}</div>;
    }
  }

  return (
    <div className="step-container">
      {icon}
      <div>
        <div>{stepName}</div>
        {subText}
      </div>
    </div>
  );
}

import { TaskDoneIcon, TaskInProgressIcon, TaskNotStartedIcon } from '../../commons/components/Icon.jsx'
import './ScanProgressCard.css';

const stepOrder = ["scanning", "hashing", "finding_duplicates", "complete"]

export default function ScanProgressCard({ isScanning, progress }) {
  if (!isScanning || progress === null) {
    return null;
  }

  return (
    <div className="scan-progress-card-container">
      <div className="scan-progress-card">
        <h3>Scanning Import Folder</h3>
        <div className="help">This may take a few minutes depending on folder size.</div>
        <div className="progress-container">
          <StatusLine stepStatus="scanning" progress={progress} />
          <StatusLine stepStatus="hashing" progress={progress} />
          <StatusLine stepStatus="finding_duplicates" progress={progress} />
          <StatusLine stepStatus="complete" progress={progress} />
        </div>
      </div>
    </div>
  );
}

function StatusLine({ stepStatus, progress }) {
  const currentStepIndex = stepOrder.indexOf(stepStatus);
  const progressingStepIndex = stepOrder.indexOf(progress.status);

  let icon = null;
  let stepName = "";
  let subText = <div className="subtext">Not started</div>;

  if (currentStepIndex === progressingStepIndex) {
    icon = <div className="step-inprogress"><TaskInProgressIcon /></div>
  } else if (currentStepIndex < progressingStepIndex) {
    icon = <div className="step-done"><TaskDoneIcon /></div>
  } else {
    icon = <div className="step-notstarted"><TaskNotStartedIcon /></div>
  }

  if (stepStatus === "scanning") {
    stepName = "Discovering files"
    if (currentStepIndex < progressingStepIndex) {
      subText = <div className="subtext">{`Found ${progress.total} photos and videos`}</div>
    }
  }

  if (stepStatus === "hashing") {
    stepName = "Computing hashes"
    if (currentStepIndex === progressingStepIndex) {
      subText = <div className="subtext">{`Processing ${progress.completed} / ${progress.total} (${progress.percent}%)`}</div>
    } else if (currentStepIndex < progressingStepIndex) {
      subText = <div className="subtext">Finished</div>
    }
  }

  if (stepStatus === "finding_duplicates") {
    stepName = "Finding duplicates"
    if (currentStepIndex < progressingStepIndex) {
      subText = <div className="subtext">Finished</div>
    }
  }

  if (stepStatus === "complete") {
    stepName = "Complete scanning"
  }

  return (
    <div className="step-container">
      {icon}
      <div>
        <div>{stepName}</div>
        {subText}
      </div>
    </div>
  )
}

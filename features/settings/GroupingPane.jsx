import ApiClient from '../../commons/http/ApiClient.js';
import Button from '../../commons/components/Button.jsx';
import SettingsInput from '../../commons/components/SettingsInput.jsx';

const { useState, useEffect } = React;

export default function GroupingPane() {
  const [groupTimeGap, setGroupTimeGap] = useState('120');
  const [groupDistance, setGroupDistance] = useState('1');
  const [isLoading, setIsLoading] = useState(true);
  const [rebuildProgress, setRebuildProgress] = useState({ status: 'idle', completed: 0, total: 0, percent: 0 });
  const [isRebuilding, setIsRebuilding] = useState(false);

  useEffect(() => {
    loadSettings();
    checkRebuildProgress();
  }, []);

  useEffect(() => {
    let intervalId = null;
    if (isRebuilding) {
      intervalId = setInterval(checkRebuildProgress, 1000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRebuilding]);

  async function loadSettings() {
    try {
      const settings = await ApiClient.getSettings();
      setGroupTimeGap(settings.group_time_gap || '120');
      setGroupDistance(settings.group_distance || '1');
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGroupTimeGapChange(event) {
    const newValue = event.target.value;
    const previousValue = groupTimeGap;
    setGroupTimeGap(newValue);

    if (newValue === '') {
      return;
    }

    const numValue = parseInt(newValue, 10);
    if (isNaN(numValue) || numValue < 15 || numValue > 480) {
      setGroupTimeGap(previousValue);
      return;
    }

    try {
      await ApiClient.updateSetting('group_time_gap', newValue);
    } catch (error) {
      console.error('Failed to save setting:', error);
      setGroupTimeGap(previousValue);
    }
  }

  async function handleGroupDistanceChange(event) {
    const newValue = event.target.value;
    const previousValue = groupDistance;
    setGroupDistance(newValue);

    if (newValue === '') {
      return;
    }

    const numValue = parseFloat(newValue);
    if (isNaN(numValue) || numValue < 0.5 || numValue > 10) {
      setGroupDistance(previousValue);
      return;
    }

    try {
      await ApiClient.updateSetting('group_distance', newValue);
    } catch (error) {
      console.error('Failed to save setting:', error);
      setGroupDistance(previousValue);
    }
  }

  async function handleRebuildGroups() {
    try {
      await ApiClient.rebuildGroups();
      setIsRebuilding(true);
    } catch (error) {
      console.error('Failed to start group rebuild:', error);
    }
  }

  async function checkRebuildProgress() {
    try {
      const progress = await ApiClient.getGroupRebuildProgress();
      setRebuildProgress(progress);

      if (progress.status === 'processing') {
        setIsRebuilding(true);
      } else if (progress.status === 'complete' || progress.status === 'idle') {
        setIsRebuilding(false);
      }
    } catch (error) {
      console.error('Failed to check rebuild progress:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="settings-tab-content">
        <p>Loading settings...</p>
      </div>
    );
  }

  const isProcessing = rebuildProgress.status === 'processing';
  const isComplete = rebuildProgress.status === 'complete';

  let progressContent = null;
  if (isProcessing) {
    progressContent = (
      <div className="export-progress-section">
        <div className="export-progress-content">
          <div className="export-progress-text">
            <div>Rebuilding photo groups...</div>
            <div className="export-progress-count">
              {rebuildProgress.completed} of {rebuildProgress.total} photos processed
            </div>
          </div>
        </div>
        <div className="export-progress-bar">
          <div className="export-progress-fill" style={{ width: `${rebuildProgress.percent}%` }}></div>
        </div>
      </div>
    );
  }

  let messageContent = null;
  if (isComplete) {
    messageContent = (
      <div className="export-message export-message-success">
        Group rebuild complete! Processed {rebuildProgress.total} photos. All photos have been regrouped based on the current settings.
      </div>
    );
  }

  return (
    <div className="settings-tab-content">
      <h3>Photo Grouping</h3>
      <p>Control how photos are automatically grouped during import based on time and location.</p>

      <div className="settings-section">
        <h4>Grouping Configuration</h4>
        <p>Configure how photos are grouped during import. A new group starts when the time gap exceeds the threshold, total group duration exceeds 12 hours, or distance from the starting location exceeds the threshold.</p>

        <SettingsInput
          id="group-time-gap"
          label="Time Gap (minutes)"
          type="number"
          min="15"
          max="480"
          value={groupTimeGap}
          onChange={handleGroupTimeGapChange}
          description="Photos taken within this time gap are grouped together. Range: 15-480 minutes, default: 120 minutes."
        />

        <SettingsInput
          id="group-distance"
          label="Location Distance (km)"
          type="number"
          min="0.5"
          max="10"
          step="0.1"
          value={groupDistance}
          onChange={handleGroupDistanceChange}
          description="Maximum distance from the group's starting location. Range: 0.5-10 km, default: 1 km."
        />
      </div>

      <div className="settings-section">
        <h4>Rebuild Photo Groups</h4>
        <p>Recompute automatic photo groups for all existing photos using the current time gap and distance settings. This will update all group assignments based on the current algorithms.</p>
        <Button onClick={handleRebuildGroups} disabled={isProcessing}>
          {isProcessing ? 'Rebuilding...' : 'Rebuild Groups'}
        </Button>
        {progressContent}
        {messageContent}
      </div>
    </div>
  );
}

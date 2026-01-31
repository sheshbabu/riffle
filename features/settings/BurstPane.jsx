import ApiClient from '../../commons/http/ApiClient.js';
import SegmentedControl from '../../commons/components/SegmentedControl.jsx';
import Button from '../../commons/components/Button.jsx';
import SettingsInput from '../../commons/components/SettingsInput.jsx';
import FormSection from '../../commons/components/FormSection.jsx';

const { useState, useEffect } = React;

export default function BurstPane() {
  const [burstDetectionEnabled, setBurstDetectionEnabled] = useState('false');
  const [burstTimeThreshold, setBurstTimeThreshold] = useState('3');
  const [burstDhashThreshold, setBurstDhashThreshold] = useState('4');
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
      setBurstDetectionEnabled(settings.burst_detection_enabled || 'false');
      setBurstTimeThreshold(settings.burst_time_threshold || '3');
      setBurstDhashThreshold(settings.burst_dhash_threshold || '4');
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBurstDetectionEnabledChange(newValue) {
    const previousValue = burstDetectionEnabled;
    setBurstDetectionEnabled(newValue);
    try {
      await ApiClient.updateSetting('burst_detection_enabled', newValue);
    } catch (error) {
      console.error('Failed to save setting:', error);
      setBurstDetectionEnabled(previousValue);
    }
  }

  async function handleBurstTimeThresholdChange(event) {
    const newValue = event.target.value;
    const previousValue = burstTimeThreshold;
    setBurstTimeThreshold(newValue);

    if (newValue === '') {
      return;
    }

    const numValue = parseInt(newValue, 10);
    if (isNaN(numValue) || numValue < 1 || numValue > 60) {
      setBurstTimeThreshold(previousValue);
      return;
    }

    try {
      await ApiClient.updateSetting('burst_time_threshold', newValue);
    } catch (error) {
      console.error('Failed to save setting:', error);
      setBurstTimeThreshold(previousValue);
    }
  }

  async function handleBurstDhashThresholdChange(event) {
    const newValue = event.target.value;
    const previousValue = burstDhashThreshold;
    setBurstDhashThreshold(newValue);

    if (newValue === '') {
      return;
    }

    const numValue = parseInt(newValue, 10);
    if (isNaN(numValue) || numValue < 0 || numValue > 64) {
      setBurstDhashThreshold(previousValue);
      return;
    }

    try {
      await ApiClient.updateSetting('burst_dhash_threshold', newValue);
    } catch (error) {
      console.error('Failed to save setting:', error);
      setBurstDhashThreshold(previousValue);
    }
  }

  async function handleRebuildBurstData() {
    try {
      await ApiClient.rebuildBurstData();
      setIsRebuilding(true);
    } catch (error) {
      console.error('Failed to start burst data rebuild:', error);
    }
  }

  async function checkRebuildProgress() {
    try {
      const progress = await ApiClient.getBurstRebuildProgress();
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

  const enabledOptions = [
    { value: 'false', label: 'Disabled' },
    { value: 'true', label: 'Enabled' }
  ];

  let configSection = null;
  if (burstDetectionEnabled === 'true') {
    configSection = (
      <FormSection
        title="Burst Detection Configuration"
        description="Configure how bursts are detected during import. Photos taken within the time threshold and with similar visual content (based on dHash distance) are grouped as bursts."
      >
        <SettingsInput
          id="burst-time-threshold"
          label="Time Threshold (seconds)"
          type="number"
          min="1"
          max="60"
          value={burstTimeThreshold}
          onChange={handleBurstTimeThresholdChange}
          description="Photos taken within this many seconds of each other may be grouped as a burst. Range: 1-60 seconds."
        />

        <SettingsInput
          id="burst-dhash-threshold"
          label="dHash Distance Threshold"
          type="number"
          min="0"
          max="64"
          value={burstDhashThreshold}
          onChange={handleBurstDhashThresholdChange}
          description="Maximum perceptual hash difference between photos. Lower values mean photos must be more visually similar. Range: 0-64, recommended: 4."
        />
      </FormSection>
    );
  }

  let rebuildSection = null;
  if (burstDetectionEnabled === 'true') {
    const isProcessing = rebuildProgress.status === 'processing';
    const isComplete = rebuildProgress.status === 'complete';

    let progressContent = null;
    if (isProcessing) {
      progressContent = (
        <div className="export-progress-section">
          <div className="export-progress-content">
            <div className="export-progress-text">
              <div>Rebuilding burst data for existing photos...</div>
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
          Burst data rebuild complete! Processed {rebuildProgress.total} photos. Burst detection is now active for all photos.
        </div>
      );
    }

    rebuildSection = (
      <FormSection
        title="Rebuild Burst Data"
        description="For burst detection to work on existing photos, you need to compute perceptual hashes for all images in your library. This is a one-time operation that will process all image files."
      >
        <Button onClick={handleRebuildBurstData} disabled={isProcessing}>
          {isProcessing ? 'Rebuilding...' : 'Rebuild Burst Data'}
        </Button>
        {progressContent}
        {messageContent}
      </FormSection>
    );
  }

  return (
    <div className="settings-tab-content">
      <h3>Burst Detection</h3>
      <p>Control how burst photos are detected and grouped during import.</p>

      <FormSection
        title="Enable Burst Detection"
        description="When enabled, photos taken in rapid succession with similar content are automatically grouped as bursts. This requires computing perceptual hashes (dHash) during import, which adds processing time."
      >
        <SegmentedControl
          options={enabledOptions}
          value={burstDetectionEnabled}
          onChange={handleBurstDetectionEnabledChange}
        />
      </FormSection>
      {configSection}
      {rebuildSection}
    </div>
  );
}

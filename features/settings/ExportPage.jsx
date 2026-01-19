import ApiClient from '../../commons/http/ApiClient.js';
import SegmentedControl from '../../commons/components/SegmentedControl.jsx';
import Button from '../../commons/components/Button.jsx';
import { LoadingSpinner } from '../../commons/components/Icon.jsx';
import './ExportPage.css';

const { useState, useEffect } = React;

export default function ExportPage() {
  const [minRating, setMinRating] = useState('0');
  const [curationStatus, setCurationStatus] = useState('pick');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

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

  async function handleMinRatingChange(newValue) {
    const previousValue = minRating;
    setMinRating(newValue);
    try {
      await ApiClient.updateSetting('export_min_rating', newValue);
    } catch (error) {
      console.error('Failed to save setting:', error);
      setMinRating(previousValue);
    }
  }

  async function handleCurationStatusChange(newValue) {
    const previousValue = curationStatus;
    setCurationStatus(newValue);
    try {
      await ApiClient.updateSetting('export_curation_status', newValue);
    } catch (error) {
      console.error('Failed to save setting:', error);
      setCurationStatus(previousValue);
    }
  }

  async function handleStartExport() {
    try {
      setIsExporting(true);
      await ApiClient.startExport(parseInt(minRating), curationStatus);
    } catch (error) {
      console.error('Failed to start export:', error);
      setIsExporting(false);
    }
  }

  async function pollExportProgress() {
    try {
      const progress = await ApiClient.getExportProgress();
      setExportProgress(progress);

      if (progress.status === 'export_complete' || progress.status === 'export_error') {
        setIsExporting(false);
      }
    } catch (error) {
      console.error('Failed to poll export progress:', error);
    }
  }


  if (isLoading) {
    return (
      <div className="settings-tab-content">
        <p>Loading settings...</p>
      </div>
    );
  }

  const ratingOptions = [
    { value: '0', label: 'All' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' }
  ];

  const curationOptions = [
    { value: 'all', label: 'All' },
    { value: 'pick', label: 'Picked Only' }
  ];

  let progressSection = null;
  if (isExporting && exportProgress) {
    let statusText = exportProgress.message || 'Processing...';
    let progressBar = null;

    if (exportProgress.total > 0) {
      progressBar = (
        <div className="export-progress-bar">
          <div className="export-progress-fill" style={{ width: `${exportProgress.percent}%` }}></div>
        </div>
      );
    }

    let progressCount = null;
    if (exportProgress.total > 0) {
      progressCount = (
        <div className="export-progress-count">
          {exportProgress.completed} / {exportProgress.total}
        </div>
      );
    }

    progressSection = (
      <div className="settings-section export-progress-section">
        <div className="export-progress-content">
          <LoadingSpinner size={20} />
          <div className="export-progress-text">
            <div>{statusText}</div>
            {progressCount}
          </div>
        </div>
        {progressBar}
      </div>
    );
  }

  let completionMessage = null;
  if (!isExporting && exportProgress) {
    if (exportProgress.status === 'export_complete') {
      completionMessage = (
        <div className="export-message export-message-success">
          {exportProgress.message}
        </div>
      );
    } else if (exportProgress.status === 'export_error') {
      completionMessage = (
        <div className="export-message export-message-error">
          Export failed: {exportProgress.message}
        </div>
      );
    }
  }

  return (
    <div className="export-page">
      <div className="export-header">
        <h2>Export Photos</h2>
        <p>Export photos to the configured export folder based on rating and curation status.</p>
      </div>
      <div className="export-content">

        <div className="settings-section">
          <h4>Minimum Rating</h4>
          <p>Export photos with at least this rating.</p>
          <SegmentedControl
            options={ratingOptions}
            value={minRating}
            onChange={handleMinRatingChange}
          />
        </div>

        <div className="settings-section">
          <h4>Curation Status</h4>
          <p>Choose whether to export all photos or only picked photos. Picked photos are those you've curated and not rejected.</p>
          <SegmentedControl
            options={curationOptions}
            value={curationStatus}
            onChange={handleCurationStatusChange}
          />
        </div>

        {completionMessage}
        {progressSection}

        <div className="settings-section">
          <Button variant="primary" onClick={handleStartExport} isDisabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>
    </div>
  );
}

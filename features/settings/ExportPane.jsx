import ApiClient from '../../commons/http/ApiClient.js';
import SegmentedControl from '../../commons/components/SegmentedControl.jsx';
import './ExportPane.css';

const { useState, useEffect } = React;

export default function ExportPane() {
  const [minRating, setMinRating] = useState('0');
  const [curationStatus, setCurationStatus] = useState('pick');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

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

  return (
    <div className="settings-tab-content">
      <h3>Export Settings</h3>
      <p className="settings-tab-description">Configure default export criteria for photos.</p>

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
    </div>
  );
}

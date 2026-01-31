import ApiClient from '../../commons/http/ApiClient.js';
import SegmentedControl from '../../commons/components/SegmentedControl.jsx';
import { showToast } from '../../commons/components/Toast.jsx';
import FormSection from '../../commons/components/FormSection.jsx';
import './ExportPane.css';

const { useState, useEffect } = React;

export default function ExportPane() {
  const [minRating, setMinRating] = useState('0');
  const [curationStatus, setCurationStatus] = useState('pick');
  const [organizationMode, setOrganizationMode] = useState('organized');
  const [deduplicationEnabled, setDeduplicationEnabled] = useState('true');
  const [cleanupEnabled, setCleanupEnabled] = useState('false');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const settings = await ApiClient.getSettings();
      setMinRating(settings.export_min_rating || '0');
      setCurationStatus(settings.export_curation_status || 'pick');
      setOrganizationMode(settings.export_organization_mode || 'organized');
      setDeduplicationEnabled(settings.export_deduplication_enabled || 'true');
      setCleanupEnabled(settings.export_cleanup_enabled || 'false');
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
      showToast('Minimum rating updated');
    } catch (error) {
      console.error('Failed to save setting:', error);
      setMinRating(previousValue);
      showToast('Failed to update setting');
    }
  }

  async function handleCurationStatusChange(newValue) {
    const previousValue = curationStatus;
    setCurationStatus(newValue);
    try {
      await ApiClient.updateSetting('export_curation_status', newValue);
      showToast('Curation status updated');
    } catch (error) {
      console.error('Failed to save setting:', error);
      setCurationStatus(previousValue);
      showToast('Failed to update setting');
    }
  }

  async function handleOrganizationModeChange(newValue) {
    const previousValue = organizationMode;
    setOrganizationMode(newValue);
    try {
      await ApiClient.updateSetting('export_organization_mode', newValue);
      showToast('Organization mode updated');
    } catch (error) {
      console.error('Failed to save setting:', error);
      setOrganizationMode(previousValue);
      showToast('Failed to update setting');
    }
  }

  async function handleDeduplicationEnabledChange(newValue) {
    const previousValue = deduplicationEnabled;
    setDeduplicationEnabled(newValue);
    try {
      await ApiClient.updateSetting('export_deduplication_enabled', newValue);
      showToast('Deduplication setting updated');
    } catch (error) {
      console.error('Failed to save setting:', error);
      setDeduplicationEnabled(previousValue);
      showToast('Failed to update setting');
    }
  }

  async function handleCleanupEnabledChange(newValue) {
    const previousValue = cleanupEnabled;
    setCleanupEnabled(newValue);
    try {
      await ApiClient.updateSetting('export_cleanup_enabled', newValue);
      showToast('Cleanup setting updated');
    } catch (error) {
      console.error('Failed to save setting:', error);
      setCleanupEnabled(previousValue);
      showToast('Failed to update setting');
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

  const organizationOptions = [
    { value: 'organized', label: 'Organized' },
    { value: 'flat', label: 'Flat' }
  ];

  const deduplicationOptions = [
    { value: 'true', label: 'Skip Duplicates' },
    { value: 'false', label: 'Export All' }
  ];

  const cleanupOptions = [
    { value: 'false', label: 'Keep Existing' },
    { value: 'true', label: 'Clear Folder' }
  ];

  return (
    <div className="settings-tab-content">
      <h3>Export Settings</h3>
      <p className="settings-tab-description">Configure default export criteria for photos.</p>

      <FormSection title="Minimum Rating" description="Export photos with at least this rating.">
        <SegmentedControl
          options={ratingOptions}
          value={minRating}
          onChange={handleMinRatingChange}
        />
      </FormSection>

      <FormSection
        title="Curation Status"
        description="Choose whether to export all photos or only picked photos. Picked photos are those you've curated and not rejected."
      >
        <SegmentedControl
          options={curationOptions}
          value={curationStatus}
          onChange={handleCurationStatusChange}
        />
      </FormSection>

      <FormSection
        title="Organization"
        description="Choose folder structure for exported photos. Organized mode mirrors library structure with Year/Month folders."
      >
        <SegmentedControl
          options={organizationOptions}
          value={organizationMode}
          onChange={handleOrganizationModeChange}
        />
      </FormSection>

      <FormSection
        title="Previously Exported Photos"
        description="Choose whether to skip photos that have already been exported in previous sessions."
      >
        <SegmentedControl
          options={deduplicationOptions}
          value={deduplicationEnabled}
          onChange={handleDeduplicationEnabledChange}
        />
      </FormSection>

      <FormSection
        title="Export Folder Cleanup"
        description="Choose whether to clear export folder before each export. Clear requires confirmation before starting export."
      >
        <SegmentedControl
          options={cleanupOptions}
          value={cleanupEnabled}
          onChange={handleCleanupEnabledChange}
        />
      </FormSection>
    </div>
  );
}

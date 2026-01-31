import ApiClient from '../../commons/http/ApiClient.js';
import SegmentedControl from '../../commons/components/SegmentedControl.jsx';
import FormSection from '../../commons/components/FormSection.jsx';

const { useState, useEffect } = React;

export default function ImportPane() {
  const [importMode, setImportMode] = useState('copy');
  const [duplicateHandling, setDuplicateHandling] = useState('keep');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const settings = await ApiClient.getSettings();
      setImportMode(settings.import_mode);
      setDuplicateHandling(settings.import_duplicate_handling);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleImportModeChange(newValue) {
    const previousValue = importMode;
    setImportMode(newValue);
    try {
      await ApiClient.updateSetting('import_mode', newValue);
    } catch (error) {
      console.error('Failed to save setting:', error);
      setImportMode(previousValue);
    }
  }

  async function handleDuplicateHandlingChange(newValue) {
    const previousValue = duplicateHandling;
    setDuplicateHandling(newValue);
    try {
      await ApiClient.updateSetting('import_duplicate_handling', newValue);
    } catch (error) {
      console.error('Failed to save setting:', error);
      setDuplicateHandling(previousValue);
    }
  }

  if (isLoading) {
    return (
      <div className="settings-tab-content">
        <p>Loading settings...</p>
      </div>
    );
  }

  const transferOptions = [
    { value: 'move', label: 'Move' },
    { value: 'copy', label: 'Copy' }
  ];

  const duplicateOptions = [
    { value: 'keep', label: 'Keep' },
    { value: 'delete', label: 'Delete' }
  ];

  let duplicateSection = null;
  if (importMode === 'move') {
    duplicateSection = (
      <FormSection
        title="Duplicate Handling"
        description="When exact duplicates are found, choose what happens to non-selected copies. Keep duplicates in the import folder for manual review, or automatically delete them after importing the best candidate."
      >
        <SegmentedControl
          options={duplicateOptions}
          value={duplicateHandling}
          onChange={handleDuplicateHandlingChange}
        />
      </FormSection>
    );
  }

  return (
    <div className="settings-tab-content">
      <h3>Import Behavior</h3>
      <p>Control how files are transferred and managed during the import process.</p>

      <FormSection
        title="File Transfer"
        description="Choose how files are transferred from the import folder to your library. Move transfers files and removes them from the import folder. Copy leaves originals in place."
      >
        <SegmentedControl
          options={transferOptions}
          value={importMode}
          onChange={handleImportModeChange}
        />
      </FormSection>
      {duplicateSection}
    </div>
  );
}

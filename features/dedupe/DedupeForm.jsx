import Button from '../../commons/components/Button.jsx';
import Input from '../../commons/components/Input.jsx';
import './DedupeForm.css';

export default function DedupeForm({
  inboxPath,
  setInboxPath,
  libraryPath,
  setLibraryPath,
  trashPath,
  setTrashPath,
  enableNearDuplicates,
  setEnableNearDuplicates,
  isAnalyzing,
  onSubmit
}) {
  const buttonText = isAnalyzing ? 'Analyzing...' : 'Analyze Photos';

  return (
    <div className="dedupe-form">
      <Input
        id="inboxPath"
        label="Inbox Path"
        type="text"
        value={inboxPath}
        onChange={(e) => setInboxPath(e.target.value)}
        placeholder="/path/to/inbox"
        hint="Source folder containing photos to organize"
      />

      <Input
        id="libraryPath"
        label="Library Path"
        type="text"
        value={libraryPath}
        onChange={(e) => setLibraryPath(e.target.value)}
        placeholder="/path/to/library"
        hint="Destination folder for organized photos"
      />

      <Input
        id="trashPath"
        label="Trash Path"
        type="text"
        value={trashPath}
        onChange={(e) => setTrashPath(e.target.value)}
        placeholder="/path/to/trash"
        hint="Folder for duplicate photos"
      />

      <div className="checkbox-field">
        <label>
          <input
            type="checkbox"
            checked={enableNearDuplicates}
            onChange={(e) => setEnableNearDuplicates(e.target.checked)}
          />
          <span className="checkbox-label">Enable near-duplicate detection (experimental)</span>
        </label>
        <div className="checkbox-hint">
          Finds visually similar images using perceptual hashing. May produce false positives.
        </div>
      </div>

      <div className="submit-button">
        <Button
          className='primary'
          onClick={onSubmit}
          disabled={isAnalyzing}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}

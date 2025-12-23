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
  isDryRun,
  setIsDryRun,
  isProcessing,
  onSubmit
}) {
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

      <div className="dry-run-checkbox">
        <label>
          <input
            type="checkbox"
            checked={isDryRun}
            onChange={(e) => setIsDryRun(e.target.checked)}
          />
          Dry Run (no files will be moved)
        </label>
      </div>

      <div className="submit-button">
        <Button
          className='primary'
          onClick={onSubmit}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Start Deduplication'}
        </Button>
      </div>
    </div>
  );
}

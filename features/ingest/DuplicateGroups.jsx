import Button from '../../commons/components/Button.jsx';
import DuplicateGroup from './DuplicateGroup.jsx';
import './DuplicateGroups.css';

export default function DuplicateGroups({ duplicates, importPath, onImport, isImporting, importButtonText, hasResults }) {
  if (!hasResults) {
    return null;
  }

  const hasDuplicates = duplicates && duplicates.length > 0;

  let duplicateGroupsElement = null;
  if (hasDuplicates) {
    const groupElements = duplicates.map((group, index) => (
      <DuplicateGroup key={index} group={group} index={index} importPath={importPath} />
    ));

    duplicateGroupsElement = (
      <div>
        <h3>Duplicate Groups ({duplicates.length})</h3>
        {groupElements}
      </div>
    );
  }

  return (
    <div className="duplicate-groups">
      <div className="execute-section">
        <p>Review the analysis above. Click "Import to Library" to move selected photos to library and duplicates to trash.</p>
        <Button className='primary' onClick={onImport} disabled={isImporting}>
          {importButtonText}
        </Button>
      </div>
      {duplicateGroupsElement}
    </div>
  );
}

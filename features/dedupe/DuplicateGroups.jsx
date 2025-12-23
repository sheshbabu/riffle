import Button from '../../commons/components/Button.jsx';
import DuplicateGroup from './DuplicateGroup.jsx';
import './DuplicateGroups.css';

export default function DuplicateGroups({ duplicates, onExecute, isExecuting, hasResults }) {
  if (!hasResults) {
    return null;
  }

  const hasDuplicates = duplicates && duplicates.length > 0;

  let duplicateGroupsElement = null;
  if (hasDuplicates) {
    const groupElements = duplicates.map((group, index) => (
      <DuplicateGroup key={index} group={group} index={index} />
    ));

    duplicateGroupsElement = (
      <div>
        <h3>Duplicate Groups ({duplicates.length})</h3>
        {groupElements}
      </div>
    );
  }

  const buttonText = isExecuting ? 'Executing...' : 'Execute Move';

  return (
    <div className="duplicate-groups">
      <div className="execute-section">
        <p>Review the analysis above. Click "Execute Move" to move candidates to library and duplicates to trash.</p>
        <Button
          className='primary'
          onClick={onExecute}
          disabled={isExecuting}
        >
          {buttonText}
        </Button>
      </div>
      {duplicateGroupsElement}
    </div>
  );
}

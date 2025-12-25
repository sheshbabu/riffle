import DuplicateGroup from './DuplicateGroup.jsx';
import './DuplicateGroups.css';

export default function DuplicateGroups({ duplicates, importPath, hasResults }) {
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
      {duplicateGroupsElement}
    </div>
  );
}

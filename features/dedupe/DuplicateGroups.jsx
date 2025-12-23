import DuplicateGroup from './DuplicateGroup.jsx';
import './DuplicateGroups.css';

export default function DuplicateGroups({ duplicates }) {
  if (!duplicates || duplicates.length === 0) {
    return null;
  }

  const groupElements = duplicates.map((group, index) => (
    <DuplicateGroup key={index} group={group} index={index} />
  ));

  return (
    <div className="duplicate-groups">
      <h3>Duplicate Groups ({duplicates.length})</h3>
      {groupElements}
    </div>
  );
}

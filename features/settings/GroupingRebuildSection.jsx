import Button from '../../commons/components/Button.jsx';

const { useState } = React;

export default function GroupingRebuildSection() {
  const [isRecalculating, setIsRecalculating] = useState(false);

  function handleRecalculate() {
    setIsRecalculating(true);
    setTimeout(() => {
      setIsRecalculating(false);
      alert('Group recalculation completed (placeholder)');
    }, 2000);
  }

  const buttonText = isRecalculating ? 'Recomputing...' : 'Recompute Groups';

  return (
    <div className="settings-section">
      <h4>Photo Grouping</h4>
      <p>Recompute automatic photo groups using time and location clustering. Updates all group assignments based on current algorithms.</p>
      <Button className="primary" onClick={handleRecalculate} disabled={isRecalculating}>
        {buttonText}
      </Button>
    </div>
  );
}

import Button from '../../commons/components/Button.jsx';

const { useState } = React;

export default function LibraryPane() {
  const [isRegeneratingThumbnails, setIsRegeneratingThumbnails] = useState(false);
  const [isRecalculatingGroups, setIsRecalculatingGroups] = useState(false);

  function handleRegenerateThumbnails() {
    setIsRegeneratingThumbnails(true);
    setTimeout(() => {
      setIsRegeneratingThumbnails(false);
      alert('Thumbnail regeneration completed (placeholder)');
    }, 2000);
  }

  function handleRecalculateGroups() {
    setIsRecalculatingGroups(true);
    setTimeout(() => {
      setIsRecalculatingGroups(false);
      alert('Group recalculation completed (placeholder)');
    }, 2000);
  }

  return (
    <div className="settings-tab-content">
      <h3>Library Maintenance</h3>
      <p>Rebuild and optimize your photo library's index and cached assets.</p>

      <div className="settings-section">
        <h4>Thumbnail Cache</h4>
        <p>Rebuild all 300×300 preview thumbnails. Useful after updating images or if thumbnails appear corrupted.</p>
        <Button className="primary" onClick={handleRegenerateThumbnails} disabled={isRegeneratingThumbnails}>
          {isRegeneratingThumbnails ? 'Rebuilding...' : 'Rebuild Thumbnails'}
        </Button>
      </div>

      <div className="settings-section">
        <h4>Photo Grouping</h4>
        <p>Recompute automatic photo groups using time and location clustering. Updates all group assignments based on current algorithms.</p>
        <Button className="primary" onClick={handleRecalculateGroups} disabled={isRecalculatingGroups}>
          {isRecalculatingGroups ? 'Recomputing...' : 'Recompute Groups'}
        </Button>
      </div>
    </div>
  );
}

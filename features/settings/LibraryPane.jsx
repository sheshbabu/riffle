import ThumbnailRebuildSection from './ThumbnailRebuildSection.jsx';
import GroupingRebuildSection from './GroupingRebuildSection.jsx';

export default function LibraryPane() {
  return (
    <div className="settings-tab-content">
      <h3>Library Maintenance</h3>
      <p>Rebuild and optimize your photo library's index and cached assets.</p>

      <ThumbnailRebuildSection />
      <GroupingRebuildSection />
    </div>
  );
}

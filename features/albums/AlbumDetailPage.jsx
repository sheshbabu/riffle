import ApiClient from '../../commons/http/ApiClient.js';
import PhotoGallery from '../photos/PhotoGallery.jsx';
import IconButton from '../../commons/components/IconButton.jsx';
import EmptyState from '../../commons/components/EmptyState.jsx';
import LoadingContainer from '../../commons/components/LoadingContainer.jsx';
import MessageBox from '../../commons/components/MessageBox.jsx';
import SelectionCount from '../../commons/components/SelectionCount.jsx';
import { TrashIcon, ImageIcon } from '../../commons/components/Icon.jsx';
import { showToast } from '../../commons/components/Toast.jsx';
import pluralize from '../../commons/utils/pluralize.js';
import './AlbumDetailPage.css';

const { useState, useEffect } = React;

export default function AlbumDetailPage({ albumId }) {
  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(function () {
    loadAlbum();
  }, [albumId]);

  async function loadAlbum() {
    setIsLoading(true);
    setError(null);

    try {
      const albumData = await ApiClient.getAlbum(albumId);
      setAlbum(albumData);
      const albumPhotos = await ApiClient.getAlbumPhotos(albumId);
      setPhotos(albumPhotos);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelectionChange(indices) {
    setSelectedIndices(indices);
  }

  async function handleRemoveFromAlbum() {
    if (selectedIndices.size === 0) {
      showToast('Please select photos to remove');
      return;
    }

    const selectedPhotoPaths = Array.from(selectedIndices).map(index => photos[index].filePath);

    try {
      await ApiClient.removePhotosFromAlbum(albumId, selectedPhotoPaths);
      showToast(`Removed ${selectedPhotoPaths.length} photo${selectedPhotoPaths.length > 1 ? 's' : ''} from album`);
      setSelectedIndices(new Set());
      loadAlbum();
    } catch (error) {
      console.error('Failed to remove photos from album:', error);
    }
  }

  let content = null;

  if (error) {
    content = (
      <MessageBox variant="error">
        Error: {error}
      </MessageBox>
    );
  } else if (isLoading) {
    content = <LoadingContainer size={32} />;
  } else if (photos.length === 0) {
    content = (
      <EmptyState
        icon={<ImageIcon />}
        title="No photos in this album"
        description="Add photos to this album from the Library or Curate views."
      />
    );
  } else {
    content = (
      <PhotoGallery
        photos={photos}
        groups={[]}
        bursts={[]}
        expandedBursts={new Set()}
        onBurstToggle={() => { }}
        selectedIndices={selectedIndices}
        onSelectionChange={handleSelectionChange}
        fadingPhotos={new Set()}
        isCurateMode={false}
      />
    );
  }

  let albumTitle = 'Album';
  let photoCount = 0;
  if (album) {
    albumTitle = album.name;
    photoCount = album.photoCount;
  }

  let removeButton = null;
  if (selectedIndices.size > 0) {
    removeButton = (
      <IconButton onClick={handleRemoveFromAlbum}>
        <TrashIcon /> Remove from Album
      </IconButton>
    );
  }

  let selectionCountElement = null;
  if (!isLoading && !error && photos.length > 0) {
    selectionCountElement = <SelectionCount count={selectedIndices.size} />;
  }

  let albumHeader = null;
  if (!isLoading) {
    albumHeader = (
      <div>
        <h3>{albumTitle}</h3>
        <div className="album-detail-page-count">
          {photoCount} {pluralize(photoCount, 'photo')}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-toolbar">
        {albumHeader}
        {selectionCountElement}
        {removeButton}
      </div>
      {content}
    </div>
  );
}

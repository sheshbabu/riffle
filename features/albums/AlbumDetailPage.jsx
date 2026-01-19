import ApiClient from '../../commons/http/ApiClient.js';
import PhotoGallery from '../photos/PhotoGallery.jsx';
import { LoadingSpinner, TrashIcon } from '../../commons/components/Icon.jsx';
import { showToast } from '../../commons/components/Toast.jsx';
import './AlbumDetailPage.css';

const { useState, useEffect } = React;

export default function AlbumDetailPage({ albumId }) {
  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(function () {
    loadAlbumData();
  }, [albumId]);

  async function loadAlbumData() {
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
      loadAlbumData();
    } catch (error) {
      console.error('Failed to remove photos from album:', error);
    }
  }

  let content = null;

  if (error) {
    content = (
      <div className="message-box error">
        Error: {error}
      </div>
    );
  } else if (isLoading) {
    content = (
      <div className="album-detail-page-loading">
        <LoadingSpinner size={32} />
      </div>
    );
  } else if (photos.length === 0) {
    content = (
      <div className="empty-state">
        <h2 className="empty-state-title">No photos in this album</h2>
        <p className="empty-state-description">
          Add photos to this album from the Library or Curate views.
        </p>
      </div>
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
  let albumDescription = null;
  let photoCount = 0;

  if (album) {
    albumTitle = album.name;
    photoCount = album.photoCount;
    if (album.description) {
      albumDescription = <p className="album-detail-page-description">{album.description}</p>;
    }
  }

  let removeButton = null;
  if (selectedIndices.size > 0) {
    removeButton = (
      <button className="album-detail-page-remove-button" onClick={handleRemoveFromAlbum}>
        <TrashIcon /> Remove from Album
      </button>
    );
  }

  let selectionCountElement = null;
  if (!isLoading && !error && photos.length > 0) {
    selectionCountElement = <span className="selection-count">{selectedIndices.size} selected</span>;
  }

  return (
    <div className="page-container album-detail-page">
      <div className="album-detail-page-header">
        <h3 className="album-detail-page-title">{albumTitle}</h3>
        {albumDescription}
        <div className="album-detail-page-meta">
          {photoCount} photo{photoCount !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="page-header">
        {selectionCountElement}
        {removeButton}
      </div>

      {content}
    </div>
  );
}

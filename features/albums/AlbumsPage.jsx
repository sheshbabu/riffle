import ApiClient from '../../commons/http/ApiClient.js';
import Link from '../../commons/components/Link.jsx';
import { LoadingSpinner, FolderIcon } from '../../commons/components/Icon.jsx';
import AddToAlbumModal from './AddToAlbumModal.jsx';
import './AlbumsPage.css';

const { useState, useEffect } = React;

export default function AlbumsPage() {
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(function () {
    loadAlbums();
  }, []);

  async function loadAlbums() {
    setIsLoading(true);
    setError(null);
    try {
      const albumsData = await ApiClient.getAlbums();
      setAlbums(albumsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCreateNewClick() {
    setIsCreatingNew(true);
  }

  function handleModalClose() {
    setIsCreatingNew(false);
    loadAlbums();
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
      <div className="albums-page-loading">
        <LoadingSpinner size={32} />
      </div>
    );
  } else if (albums.length === 0) {
    content = (
      <div className="empty-state">
        <div className="empty-state-icon">
          <FolderIcon />
        </div>
        <h2 className="empty-state-title">No albums yet</h2>
        <p className="empty-state-description">Create an album to organize your photos.</p>
        <button className="albums-page-create-button" onClick={handleCreateNewClick}>
          + New Album
        </button>
      </div>
    );
  } else {
    const sortedAlbums = [...albums].sort((a, b) => a.name.localeCompare(b.name));

    const albumCards = sortedAlbums.map(album => {
      let coverImage = null;
      if (album.coverPath) {
        const thumbnailUrl = `/api/thumbnails/?path=${encodeURIComponent(btoa(album.coverPath))}`;
        coverImage = (<img src={thumbnailUrl} alt={album.name} className="albums-page-card-cover" />);
      } else {
        coverImage = (
          <div className="albums-page-card-cover-placeholder">
            <FolderIcon />
          </div>
        );
      }

      return (
        <Link key={album.albumId} to={`/albums/${album.albumId}`} className="albums-page-card">
          {coverImage}
          <div className="albums-page-card-info">
            <div className="albums-page-card-name">{album.name}</div>
            <div className="albums-page-card-count">
              {album.photoCount} photo{album.photoCount !== 1 ? 's' : ''}
            </div>
          </div>
        </Link>
      );
    });

    content = (
      <div className="albums-page-grid">
        {albumCards}
      </div>
    );
  }

  let createModal = null;
  if (isCreatingNew) {
    createModal = (
      <AddToAlbumModal
        selectedPhotos={[]}
        onClose={handleModalClose}
      />
    );
  }

  let headerButton = null;
  if (!isLoading && !error && albums.length > 0) {
    headerButton = (
      <button className="albums-page-create-button" onClick={handleCreateNewClick}>
        <FolderIcon />
        <span>New Album</span>
      </button>
    );
  }

  return (
    <div className="page-container albums-page">
      <div className="page-header">
        {headerButton}
      </div>
      {content}
      {createModal}
    </div>
  );
}

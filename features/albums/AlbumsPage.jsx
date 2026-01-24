import ApiClient from '../../commons/http/ApiClient.js';
import Link from '../../commons/components/Link.jsx';
import IconButton from '../../commons/components/IconButton.jsx';
import EmptyState from '../../commons/components/EmptyState.jsx';
import LoadingContainer from '../../commons/components/LoadingContainer.jsx';
import MessageBox from '../../commons/components/MessageBox.jsx';
import { FolderIcon } from '../../commons/components/Icon.jsx';
import AddToAlbumModal from './AddToAlbumModal.jsx';
import getThumbnailUrl from '../../commons/utils/getThumbnailUrl.js';
import pluralize from '../../commons/utils/pluralize.js';
import './AlbumsPage.css';

const { useState, useEffect } = React;

export default function AlbumsPage() {
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    loadAlbums();
  }, []);

  async function loadAlbums() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ApiClient.getAlbums();
      setAlbums(data);
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
      <MessageBox variant="error">
        Error: {error}
      </MessageBox>
    );
  } else if (isLoading) {
    content = <LoadingContainer size={32} />;
  } else if (albums.length === 0) {
    content = (
      <EmptyState
        icon={<FolderIcon />}
        title="No albums yet"
        description="Create an album to organize your photos."
        actionButton={
          <IconButton onClick={handleCreateNewClick}>
            + New Album
          </IconButton>
        }
      />
    );
  } else {
    content = <AlbumGrid albums={albums} />
  }

  let modalContent = null;
  if (isCreatingNew) {
    modalContent = <AddToAlbumModal selectedPhotos={[]} onClose={handleModalClose} />;
  }

  let headerButton = null;
  if (!isLoading && !error && albums.length > 0) {
    headerButton = (
      <IconButton onClick={handleCreateNewClick}>
        <FolderIcon />
        <span>New Album</span>
      </IconButton>
    );
  }

  return (
    <div className="page-container albums-page">
      <div className="page-header">
        {headerButton}
      </div>
      {content}
      {modalContent}
    </div>
  );
}

function AlbumGrid({ albums }) {
  const cards = albums.map(album => {
    let coverImage = null;
    if (album.coverPath) {
      const thumbnailUrl = getThumbnailUrl(album.coverPath);
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
            {album.photoCount} {pluralize(album.photoCount, 'photo')}
          </div>
        </div>
      </Link>
    );
  });

  return (
    <div className="albums-page-grid">
      {cards}
    </div>
  );
}
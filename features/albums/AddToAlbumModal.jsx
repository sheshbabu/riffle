import ApiClient from '../../commons/http/ApiClient.js';
import { ModalBackdrop, ModalContainer, ModalHeader, ModalContent, ModalFooter } from '../../commons/components/Modal.jsx';
import Button from '../../commons/components/Button.jsx';
import CreateAlbumModal from './CreateAlbumModal.jsx';
import { showToast } from '../../commons/components/Toast.jsx';
import pluralize from '../../commons/utils/pluralize.js';
import './AddToAlbumModal.css';

const { useState, useEffect } = React;

export default function AddToAlbumModal({ selectedPhotos, onClose }) {
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAlbums();
  }, []);

  async function loadAlbums() {
    try {
      const data = await ApiClient.getAlbums();
      setAlbums(data);
    } catch (error) {
      showToast('Failed to load albums');
    }
  }

  function handleAlbumToggle(albumId) {
    if (selectedAlbumIds.includes(albumId)) {
      setSelectedAlbumIds(selectedAlbumIds.filter(id => id !== albumId));
    } else {
      setSelectedAlbumIds([...selectedAlbumIds, albumId]);
    }
  }

  function handleAlbumCreated(newAlbum) {
    setAlbums([...albums, newAlbum]);
    setSelectedAlbumIds([...selectedAlbumIds, newAlbum.albumId]);
  }

  async function handleAddToAlbums() {
    if (selectedAlbumIds.length === 0) {
      showToast('Please select at least one album');
      return;
    }

    setIsLoading(true);
    try {
      await ApiClient.addPhotosToAlbums(selectedAlbumIds, selectedPhotos);
      const photoCount = selectedPhotos.length;
      const albumCount = selectedAlbumIds.length;
      showToast(`Added ${photoCount} ${pluralize(photoCount, 'photo')} to ${albumCount} ${pluralize(albumCount, 'album')}`);
      onClose();
    } catch (error) {
      showToast('Failed to add photos to albums');
    } finally {
      setIsLoading(false);
    }
  }

  let createAlbumModal = null;
  if (isCreatingNew) {
    createAlbumModal = (
      <CreateAlbumModal
        onClose={() => setIsCreatingNew(false)}
        onAlbumCreated={handleAlbumCreated}
      />
    );
  }

  let albumListItems = null;
  if (albums.length === 0 && !isCreatingNew) {
    albumListItems = (
      <div className="add-to-album-modal-empty">
        No albums yet. Create one to get started.
      </div>
    );
  } else {
    albumListItems = albums.map(album => {
      const isSelected = selectedAlbumIds.includes(album.albumId);
      const itemClass = `add-to-album-modal-album-item ${isSelected ? 'is-selected' : ''}`;

      return (
        <div key={album.albumId} className={itemClass} onClick={() => handleAlbumToggle(album.albumId)}>
          <input type="checkbox" checked={isSelected} onChange={() => { }} className="add-to-album-modal-checkbox" />
          <div className="add-to-album-modal-album-info">
            <div className="add-to-album-modal-album-name">{album.name}</div>
            <AlbumCount album={album} />
          </div>
        </div>
      );
    });
  }

  return (
    <>
      <ModalBackdrop onClose={onClose}>
        <ModalContainer className="add-to-album-modal">
          <ModalHeader title="Add to Album" onClose={onClose} />
          <ModalContent>
            <div className="add-to-album-modal-header-actions">
              <Button onClick={() => setIsCreatingNew(true)} variant="secondary" size="small" >
                New Album
              </Button>
            </div>
            <div className="add-to-album-modal-album-list">
              {albumListItems}
            </div>
          </ModalContent>
          <ModalFooter isRightAligned>
            <Button onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleAddToAlbums} disabled={isLoading || selectedAlbumIds.length === 0} variant="primary">
              Add to {pluralize(selectedAlbumIds.length, 'album')}
            </Button>
          </ModalFooter>
        </ModalContainer>
      </ModalBackdrop>
      {createAlbumModal}
    </>
  );
}

function AlbumCount({ album }) {
  return (
    <div className="add-to-album-modal-album-count">
      {album.photoCount} {pluralize(album.photoCount, 'photo')}
    </div>
  );
}
import ApiClient from '../../commons/http/ApiClient.js';
import { ModalBackdrop, ModalContainer, ModalHeader, ModalContent, ModalFooter } from '../../commons/components/Modal.jsx';
import Button from '../../commons/components/Button.jsx';
import { showToast } from '../../commons/components/Toast.jsx';
import './AddToAlbumModal.css';

const { useState, useEffect } = React;

export default function AddToAlbumModal({ selectedPhotos, onClose }) {
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(function () {
    loadAlbums();
  }, []);

  async function loadAlbums() {
    try {
      const albumsData = await ApiClient.getAlbums();
      setAlbums(albumsData);
    } catch (error) {
      console.error('Failed to load albums:', error);
    }
  }

  function handleAlbumToggle(albumId) {
    if (selectedAlbumIds.includes(albumId)) {
      setSelectedAlbumIds(selectedAlbumIds.filter(id => id !== albumId));
    } else {
      setSelectedAlbumIds([...selectedAlbumIds, albumId]);
    }
  }

  async function handleCreateNewAlbum() {
    if (!newAlbumName.trim()) {
      showToast('Album name is required');
      return;
    }

    setIsLoading(true);
    try {
      const newAlbum = await ApiClient.createAlbum(newAlbumName.trim(), newAlbumDescription.trim());
      setAlbums([...albums, newAlbum]);
      setSelectedAlbumIds([...selectedAlbumIds, newAlbum.albumId]);
      setNewAlbumName('');
      setNewAlbumDescription('');
      setIsCreatingNew(false);
      showToast('Album created');
    } catch (error) {
      console.error('Failed to create album:', error);
    } finally {
      setIsLoading(false);
    }
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
      showToast(`Added ${photoCount} photo${photoCount > 1 ? 's' : ''} to ${albumCount} album${albumCount > 1 ? 's' : ''}`);
      onClose();
    } catch (error) {
      console.error('Failed to add photos to albums:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const sortedAlbums = [...albums].sort((a, b) => a.name.localeCompare(b.name));

  function renderAlbumCount(album) {
    let photoCountElement = null;
    if (album.photoCount > 0) {
      photoCountElement = (
        <div className="add-to-album-modal-album-count">
          {album.photoCount} photo{album.photoCount > 1 ? 's' : ''}
        </div>
      );
    }
    return photoCountElement;
  }

  let newAlbumSection = null;
  if (isCreatingNew) {
    newAlbumSection = (
      <div className="add-to-album-modal-new-album">
        <input type="text" placeholder="Name" value={newAlbumName} onChange={(e) => setNewAlbumName(e.target.value)} className="add-to-album-modal-input" autoFocus />
        <textarea placeholder="Description" value={newAlbumDescription} onChange={(e) => setNewAlbumDescription(e.target.value)} className="add-to-album-modal-textarea" rows="2" />
        <div className="add-to-album-modal-new-album-buttons">
          <Button onClick={handleCreateNewAlbum} disabled={isLoading} variant="primary">
            Create Album
          </Button>
          <Button onClick={() => setIsCreatingNew(false)} variant="secondary">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  let albumListItems = null;
  if (sortedAlbums.length === 0 && !isCreatingNew) {
    albumListItems = (
      <div className="add-to-album-modal-empty">
        No albums yet. Create one to get started.
      </div>
    );
  } else {
    albumListItems = sortedAlbums.map(album => {
      const isSelected = selectedAlbumIds.includes(album.albumId);
      const itemClass = `add-to-album-modal-album-item ${isSelected ? 'is-selected' : ''}`;

      return (
        <div key={album.albumId} className={itemClass} onClick={() => handleAlbumToggle(album.albumId)}>
          <input type="checkbox" checked={isSelected} onChange={() => { }} className="add-to-album-modal-checkbox" />
          <div className="add-to-album-modal-album-info">
            <div className="add-to-album-modal-album-name">{album.name}</div>
            {renderAlbumCount(album)}
          </div>
        </div>
      );
    });
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalContainer className="add-to-album-modal">
        <ModalHeader title="Add to Album" onClose={onClose} />
        <ModalContent>
          <div className="add-to-album-modal-header-actions">
            <Button onClick={() => setIsCreatingNew(!isCreatingNew)} variant="secondary" size="small" >
              New Album
            </Button>
          </div>
          {newAlbumSection}
          <div className="add-to-album-modal-album-list">
            {albumListItems}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button onClick={handleAddToAlbums} disabled={isLoading || selectedAlbumIds.length === 0} variant="primary">
            Add to {selectedAlbumIds.length > 0 ? selectedAlbumIds.length : ''} Album{selectedAlbumIds.length !== 1 ? 's' : ''}
          </Button>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
        </ModalFooter>
      </ModalContainer>
    </ModalBackdrop>
  );
}

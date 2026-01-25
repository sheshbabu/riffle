import ApiClient from '../../commons/http/ApiClient.js';
import { ModalBackdrop, ModalContainer, ModalHeader, ModalContent, ModalFooter } from '../../commons/components/Modal.jsx';
import Button from '../../commons/components/Button.jsx';
import Input from '../../commons/components/Input.jsx';
import { showToast } from '../../commons/components/Toast.jsx';
import './CreateAlbumModal.css';

const { useState } = React;

export default function CreateAlbumModal({ onClose, onAlbumCreated }) {
  const [albumName, setAlbumName] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreateAlbum() {
    if (!albumName.trim()) {
      showToast('Album name is required');
      return;
    }

    setIsLoading(true);
    try {
      const newAlbum = await ApiClient.createAlbum(albumName.trim(), albumDescription.trim());
      showToast('Album created!');
      if (onAlbumCreated) {
        onAlbumCreated(newAlbum);
      }
      onClose();
    } catch (error) {
      showToast('Failed to create album');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalContainer className="create-album-modal">
        <ModalHeader title="New Album" onClose={onClose} />
        <ModalContent>
          <Input
            id="album-name"
            type="text"
            placeholder="Name"
            value={albumName}
            onChange={(e) => setAlbumName(e.target.value)}
            autoFocus
          />
          <Input
            id="album-description"
            type="textarea"
            placeholder="Description"
            value={albumDescription}
            onChange={(e) => setAlbumDescription(e.target.value)}
            rows={3}
          />
        </ModalContent>
        <ModalFooter isRightAligned>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleCreateAlbum} disabled={isLoading} variant="primary">
            Create Album
          </Button>
        </ModalFooter>
      </ModalContainer>
    </ModalBackdrop>
  );
}

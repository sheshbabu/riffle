import { ModalBackdrop, ModalContainer, ModalHeader, ModalContent, ModalFooter } from '../../commons/components/Modal.jsx';
import Button from '../../commons/components/Button.jsx';
import PhotoTagsInput from './PhotoTagsInput.jsx';
import ApiClient from '../../commons/http/ApiClient.js';
import { showToast } from '../../commons/components/Toast.jsx';
import './ManageTagsModal.css';

const { useState, useEffect } = React;

export default function ManageTagsModal({ selectedPhotos, onClose }) {
  const [currentTags, setCurrentTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTags() {
      if (selectedPhotos.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const tags = await ApiClient.getPhotoTags(selectedPhotos[0]);
        setCurrentTags(tags);
      } catch (err) {
        console.error('Failed to load tags:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTags();
  }, [selectedPhotos]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [onClose]);

  async function handleAddTag(tag) {
    try {
      let tagId = tag.tagId;
      if (tagId === -1) {
        const createdTag = await ApiClient.createTag(tag.name);
        tagId = createdTag.tagId;
      }
      await ApiClient.addTagsToPhotos([tagId], selectedPhotos);
      setCurrentTags([...currentTags, { tagId, name: tag.name }]);
      showToast(`Tag added to ${selectedPhotos.length} photo${selectedPhotos.length > 1 ? 's' : ''}`);
    } catch (err) {
      console.error('Failed to add tag:', err);
      showToast('Failed to add tag');
    }
  }

  async function handleRemoveTag(tag) {
    try {
      await ApiClient.removeTagFromPhotos(tag.tagId, selectedPhotos);
      setCurrentTags(currentTags.filter(t => t.tagId !== tag.tagId));
    } catch (err) {
      console.error('Failed to remove tag:', err);
      showToast('Failed to remove tag');
    }
  }

  let content = null;
  if (isLoading) {
    content = <div className="manage-tags-loading">Loading tags...</div>;
  } else {
    content = (
      <>
        <p className="manage-tags-info">
          Managing tags for {selectedPhotos.length} selected photo{selectedPhotos.length > 1 ? 's' : ''}
        </p>
        <div className="manage-tags-input-wrapper">
          <PhotoTagsInput tags={currentTags} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} />
        </div>
      </>
    );
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalContainer className="manage-tags-modal">
        <ModalHeader title="Manage Tags" onClose={onClose} />
        <ModalContent>
          {content}
        </ModalContent>
        <ModalFooter isRightAligned>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContainer>
    </ModalBackdrop>
  );
}

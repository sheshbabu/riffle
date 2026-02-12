import { ModalBackdrop, ModalContainer, ModalHeader, ModalContent, ModalFooter } from '../../commons/components/Modal.jsx';
import Button from '../../commons/components/Button.jsx';
import ButtonGroup from '../../commons/components/ButtonGroup.jsx';
import Input from '../../commons/components/Input.jsx';
import ApiClient from '../../commons/http/ApiClient.js';
import { showToast } from '../../commons/components/Toast.jsx';
import './TagDetailModal.css';

const { useState, useEffect } = React;

export default function TagDetailModal({ tag, onClose, onUpdate, onDelete }) {
  const [name, setName] = useState(tag.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  async function handleUpdate() {
    const trimmedName = name.trim();
    if (trimmedName === '') {
      showToast('Tag name cannot be empty');
      return;
    }

    if (trimmedName === tag.name) {
      onClose();
      return;
    }

    setIsUpdating(true);
    try {
      await ApiClient.updateTag(tag.tagId, trimmedName);
      showToast('Tag updated successfully');
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Failed to update tag:', err);
      showToast('Failed to update tag');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await ApiClient.deleteTag(tag.tagId);
      showToast('Tag deleted successfully');
      onDelete();
      onClose();
    } catch (err) {
      console.error('Failed to delete tag:', err);
      showToast('Failed to delete tag');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalContainer className="tag-detail-modal">
        <ModalHeader title="Edit Tag" onClose={onClose} />
        <ModalContent>
          <div className="tag-detail-danger-zone">
            <p className="tag-detail-warning">
              Deleting this tag will remove it from all photos.
            </p>
          </div>
          <Input
            id="tag-name"
            placeholder="Tag Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </ModalContent>
        <ModalFooter>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isUpdating || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Tag'}
          </Button>
          <ButtonGroup>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isUpdating || isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdate}
              disabled={isUpdating || isDeleting}
            >
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
          </ButtonGroup>
        </ModalFooter>
      </ModalContainer>
    </ModalBackdrop>
  );
}

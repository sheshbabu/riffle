import { ModalBackdrop, ModalContainer, ModalHeader, ModalContent, ModalFooter } from '../../commons/components/Modal.jsx';
import Button from '../../commons/components/Button.jsx';
import pluralize from '../../commons/utils/pluralize.js';
import './DeletePhotosModal.css';

export default function DeletePhotosModal({ count, onClose, onConfirm, isDeleting }) {
  return (
    <ModalBackdrop onClose={onClose}>
      <ModalContainer>
        <ModalHeader title="Remove from Disk" onClose={onClose} />
        <ModalContent>
          <p>Permanently delete {count} {pluralize(count, 'photo')}?</p>
          <p className="delete-modal-warning">
            This will remove files from your library folder and cannot be undone.
          </p>
        </ModalContent>
        <ModalFooter isRightAligned={true}>
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Remove from Disk'}
          </Button>
        </ModalFooter>
      </ModalContainer>
    </ModalBackdrop>
  );
}

import { ModalBackdrop, ModalContainer } from './Modal.jsx';
import { CloseIcon } from './Icon.jsx';
import './Lightbox.css';

const { useState, useEffect } = React;

export default function Lightbox({ photos, selectedIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    function handleKeyDown(e) {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setIsZoomed(false);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < photos.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsZoomed(false);
          }
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photos.length, onClose]);

  function handleImageClick() {
    setIsZoomed(!isZoomed);
  }

  function getPhotoUrl(filePath) {
    const encoded = btoa(filePath);
    return `/api/photo/?path=${encoded}`;
  }

  const photoUrl = getPhotoUrl(currentPhoto.filePath);
  const isVideo = currentPhoto.isVideo;

  let mediaElement = null;
  if (isVideo) {
    mediaElement = (
      <video
        src={photoUrl}
        className="lightbox-image"
        controls
        autoPlay
      />
    );
  } else {
    mediaElement = (
      <img
        src={photoUrl}
        alt=""
        className={`lightbox-image ${!isVideo ? 'zoomable' : ''}`}
        onClick={!isVideo ? handleImageClick : null}
      />
    );
  }

  return (
    <ModalBackdrop onClose={onClose} isCentered={true}>
      <ModalContainer className={isZoomed === true ? 'lightbox zoomed' : 'lightbox'}>
        <div className="lightbox-image-container">
          {mediaElement}
          <div className="lightbox-controls">
            <div className="lightbox-close-button" onClick={onClose}>
              <CloseIcon />
            </div>
          </div>
        </div>
      </ModalContainer>
    </ModalBackdrop>
  );
}

import Lightbox from '../../commons/components/Lightbox.jsx';
import './PhotoGallery.css';

const { useState } = React;

export default function PhotoGallery({ photos, selectedIndex, onPhotoSelect, fadingPhotos, onUndo }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const fadingSet = fadingPhotos || new Set();
  function getPhotoUrl(filePath, width = null, height = null) {
    const encoded = btoa(filePath);
    let url = `/api/photo/?path=${encoded}`;
    if (width) {
      url += `&width=${width}`;
    }
    if (height) {
      url += `&height=${height}`;
    }
    return url;
  }

  function isVideoFile(filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    return ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg'].includes(ext);
  }

  function handlePhotoClick(index, e) {
    if (e.detail === 2) {
      setLightboxIndex(index);
    } else {
      if (onPhotoSelect) {
        onPhotoSelect(index);
      }
    }
  }

  function handleCloseLightbox() {
    setLightboxIndex(null);
  }

  const photoElements = photos.map((photo, index) => {
    const isVideo = photo.isVideo || isVideoFile(photo.filePath);
    const thumbnailUrl = getPhotoUrl(photo.filePath, 300, 300);
    const isSelected = index === selectedIndex;
    const isFading = fadingSet.has(photo.filePath);

    let className = 'gallery-item';
    if (isSelected) {
      className += ' selected';
    }
    if (isFading) {
      className += ' fading';
    }

    let mediaElement = null;
    if (isVideo) {
      mediaElement = (
        <img
          src={thumbnailUrl}
          alt={photo.filePath}
          className="gallery-media"
          loading="lazy"
        />
      );
    } else {
      mediaElement = (
        <img
          src={thumbnailUrl}
          alt={photo.filePath}
          className="gallery-media"
          loading="lazy"
        />
      );
    }

    let undoButton = null;
    if (isFading && onUndo) {
      undoButton = (
        <div className="undo-overlay" onClick={(e) => {
          e.stopPropagation();
          onUndo(photo.filePath);
        }}>
          <button className="undo-button">Undo</button>
        </div>
      );
    }

    return (
      <div key={photo.filePath} className={className} onClick={(e) => handlePhotoClick(index, e)}>
        {mediaElement}
        {isVideo && (
          <div className="video-indicator">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        )}
        {undoButton}
      </div>
    );
  });

  let lightboxElement = null;
  if (lightboxIndex !== null) {
    lightboxElement = (
      <Lightbox
        photos={photos}
        selectedIndex={lightboxIndex}
        onClose={handleCloseLightbox}
      />
    );
  }

  return (
    <>
      <div className="photo-gallery">
        {photoElements}
      </div>
      {lightboxElement}
    </>
  );
}

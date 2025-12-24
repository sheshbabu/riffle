import Lightbox from '../../commons/components/Lightbox.jsx';
import './PhotoGallery.css';

const { useState } = React;

export default function PhotoGallery({ photos }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  function getPhotoUrl(filePath) {
    const encoded = btoa(filePath);
    return `/api/photo/?path=${encoded}`;
  }

  function isVideoFile(filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    return ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg'].includes(ext);
  }

  function handlePhotoClick(index) {
    setLightboxIndex(index);
  }

  function handleCloseLightbox() {
    setLightboxIndex(null);
  }

  const photoElements = photos.map((photo, index) => {
    const photoUrl = getPhotoUrl(photo.filePath);
    const isVideo = photo.isVideo || isVideoFile(photo.filePath);

    let mediaElement = null;
    if (isVideo) {
      mediaElement = (
        <video src={photoUrl} className="gallery-media" />
      );
    } else {
      mediaElement = (
        <img
          src={photoUrl}
          alt={photo.filePath}
          className="gallery-media"
          loading="lazy"
        />
      );
    }

    return (
      <div key={photo.filePath} className="gallery-item" onClick={() => handlePhotoClick(index)}>
        {mediaElement}
        {isVideo && (
          <div className="video-indicator">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        )}
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

import Lightbox from '../../commons/components/Lightbox.jsx';
import './SessionGallery.css';

const { useState } = React;

export default function SessionGallery({ photos, sessions }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

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

  function handlePhotoClick(index) {
    setLightboxIndex(index);
  }

  function handleCloseLightbox() {
    setLightboxIndex(null);
  }

  function formatSessionDate(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const timeOptions = { hour: 'numeric', minute: '2-digit' };

    const sameDay = start.toDateString() === end.toDateString();

    if (sameDay) {
      return `${start.toLocaleDateString('en-US', dateOptions)} • ${start.toLocaleTimeString('en-US', timeOptions)} - ${end.toLocaleTimeString('en-US', timeOptions)}`;
    } else {
      return `${start.toLocaleDateString('en-US', dateOptions)} - ${end.toLocaleDateString('en-US', dateOptions)}`;
    }
  }

  const sessionElements = sessions.map((session, sessionIndex) => {
    const sessionPhotos = photos.slice(0, session.photoCount);

    const photoElements = sessionPhotos.map((photo, photoIndex) => {
      const isVideo = photo.isVideo || isVideoFile(photo.filePath);
      const thumbnailUrl = getPhotoUrl(photo.filePath, 300, 300);

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

      const globalIndex = sessionPhotos.slice(0, sessionIndex).reduce((acc, s) => acc + s.photoCount, 0) + photoIndex;

      return (
        <div key={photo.filePath} className="session-gallery-item" onClick={() => handlePhotoClick(globalIndex)}>
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

    return (
      <div key={session.sessionId} className="session-group">
        <div className="session-header">
          <h3>{formatSessionDate(session.startTime, session.endTime)}</h3>
          <span className="session-count">{session.photoCount} {session.photoCount === 1 ? 'photo' : 'photos'}</span>
        </div>
        <div className="session-grid">
          {photoElements}
        </div>
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
      <div className="session-gallery">
        {sessionElements}
      </div>
      {lightboxElement}
    </>
  );
}

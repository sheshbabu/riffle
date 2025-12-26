import Lightbox from '../../commons/components/Lightbox.jsx';
import './SessionGallery.css';

const { useState } = React;

export default function SessionGallery({ photos, sessions, selectedIndex, onPhotoSelect, fadingPhotos, onUndo }) {
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

  function formatSessionDate(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const timeOptions = { hour: 'numeric', minute: '2-digit' };

    const sameDay = start.toDateString() === end.toDateString();
    const startTimeStr = start.toLocaleTimeString('en-US', timeOptions);
    const endTimeStr = end.toLocaleTimeString('en-US', timeOptions);
    const sameDisplayTime = startTimeStr === endTimeStr;

    if (sameDay && sameDisplayTime) {
      return `${start.toLocaleDateString('en-US', dateOptions)} • ${startTimeStr}`;
    } else if (sameDay) {
      return `${start.toLocaleDateString('en-US', dateOptions)} • ${startTimeStr} - ${endTimeStr}`;
    } else {
      return `${start.toLocaleDateString('en-US', dateOptions)} - ${end.toLocaleDateString('en-US', dateOptions)}`;
    }
  }

  let photoOffset = 0;
  const sessionElements = sessions.map((session, sessionIdx) => {
    const sessionPhotos = photos.slice(photoOffset, photoOffset + session.photoCount);
    const sessionStartIndex = photoOffset;
    photoOffset += session.photoCount;

    const photoElements = sessionPhotos.map((photo, photoIdx) => {
      const isVideo = photo.isVideo || isVideoFile(photo.filePath);
      const thumbnailUrl = getPhotoUrl(photo.filePath, 300, 300);
      const globalIndex = sessionStartIndex + photoIdx;
      const isSelected = globalIndex === selectedIndex;
      const isFading = fadingSet.has(photo.filePath);

      let className = 'session-gallery-item';
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
        <div key={photo.filePath} className={className} onClick={(e) => handlePhotoClick(globalIndex, e)}>
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

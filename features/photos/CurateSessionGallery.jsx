import Lightbox from '../../commons/components/Lightbox.jsx';
import './SessionGallery.css';
import './CurateGallery.css';

const { useState, useEffect } = React;

export default function CurateSessionGallery({ photos, sessions, selectedIndex, onPhotoSelect, fadingPhotos, onCurate, onUndo }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    if (selectedIndex >= photos.length && photos.length > 0) {
      onPhotoSelect(Math.max(0, photos.length - 1));
    }
  }, [photos.length, selectedIndex]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (lightboxIndex !== null) {
        return;
      }

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (photos.length === 0) {
        return;
      }

      const currentPhoto = photos[selectedIndex];
      if (!currentPhoto || fadingPhotos.has(currentPhoto.filePath)) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          onPhotoSelect(Math.min(photos.length - 1, selectedIndex + 1));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onPhotoSelect(Math.max(0, selectedIndex - 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          {
            const nextIndex = selectedIndex + getGridColumns();
            onPhotoSelect(Math.min(photos.length - 1, nextIndex));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          {
            const prevIndex = selectedIndex - getGridColumns();
            onPhotoSelect(Math.max(0, prevIndex));
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          setLightboxIndex(selectedIndex);
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          onCurate(currentPhoto.filePath, true, false, 0);
          break;
        case 'x':
        case 'X':
          e.preventDefault();
          onCurate(currentPhoto.filePath, true, true, 0);
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          e.preventDefault();
          onCurate(currentPhoto.filePath, true, false, parseInt(e.key));
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, photos, lightboxIndex, fadingPhotos]);

  function getGridColumns() {
    const gridElement = document.querySelector('.session-grid');
    if (!gridElement) {
      return 5;
    }
    const style = window.getComputedStyle(gridElement);
    const columns = style.gridTemplateColumns.split(' ').length;
    return columns;
  }

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
      onPhotoSelect(index);
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

  let photoIndex = 0;
  const sessionElements = sessions.map((session, sessionIdx) => {
    const sessionPhotos = photos.slice(photoIndex, photoIndex + session.photoCount);
    const sessionStartIndex = photoIndex;
    photoIndex += session.photoCount;

    const photoElements = sessionPhotos.map((photo, photoIdx) => {
      const isVideo = photo.isVideo || isVideoFile(photo.filePath);
      const thumbnailUrl = getPhotoUrl(photo.filePath, 300, 300);
      const globalIndex = sessionStartIndex + photoIdx;
      const isSelected = globalIndex === selectedIndex;
      const isFading = fadingPhotos.has(photo.filePath);

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
      if (isFading) {
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
        onCurate={onCurate}
        isCurateMode={true}
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

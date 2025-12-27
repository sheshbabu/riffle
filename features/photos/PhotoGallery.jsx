import Lightbox from '../../commons/components/Lightbox.jsx';
import getPhotoUrl from '../../commons/utils/getPhotoUrl.js';
import isVideoFile from '../../commons/utils/isVideoFile.js';
import formatSessionDate from '../../commons/utils/formatSessionDate.js';
import './PhotoGallery.css';

const { useState, useEffect } = React;

export default function PhotoGallery({
  photos,
  sessions,
  selectedIndex,
  onPhotoSelect,
  fadingPhotos,
  onCurate,
  onUndo,
  isCurateMode = false
}) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const fadingSet = fadingPhotos || new Set();
  const isSessionView = sessions && sessions.length > 0;

  useEffect(() => {
    if (isCurateMode && selectedIndex >= photos.length && photos.length > 0) {
      onPhotoSelect(Math.max(0, photos.length - 1));
    }
  }, [photos.length, selectedIndex, isCurateMode]);

  useEffect(() => {
    if (!isCurateMode) {
      return;
    }

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
      if (!currentPhoto || fadingSet.has(currentPhoto.filePath)) {
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
  }, [selectedIndex, photos, lightboxIndex, fadingSet, isCurateMode]);

  function getGridColumns() {
    const gridSelector = isSessionView ? '.session-grid' : '.photo-gallery';
    const gridElement = document.querySelector(gridSelector);
    if (!gridElement) {
      return 5;
    }
    const style = window.getComputedStyle(gridElement);
    const columns = style.gridTemplateColumns.split(' ').length;
    return columns;
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

  function renderPhotoItem(photo, index) {
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

    let videoIndicator = null;
    if (isVideo) {
      videoIndicator = (
        <div className="video-indicator">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      );
    }

    return (
      <div key={photo.filePath} className={className} onClick={(e) => handlePhotoClick(index, e)}>
        <img
          src={thumbnailUrl}
          alt={photo.filePath}
          className="gallery-media"
          loading="lazy"
        />
        {videoIndicator}
        {undoButton}
      </div>
    );
  }

  let galleryContent = null;

  if (isSessionView) {
    let photoOffset = 0;
    const sessionElements = sessions.map((session) => {
      const sessionPhotos = photos.slice(photoOffset, photoOffset + session.photoCount);
      const sessionStartIndex = photoOffset;
      photoOffset += session.photoCount;

      const photoElements = sessionPhotos.map((photo, photoIdx) => {
        const globalIndex = sessionStartIndex + photoIdx;
        return renderPhotoItem(photo, globalIndex);
      });

      let locationElement = null;
      if (session.location) {
        locationElement = <span className="session-location">{session.location}</span>;
      }

      return (
        <div key={session.sessionId} className="session-group">
          <div className="session-header">
            <span className="session-date">{formatSessionDate(session.startTime, session.endTime)}</span>
            {locationElement}
            <span className="session-count">{session.photoCount} {session.photoCount === 1 ? 'photo' : 'photos'}</span>
          </div>
          <div className="session-grid">
            {photoElements}
          </div>
        </div>
      );
    });

    galleryContent = (
      <div className="session-gallery">
        {sessionElements}
      </div>
    );
  } else {
    const photoElements = photos.map((photo, index) => renderPhotoItem(photo, index));

    galleryContent = (
      <div className="photo-gallery">
        {photoElements}
      </div>
    );
  }

  let lightboxElement = null;
  if (lightboxIndex !== null) {
    lightboxElement = (
      <Lightbox
        photos={photos}
        selectedIndex={lightboxIndex}
        onClose={handleCloseLightbox}
        onCurate={isCurateMode ? onCurate : undefined}
        isCurateMode={isCurateMode}
      />
    );
  }

  return (
    <>
      {galleryContent}
      {lightboxElement}
    </>
  );
}

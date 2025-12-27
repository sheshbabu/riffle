import Lightbox from '../../commons/components/Lightbox.jsx';
import getPhotoUrl from '../../commons/utils/getPhotoUrl.js';
import isVideoFile from '../../commons/utils/isVideoFile.js';
import formatSessionDate from '../../commons/utils/formatSessionDate.js';
import formatDuration from '../../commons/utils/formatDuration.js';
import './PhotoGallery.css';

const { useState, useEffect } = React;

export default function PhotoGallery({
  photos,
  sessions,
  selectedIndices,
  onSelectionChange,
  fadingPhotos,
  onCurate,
  onUndo,
  isCurateMode = false
}) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const fadingSet = fadingPhotos || new Set();
  const selectedSet = selectedIndices || new Set();
  const isSessionView = sessions && sessions.length > 0;

  const selectedIndex = selectedSet.size > 0 ? Array.from(selectedSet)[0] : null;

  useEffect(() => {
    if (isCurateMode && selectedIndex !== null && selectedIndex >= photos.length && photos.length > 0) {
      onSelectionChange(new Set([Math.max(0, photos.length - 1)]));
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

      const lastIndex = photos.length - 1;
      const cols = getGridColumns();

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          onSelectionChange(new Set([Math.min(lastIndex, selectedIndex + 1)]));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onSelectionChange(new Set([Math.max(0, selectedIndex - 1)]));
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (isSessionView) {
            const newIndex = getNextRowIndex(selectedIndex, cols, sessions, photos.length);
            onSelectionChange(new Set([newIndex]));
          } else {
            onSelectionChange(new Set([Math.min(lastIndex, selectedIndex + cols)]));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (isSessionView) {
            const newIndex = getPrevRowIndex(selectedIndex, cols, sessions);
            onSelectionChange(new Set([newIndex]));
          } else {
            onSelectionChange(new Set([Math.max(0, selectedIndex - cols)]));
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          setLightboxIndex(selectedIndex);
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
      return;
    }

    if (!onSelectionChange) {
      return;
    }

    if (e.shiftKey && selectedIndex !== null) {
      onSelectionChange(createRangeSet(selectedIndex, index));
    } else if (e.metaKey || e.ctrlKey) {
      const newSelection = new Set(selectedSet);
      if (newSelection.has(index)) {
        newSelection.delete(index);
      } else {
        newSelection.add(index);
      }
      onSelectionChange(newSelection);
    } else {
      onSelectionChange(new Set([index]));
    }
  }

  function handleCloseLightbox() {
    setLightboxIndex(null);
  }

  function renderPhotoItem(photo, index) {
    const isVideo = photo.isVideo || isVideoFile(photo.filePath);
    const thumbnailUrl = getPhotoUrl(photo.filePath, 300, 300);
    const isSelected = selectedSet.has(index);
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
      const duration = formatDuration(photo.duration, true);
      videoIndicator = (
        <div className="video-indicator">
          {duration || 'Video'}
        </div>
      );
    }

    return (
      <div
        key={photo.filePath}
        className={className}
        onClick={(e) => handlePhotoClick(index, e)}
      >
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

function createRangeSet(start, end) {
  const set = new Set();
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  for (let i = from; i <= to; i++) {
    set.add(i);
  }
  return set;
}

function getSessionInfo(index, sessions) {
  let photoOffset = 0;
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const sessionStart = photoOffset;
    const sessionEnd = photoOffset + session.photoCount;
    if (index >= sessionStart && index < sessionEnd) {
      return {
        sessionIndex: i,
        sessionStart,
        sessionEnd,
        indexInSession: index - sessionStart,
        photoCount: session.photoCount,
      };
    }
    photoOffset = sessionEnd;
  }
  return null;
}

function getNextRowIndex(currentIndex, cols, sessions, totalPhotos) {
  const info = getSessionInfo(currentIndex, sessions);
  if (!info) {
    return Math.min(totalPhotos - 1, currentIndex + cols);
  }

  const currentRow = Math.floor(info.indexInSession / cols);
  const currentCol = info.indexInSession % cols;
  const totalRowsInSession = Math.ceil(info.photoCount / cols);
  const nextRow = currentRow + 1;

  if (nextRow < totalRowsInSession) {
    const nextIndexInSession = nextRow * cols + currentCol;
    if (nextIndexInSession < info.photoCount) {
      return info.sessionStart + nextIndexInSession;
    }
    return info.sessionEnd - 1;
  }

  if (info.sessionIndex + 1 < sessions.length) {
    let nextSessionStart = info.sessionEnd;
    const nextSession = sessions[info.sessionIndex + 1];
    const targetIndexInNextSession = Math.min(currentCol, nextSession.photoCount - 1);
    return nextSessionStart + targetIndexInNextSession;
  }

  return currentIndex;
}

function getPrevRowIndex(currentIndex, cols, sessions) {
  const info = getSessionInfo(currentIndex, sessions);
  if (!info) {
    return Math.max(0, currentIndex - cols);
  }

  const currentRow = Math.floor(info.indexInSession / cols);
  const currentCol = info.indexInSession % cols;
  const prevRow = currentRow - 1;

  if (prevRow >= 0) {
    const prevIndexInSession = prevRow * cols + currentCol;
    return info.sessionStart + prevIndexInSession;
  }

  if (info.sessionIndex > 0) {
    let prevSessionStart = 0;
    for (let i = 0; i < info.sessionIndex - 1; i++) {
      prevSessionStart += sessions[i].photoCount;
    }
    const prevSession = sessions[info.sessionIndex - 1];
    const totalRowsInPrevSession = Math.ceil(prevSession.photoCount / cols);
    const lastRowStart = (totalRowsInPrevSession - 1) * cols;
    const targetCol = Math.min(currentCol, prevSession.photoCount - 1 - lastRowStart);
    const targetIndexInPrevSession = lastRowStart + targetCol;
    return prevSessionStart + Math.min(targetIndexInPrevSession, prevSession.photoCount - 1);
  }

  return currentIndex;
}

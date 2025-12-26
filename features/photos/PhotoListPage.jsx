import ApiClient from '../../commons/http/ApiClient.js';
import PhotoGallery from './PhotoGallery.jsx';
import Pagination from '../../commons/components/Pagination.jsx';
import SegmentedControl from '../../commons/components/SegmentedControl.jsx';
import { LoadingSpinner } from '../../commons/components/Icon.jsx';
import './LibraryPage.css';
import './Loading.css';

const { useState, useEffect } = React;

const PAGE_CONFIG = {
  library: {
    fetchPhotos: (offset, withSessions) => ApiClient.getPhotos(offset, withSessions),
    emptyMessage: 'No photos found. Import photos from the inbox first.',
    initialSelectedIndex: null,
    fadeOnlyOnTrash: true,
    showViewToggle: true,
    showActionButtons: true,
  },
  curate: {
    fetchPhotos: (offset, withSessions) => ApiClient.getUncuratedPhotos(offset, withSessions),
    emptyMessage: 'No photos to curate. All photos have been reviewed!',
    initialSelectedIndex: 0,
    fadeOnlyOnTrash: false,
    showViewToggle: true,
    showActionButtons: true,
  },
  trash: {
    fetchPhotos: (offset) => ApiClient.getTrashedPhotos(offset),
    emptyMessage: 'No trashed photos. Trash is empty.',
    initialSelectedIndex: null,
    fadeOnlyOnTrash: true,
    showViewToggle: false,
    showActionButtons: false,
  },
};

export default function PhotoListPage({ mode = 'library' }) {
  const config = PAGE_CONFIG[mode];
  const isCurateMode = mode === 'curate';

  const [photos, setPhotos] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [pageStartRecord, setPageStartRecord] = useState(0);
  const [pageEndRecord, setPageEndRecord] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit, setLimit] = useState(100);
  const [viewMode, setViewMode] = useState('sessions');
  const [selectedIndex, setSelectedIndex] = useState(config.initialSelectedIndex);
  const [fadingPhotos, setFadingPhotos] = useState(new Set());
  const [undoTimers, setUndoTimers] = useState(new Map());

  useEffect(() => {
    async function fetchPhotos() {
      setIsLoading(true);
      setError(null);

      try {
        const withSessions = config.showViewToggle && viewMode === 'sessions';
        const data = await config.fetchPhotos(offset, withSessions);
        setPhotos(data.photos || []);
        setSessions(data.sessions || []);
        setPageStartRecord(data.pageStartRecord || 0);
        setPageEndRecord(data.pageEndRecord || 0);
        setTotalRecords(data.totalRecords || 0);
        setLimit(data.limit || 100);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
          mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }

    fetchPhotos();
  }, [offset, viewMode]);

  function handleViewModeChange(mode) {
    setViewMode(mode);
  }

  function handlePhotoSelect(index) {
    setSelectedIndex(index);
  }

  function handlePhotoRemoved(filePath) {
    setPhotos(prevPhotos => prevPhotos.filter(p => p.filePath !== filePath));
    setTotalRecords(prev => Math.max(0, prev - 1));
    setPageEndRecord(prev => Math.max(0, prev - 1));
  }

  async function curatePhoto(filePath, isCurated, isTrashed, rating) {
    try {
      const response = await fetch('/api/photos/curate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          isCurated,
          isTrashed,
          rating,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to curate photo');
      }

      const shouldFade = config.fadeOnlyOnTrash ? isTrashed : true;

      if (shouldFade) {
        setFadingPhotos(prev => new Set([...prev, filePath]));

        const timerId = setTimeout(() => {
          handlePhotoRemoved(filePath);
          setFadingPhotos(prev => {
            const next = new Set(prev);
            next.delete(filePath);
            return next;
          });
          setUndoTimers(prev => {
            const next = new Map(prev);
            next.delete(filePath);
            return next;
          });
        }, 3000);

        setUndoTimers(prev => new Map([...prev, [filePath, timerId]]));
      } else {
        setPhotos(prevPhotos => prevPhotos.map(p => {
          if (p.filePath === filePath) {
            return { ...p, isCurated: true, isTrashed: false, rating };
          }
          return p;
        }));
      }
    } catch (err) {
      console.error('Failed to curate photo:', err);
    }
  }

  function handleUndo(filePath) {
    const timerId = undoTimers.get(filePath);
    if (timerId) {
      clearTimeout(timerId);
      setFadingPhotos(prev => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
      setUndoTimers(prev => {
        const next = new Map(prev);
        next.delete(filePath);
        return next;
      });
    }
  }

  function handleAcceptClick() {
    if (selectedIndex === null || !photos[selectedIndex]) {
      return;
    }
    curatePhoto(photos[selectedIndex].filePath, true, false, 0);
  }

  function handleRejectClick() {
    if (selectedIndex === null || !photos[selectedIndex]) {
      return;
    }
    curatePhoto(photos[selectedIndex].filePath, true, true, 0);
  }

  function handleRateClick(rating) {
    if (selectedIndex === null || !photos[selectedIndex]) {
      return;
    }
    curatePhoto(photos[selectedIndex].filePath, true, false, rating);
  }

  function handlePrevPage() {
    if (offset > 0) {
      setOffset(Math.max(0, offset - limit));
    }
  }

  function handleNextPage() {
    if (offset + limit < totalRecords) {
      setOffset(offset + limit);
    }
  }

  let content = null;

  if (error) {
    content = (
      <div className="message-box error">
        Error: {error}
      </div>
    );
  } else if (photos.length === 0 && !isLoading) {
    content = (
      <div className="message-box">
        {config.emptyMessage}
      </div>
    );
  } else if (photos.length > 0) {
    const sessionsToPass = viewMode === 'sessions' ? sessions : null;
    content = (
      <PhotoGallery
        photos={photos}
        sessions={sessionsToPass}
        selectedIndex={selectedIndex}
        onPhotoSelect={handlePhotoSelect}
        fadingPhotos={fadingPhotos}
        onCurate={curatePhoto}
        onUndo={handleUndo}
        isCurateMode={isCurateMode}
      />
    );
  }

  const hasPrev = offset > 0;
  const hasNext = offset + limit < totalRecords;

  let paginationElement = null;
  if (!error && totalRecords > limit) {
    paginationElement = (
      <Pagination
        pageStartRecord={pageStartRecord}
        pageEndRecord={pageEndRecord}
        totalRecords={totalRecords}
        onPrev={handlePrevPage}
        onNext={handleNextPage}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />
    );
  }

  let viewToggle = null;
  if (config.showViewToggle && !error && photos.length > 0) {
    const viewModeOptions = [
      { value: 'sessions', label: 'Grouped' },
      { value: 'grid', label: 'Grid' },
    ];
    viewToggle = (
      <SegmentedControl
        options={viewModeOptions}
        value={viewMode}
        onChange={handleViewModeChange}
      />
    );
  }

  let loadingOverlay = null;
  if (isLoading) {
    loadingOverlay = (
      <div className="loading-overlay">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  let actionButtons = null;
  if (config.showActionButtons && selectedPhoto) {
    const isAccepted = selectedPhoto.isCurated && !selectedPhoto.isTrashed;
    const isRejected = selectedPhoto.isTrashed;
    const currentRating = selectedPhoto.rating || 0;

    const starElements = [1, 2, 3, 4, 5].map(rating => {
      const isFilled = rating <= currentRating;
      return (
        <button key={rating} className={`action-button rate ${isFilled ? 'active' : ''}`} onClick={() => handleRateClick(rating)} title={`Rate ${rating}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={isFilled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
          </svg>
        </button>
      );
    });

    actionButtons = (
      <div className="library-actions">
        <button className={`action-button accept ${isAccepted && currentRating === 0 ? 'active' : ''}`} onClick={handleAcceptClick} title="Accept (P)">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>Accept</span>
        </button>
        <button className={`action-button reject ${isRejected ? 'active' : ''}`} onClick={handleRejectClick} title="Reject (X)">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
          </svg>
          <span>Reject</span>
        </button>
        <div className="rating-buttons">
          {starElements}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        {actionButtons}
        <div className="right-actions">
          {viewToggle}
          {paginationElement}
        </div>
      </div>
      {content}
      {loadingOverlay}
    </div>
  );
}

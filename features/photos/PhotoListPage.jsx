import ApiClient from '../../commons/http/ApiClient.js';
import PhotoGallery from './PhotoGallery.jsx';
import Pagination from '../../commons/components/Pagination.jsx';
import SegmentedControl from '../../commons/components/SegmentedControl.jsx';
import { LoadingSpinner, PickIcon, RejectIcon, UnflagIcon } from '../../commons/components/Icon.jsx';
import { showToast } from '../../commons/components/Toast.jsx';
import ViewPreferences from '../../commons/utils/ViewPreferences.js';
import useSearchParams from '../../commons/hooks/useSearchParams.js';
import { updateSearchParams } from '../../commons/components/Link.jsx';
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
  const searchParams = useSearchParams();

  const offsetParam = searchParams.get('offset');
  const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10) || 0) : 0;

  const viewParam = searchParams.get('view');
  const savedView = ViewPreferences.getPreference(mode);
  const viewMode = (viewParam === 'grid' || viewParam === 'sessions') ? viewParam : savedView;

  const [photos, setPhotos] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageStartRecord, setPageStartRecord] = useState(0);
  const [pageEndRecord, setPageEndRecord] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit, setLimit] = useState(100);
  const initialSelection = config.initialSelectedIndex !== null ? new Set([config.initialSelectedIndex]) : new Set();
  const [selectedIndices, setSelectedIndices] = useState(initialSelection);
  const [fadingPhotos, setFadingPhotos] = useState(new Set());
  const [undoTimers, setUndoTimers] = useState(new Map());
  const [isCurating, setIsCurating] = useState(false);

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
          mainContent.scrollTo({ top: 0 });
        }
      }
    }

    fetchPhotos();
  }, [offset, viewMode]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const hasPrev = offset > 0;
      const hasNext = offset + limit < totalRecords;

      if (e.key === 'j' || e.key === 'J') {
        if (hasNext) {
          e.preventDefault();
          handleNextPage();
        }
      } else if (e.key === 'k' || e.key === 'K') {
        if (hasPrev) {
          e.preventDefault();
          handlePrevPage();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [offset, limit, totalRecords]);

  useEffect(() => {
    if (!config.showActionButtons) {
      return;
    }

    function handleCurateKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const hasSelection = selectedIndices.size > 0;
      if (!hasSelection) {
        return;
      }

      switch (e.key) {
        case 'p':
        case 'P':
          e.preventDefault();
          handlePickClick();
          break;
        case 'x':
        case 'X':
          e.preventDefault();
          handleRejectClick();
          break;
        case 'u':
        case 'U':
          e.preventDefault();
          handleUnflagClick();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          e.preventDefault();
          handleRateClick(parseInt(e.key));
          break;
      }
    }

    document.addEventListener('keydown', handleCurateKeyDown);
    return () => document.removeEventListener('keydown', handleCurateKeyDown);
  }, [selectedIndices, photos]);

  function handleViewModeChange(newViewMode) {
    ViewPreferences.setPreference(mode, newViewMode);
    updateSearchParams({ view: newViewMode === savedView ? null : newViewMode });
  }

  function handleSelectionChange(indices) {
    setSelectedIndices(indices);
  }

  function handlePhotoRemoved(filePath) {
    setPhotos(prevPhotos => {
      const removedIndex = prevPhotos.findIndex(p => p.filePath === filePath);
      const newPhotos = prevPhotos.filter(p => p.filePath !== filePath);

      if (removedIndex !== -1 && viewMode === 'sessions') {
        setSessions(prevSessions => {
          let photoOffset = 0;
          return prevSessions.map(session => {
            const sessionStart = photoOffset;
            const sessionEnd = photoOffset + session.photoCount;
            photoOffset = sessionEnd;

            if (removedIndex >= sessionStart && removedIndex < sessionEnd) {
              return { ...session, photoCount: session.photoCount - 1 };
            }
            return session;
          }).filter(session => session.photoCount > 0);
        });
      }

      return newPhotos;
    });
    setTotalRecords(prev => Math.max(0, prev - 1));
    setPageEndRecord(prev => Math.max(0, prev - 1));
  }

  async function curatePhoto(filePath, isCurated, isTrashed, rating, shouldSkipToast = false) {
    setIsCurating(true);
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

      if (!shouldSkipToast) {
        let toastMessage = 'Photo updated';
        if (isTrashed) {
          toastMessage = 'Photo rejected';
        } else if (rating > 0) {
          const stars = rating === 1 ? 'star' : 'stars';
          toastMessage = `Photo rated ${rating} ${stars}`;
        } else if (isCurated) {
          toastMessage = 'Photo picked';
        } else {
          toastMessage = 'Photo unflagged';
        }
        showToast(toastMessage, 2000);
      }
    } catch (err) {
      showToast('Failed to update photo', 3000);
    } finally {
      setIsCurating(false);
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

  function getSelectedFilePaths() {
    return Array.from(selectedIndices).map(i => photos[i]?.filePath).filter(Boolean);
  }

  function handlePickClick() {
    const filePaths = getSelectedFilePaths();
    if (filePaths.length === 0) {
      return;
    }
    filePaths.forEach(filePath => curatePhoto(filePath, true, false, 0, true));
    setSelectedIndices(new Set());
    const count = filePaths.length;
    const label = count === 1 ? 'Photo' : `${count} photos`;
    showToast(`${label} picked`, 2000);
  }

  function handleRejectClick() {
    const filePaths = getSelectedFilePaths();
    if (filePaths.length === 0) {
      return;
    }
    filePaths.forEach(filePath => curatePhoto(filePath, true, true, 0, true));
    setSelectedIndices(new Set());
    const count = filePaths.length;
    const label = count === 1 ? 'Photo' : `${count} photos`;
    showToast(`${label} rejected`, 2000);
  }

  function handleUnflagClick() {
    const filePaths = getSelectedFilePaths();
    if (filePaths.length === 0) {
      return;
    }
    filePaths.forEach(filePath => curatePhoto(filePath, false, false, 0, true));
    setSelectedIndices(new Set());
    const count = filePaths.length;
    const label = count === 1 ? 'Photo' : `${count} photos`;
    showToast(`${label} unflagged`, 2000);
  }

  function handleRateClick(rating) {
    const filePaths = getSelectedFilePaths();
    if (filePaths.length === 0) {
      return;
    }
    filePaths.forEach(filePath => curatePhoto(filePath, true, false, rating, true));
    setSelectedIndices(new Set());
    const count = filePaths.length;
    const label = count === 1 ? 'Photo' : `${count} photos`;
    const stars = rating === 1 ? 'star' : 'stars';
    showToast(`${label} rated ${rating} ${stars}`, 2000);
  }

  function handlePrevPage() {
    if (offset > 0) {
      const newOffset = Math.max(0, offset - limit);
      updateSearchParams({ offset: newOffset });
    }
  }

  function handleNextPage() {
    if (offset + limit < totalRecords) {
      const newOffset = offset + limit;
      updateSearchParams({ offset: newOffset });
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
        selectedIndices={selectedIndices}
        onSelectionChange={handleSelectionChange}
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

  const hasSelection = selectedIndices.size > 0;
  const firstSelectedIndex = hasSelection ? Array.from(selectedIndices)[0] : null;
  const selectedPhoto = firstSelectedIndex !== null ? photos[firstSelectedIndex] : null;

  let actionButtons = null;
  if (config.showActionButtons && hasSelection) {
    const isPicked = selectedIndices.size === 1 && selectedPhoto ? (selectedPhoto.isCurated && !selectedPhoto.isTrashed) : false;
    const isRejected = selectedIndices.size === 1 && selectedPhoto ? selectedPhoto.isTrashed : false;
    const currentRating = selectedIndices.size === 1 && selectedPhoto ? (selectedPhoto.rating || 0) : 0;

    const starElements = [1, 2, 3, 4, 5].map(rating => {
      const isFilled = rating <= currentRating;
      return (
        <button key={rating} className={`action-button rate ${isFilled ? 'active' : ''}`} onClick={() => handleRateClick(rating)} title={`Rate ${rating}`} disabled={isCurating}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={isFilled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
          </svg>
        </button>
      );
    });


    actionButtons = (
      <div className="library-actions">
        <button className={`action-button pick ${isPicked && currentRating === 0 ? 'active' : ''}`} onClick={handlePickClick} title="Pick (P)" disabled={isCurating}>
          <PickIcon />
          <span>Pick</span>
        </button>
        <button className={`action-button reject ${isRejected ? 'active' : ''}`} onClick={handleRejectClick} title="Reject (X)" disabled={isCurating}>
          <RejectIcon />
          <span>Reject</span>
        </button>
        <button className="action-button unflag" onClick={handleUnflagClick} title="Unflag (U)" disabled={isCurating}>
          <UnflagIcon />
          <span>Unflag</span>
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
        <span className="selection-count">{selectedIndices.size} selected</span>
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

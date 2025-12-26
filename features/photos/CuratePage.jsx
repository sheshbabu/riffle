import ApiClient from '../../commons/http/ApiClient.js';
import CurateGallery from './CurateGallery.jsx';
import CurateSessionGallery from './CurateSessionGallery.jsx';
import Pagination from '../../commons/components/Pagination.jsx';
import './LibraryPage.css';

const { useState, useEffect } = React;

export default function CuratePage() {
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

  useEffect(() => {
    async function fetchPhotos() {
      setIsLoading(true);
      setError(null);

      try {
        const withSessions = viewMode === 'sessions';
        const data = await ApiClient.getUncuratedPhotos(offset, withSessions);
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

  function handlePhotoRemoved(filePath) {
    setPhotos(prevPhotos => prevPhotos.filter(p => p.filePath !== filePath));
    setTotalRecords(prev => Math.max(0, prev - 1));
    setPageEndRecord(prev => Math.max(0, prev - 1));
  }

  function handleToggleViewMode() {
    setViewMode(prev => prev === 'grid' ? 'sessions' : 'grid');
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
        No photos to curate. All photos have been reviewed!
      </div>
    );
  } else if (photos.length > 0) {
    if (viewMode === 'sessions') {
      content = <CurateSessionGallery photos={photos} sessions={sessions} onPhotoRemoved={handlePhotoRemoved} />;
    } else {
      content = <CurateGallery photos={photos} onPhotoRemoved={handlePhotoRemoved} />;
    }
  } else if (isLoading && photos.length === 0) {
    content = (
      <div className="message-box">
        Loading photos...
      </div>
    );
  }

  const hasPrev = offset > 0;
  const hasNext = offset + limit < totalRecords;

  let paginationElement = null;
  if (!isLoading && !error && totalRecords > limit) {
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

  let loadingIndicator = null;
  if (isLoading && photos.length > 0) {
    loadingIndicator = (
      <div className="loading-overlay">
        Loading...
      </div>
    );
  }

  let viewToggle = null;
  if (!isLoading && !error && photos.length > 0) {
    const toggleText = viewMode === 'sessions' ? 'Grid View' : 'Session View';
    viewToggle = (
      <button className="view-toggle-button" onClick={handleToggleViewMode}>
        {toggleText}
      </button>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        {viewToggle}
        {paginationElement}
      </div>
      {loadingIndicator}
      {content}
    </div>
  );
}

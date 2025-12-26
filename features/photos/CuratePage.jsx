import ApiClient from '../../commons/http/ApiClient.js';
import CurateGallery from './CurateGallery.jsx';
import CurateSessionGallery from './CurateSessionGallery.jsx';
import Pagination from '../../commons/components/Pagination.jsx';
import SegmentedControl from '../../commons/components/SegmentedControl.jsx';
import { LoadingSpinner } from '../../commons/components/Icon.jsx';
import './LibraryPage.css';
import './Loading.css';

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

  function handleViewModeChange(mode) {
    setViewMode(mode);
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


  const viewModeOptions = [
    { value: 'sessions', label: 'Grouped' },
    { value: 'grid', label: 'Grid' },
  ];

  let viewToggle = null;
  if (!error && photos.length > 0) {
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

  return (
    <div className="page-container">
      <div className="page-header">
        {viewToggle}
        {paginationElement}
      </div>
      {content}
      {loadingOverlay}
    </div>
  );
}

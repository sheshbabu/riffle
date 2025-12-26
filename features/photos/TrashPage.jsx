import ApiClient from '../../commons/http/ApiClient.js';
import PhotoGallery from './PhotoGallery.jsx';
import Pagination from '../../commons/components/Pagination.jsx';
import { LoadingSpinner } from '../../commons/components/Icon.jsx';
import './LibraryPage.css';
import './Loading.css';

const { useState, useEffect } = React;

export default function TrashPage() {
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [pageStartRecord, setPageStartRecord] = useState(0);
  const [pageEndRecord, setPageEndRecord] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    async function fetchPhotos() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await ApiClient.getTrashedPhotos(offset);
        setPhotos(data.photos || []);
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
  }, [offset]);

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
        No trashed photos. Trash is empty.
      </div>
    );
  } else if (photos.length > 0) {
    content = <PhotoGallery photos={photos} />;
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
      {content}
      {paginationElement}
      {loadingOverlay}
    </div>
  );
}

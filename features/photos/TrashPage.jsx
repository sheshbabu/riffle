import PhotoGallery from './PhotoGallery.jsx';
import Pagination from '../../commons/components/Pagination.jsx';
import './PhotosPage.css';

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
        const response = await fetch(`/api/photos/trashed/?offset=${offset}`);
        if (!response.ok) {
          throw new Error('Failed to fetch trashed photos');
        }
        const data = await response.json();
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
  } else if (isLoading && photos.length === 0) {
    content = (
      <div className="message-box">
        Loading photos...
      </div>
    );
  }

  const hasPrev = offset > 0;
  const hasNext = offset + limit < totalRecords;
  const shouldShowPagination = !isLoading && !error && totalRecords > limit;

  let paginationElement = null;
  if (shouldShowPagination) {
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

  return (
    <div className="page-container">
      <h2>Trash</h2>
      {loadingIndicator}
      {content}
      {paginationElement}
    </div>
  );
}

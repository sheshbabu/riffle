import { PrevIcon, NextIcon } from './Icon.jsx';
import './Pagination.css';

export default function Pagination({ pageStartRecord, pageEndRecord, totalRecords, onPrev, onNext, hasPrev, hasNext }) {
  function handlePrevClick(e) {
    e.preventDefault();
    if (!hasPrev) {
      return;
    }
    onPrev();
  }

  function handleNextClick(e) {
    e.preventDefault();
    if (!hasNext) {
      return;
    }
    onNext();
  }

  return (
    <div className="pagination-container">
      <div className="pagination">
        <span className="pagination-text">{pageStartRecord} - {pageEndRecord} of {totalRecords}</span>
        <a href="#" className={!hasPrev ? 'disabled' : ''} onClick={handlePrevClick}  >
          <PrevIcon />
        </a>
        <a href="#" className={!hasNext ? 'disabled' : ''} onClick={handleNextClick}  >
          <NextIcon />
        </a>
      </div>
    </div>
  );
}

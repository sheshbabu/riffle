import { ModalBackdrop } from './Modal.jsx';
import { CloseIcon, InfoIcon, SwapIcon, PromoteIcon } from './Icon.jsx';
import getPhotoUrl from '../utils/getPhotoUrl.js';
import formatDateTime from '../utils/formatDateTime.js';
import formatDuration from '../utils/formatDuration.js';
import formatFocalLength from '../utils/formatFocalLength.js';
import formatExposureTime from '../utils/formatExposureTime.js';
import getFileName from '../utils/getFileName.js';
import './CompareMode.css';

const { useState, useEffect } = React;

export default function CompareMode({ photos, selectIndex: initialSelectIndex, candidateIndex: initialCandidateIndex, onClose, onCurate }) {
  const [selectIndex, setSelectIndex] = useState(initialSelectIndex);
  const [candidateIndex, setCandidateIndex] = useState(initialCandidateIndex);
  const [showMetadata, setShowMetadata] = useState(false);

  const selectPhoto = photos[selectIndex];
  const candidatePhoto = photos[candidateIndex];

  useEffect(() => {
    function handleKeyDown(e) {
      switch (e.key) {
        case 'c':
        case 'C':
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          e.stopPropagation();
          moveCandidatePrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          e.stopPropagation();
          moveCandidateNext();
          break;
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          swapPhotos();
          break;
        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          promoteCandidate();
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          e.stopPropagation();
          setShowMetadata(!showMetadata);
          break;
      }

      if (onCurate && candidatePhoto) {
        switch (e.key) {
          case 'p':
          case 'P':
            e.preventDefault();
            e.stopPropagation();
            handleCurate(true, false, 0);
            break;
          case 'x':
          case 'X':
            e.preventDefault();
            e.stopPropagation();
            handleCurate(true, true, 0);
            break;
          case 'u':
          case 'U':
            e.preventDefault();
            e.stopPropagation();
            handleCurate(false, false, 0);
            break;
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
            e.preventDefault();
            e.stopPropagation();
            handleCurate(true, false, parseInt(e.key));
            break;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [selectIndex, candidateIndex, showMetadata, onClose, onCurate, candidatePhoto]);

  function findNextCandidateIndex(startIndex, direction) {
    const totalPhotos = photos.length;
    let newIndex = startIndex;

    for (let i = 0; i < totalPhotos; i++) {
      if (direction === 'next') {
        newIndex = (newIndex + 1) % totalPhotos;
      } else {
        newIndex = (newIndex - 1 + totalPhotos) % totalPhotos;
      }

      if (newIndex !== selectIndex) {
        return newIndex;
      }
    }

    return startIndex;
  }

  function moveCandidateNext() {
    const newIndex = findNextCandidateIndex(candidateIndex, 'next');
    setCandidateIndex(newIndex);
  }

  function moveCandidatePrevious() {
    const newIndex = findNextCandidateIndex(candidateIndex, 'previous');
    setCandidateIndex(newIndex);
  }

  function swapPhotos() {
    const tempSelect = selectIndex;
    setSelectIndex(candidateIndex);
    setCandidateIndex(tempSelect);
  }

  function promoteCandidate() {
    const newSelectIndex = candidateIndex;
    const newCandidateIndex = findNextCandidateIndex(candidateIndex, 'next');

    setSelectIndex(newSelectIndex);
    setCandidateIndex(newCandidateIndex);
  }

  function handleCurate(isCurated, isTrashed, rating) {
    onCurate(candidatePhoto.filePath, isCurated, isTrashed, rating);

    if (isCurated && (isTrashed || rating > 0)) {
      const newCandidateIndex = findNextCandidateIndex(candidateIndex, 'next');

      if (newCandidateIndex === candidateIndex) {
        setTimeout(() => onClose(), 300);
      } else {
        setTimeout(() => setCandidateIndex(newCandidateIndex), 300);
      }
    }
  }

  function renderMetadata(photo) {
    const metadataItems = [];

    metadataItems.push({ label: 'File Name', value: getFileName(photo.filePath) });

    if (photo.width && photo.height) {
      metadataItems.push({ label: 'Dimensions', value: `${photo.width} × ${photo.height}` });
    }

    if (photo.cameraMake || photo.cameraModel) {
      const camera = [photo.cameraMake, photo.cameraModel].filter(Boolean).join(' ');
      metadataItems.push({ label: 'Camera', value: camera });
    }

    if (photo.dateTime) {
      metadataItems.push({ label: 'Date Taken', value: formatDateTime(photo.dateTime) });
    }

    const settingsParts = [];
    if (photo.iso) settingsParts.push(`ISO ${photo.iso}`);
    if (photo.fNumber) settingsParts.push(`f/${photo.fNumber}`);
    if (photo.exposureTime) settingsParts.push(formatExposureTime(photo.exposureTime));
    if (photo.focalLength) settingsParts.push(formatFocalLength(photo.focalLength));

    if (settingsParts.length > 0) {
      metadataItems.push({ label: 'Settings', value: settingsParts.join(', ') });
    }

    if (photo.rating !== undefined) {
      const ratingValue = photo.rating > 0 ? `${'★'.repeat(photo.rating)}` : 'Unrated';
      metadataItems.push({ label: 'Rating', value: ratingValue });
    }

    if (photo.duration) {
      metadataItems.push({ label: 'Duration', value: formatDuration(photo.duration) });
    }

    const metadataElements = metadataItems.map((item, index) => (
      <div key={index} className="compare-metadata-item">
        <div className="compare-metadata-label">{item.label}</div>
        <div className="compare-metadata-value">{item.value}</div>
      </div>
    ));

    return metadataElements;
  }

  function renderMediaElement(photo) {
    const photoUrl = getPhotoUrl(photo.filePath);

    if (photo.isVideo) {
      return (
        <video
          src={photoUrl}
          className="compare-image"
          controls
        />
      );
    }

    return (
      <img
        src={photoUrl}
        alt=""
        className="compare-image"
      />
    );
  }

  const selectMediaElement = renderMediaElement(selectPhoto);
  const candidateMediaElement = renderMediaElement(candidatePhoto);

  let metadataPanel = null;
  if (showMetadata) {
    metadataPanel = (
      <div className="compare-metadata">
        <div className="compare-metadata-content">
          <div className="compare-metadata-column">
            {renderMetadata(selectPhoto)}
          </div>
          <div className="compare-metadata-column">
            {renderMetadata(candidatePhoto)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ModalBackdrop onClose={onClose} isCentered={true}>
      <div className="compare-controls">
        <div className="compare-button" onClick={swapPhotos} title="Swap Photos (↓)">
          <SwapIcon />
          <span>Swap</span>
        </div>
        <div className="compare-button" onClick={promoteCandidate} title="Promote Candidate (↑)">
          <PromoteIcon />
          <span>Make Reference</span>
        </div>
        <div className="compare-button" onClick={() => setShowMetadata(!showMetadata)} title="Toggle Info (I)">
          <InfoIcon />
          <span>Info</span>
        </div>
        <div className="compare-button" onClick={onClose} title="Close (C or Escape)">
          <CloseIcon />
        </div>
      </div>

      <div className="compare-container">
        <div className="compare-photo-pane">
          {selectMediaElement}
        </div>

        <div className="compare-photo-pane">
          {candidateMediaElement}
        </div>
      </div>

      <div className="compare-labels">
        <div className="compare-label">Reference</div>
        <div className="compare-label">{candidateIndex + 1} of {photos.length}</div>
      </div>

      {metadataPanel}
    </ModalBackdrop>
  );
}

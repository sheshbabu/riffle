import { ModalBackdrop, ModalContainer } from './Modal.jsx';
import { CloseIcon, InfoIcon, PickIcon, RejectIcon, UnflagIcon, StarIcon } from './Icon.jsx';
import getPhotoUrl from '../utils/getPhotoUrl.js';
import formatDateTime from '../utils/formatDateTime.js';
import formatFileSize from '../utils/formatFileSize.js';
import formatExposureTime from '../utils/formatExposureTime.js';
import formatDuration from '../utils/formatDuration.js';
import formatFocalLength from '../utils/formatFocalLength.js';
import getFileName from '../utils/getFileName.js';
import './Lightbox.css';

const { useState, useEffect } = React;

export default function Lightbox({ photos, selectedIndex, onClose, onCurate }) {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    function handleKeyDown(e) {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setIsZoomed(false);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < photos.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsZoomed(false);
          }
          break;
        case 'i':
          e.preventDefault();
          setShowMetadata(!showMetadata);
          break;
      }

      if (onCurate && currentPhoto) {
        switch (e.key) {
          case 'p':
          case 'P':
            e.preventDefault();
            onCurate(currentPhoto.filePath, true, false, 0);
            advanceToNext();
            break;
          case 'x':
          case 'X':
            e.preventDefault();
            onCurate(currentPhoto.filePath, true, true, 0);
            advanceToNext();
            break;
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
            e.preventDefault();
            onCurate(currentPhoto.filePath, true, false, parseInt(e.key));
            advanceToNext();
            break;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photos.length, onClose, showMetadata, onCurate, currentPhoto]);

  function advanceToNext() {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsZoomed(false);
    } else {
      onClose();
    }
  }

  function handleImageClick() {
    setIsZoomed(!isZoomed);
    if (!isZoomed) {
      setShowMetadata(false);
    }
  }

  function handleToggleMetadata() {
    setShowMetadata(!showMetadata);
  }

  const photoUrl = getPhotoUrl(currentPhoto.filePath);
  const isVideo = currentPhoto.isVideo;

  let mediaElement = null;
  if (isVideo) {
    mediaElement = (
      <video
        src={photoUrl}
        className="lightbox-image"
        controls
      />
    );
  } else {
    mediaElement = (
      <img
        src={photoUrl}
        alt=""
        className={`lightbox-image ${!isVideo ? 'zoomable' : ''}`}
        onClick={!isVideo ? handleImageClick : null}
      />
    );
  }

  let metadataPanel = null;
  if (showMetadata) {
    const metadataItems = [];

    metadataItems.push({ label: 'File Name', value: getFileName(currentPhoto.filePath) });
    metadataItems.push({ label: 'File Size', value: formatFileSize(currentPhoto.fileSize) });
    metadataItems.push({ label: 'Format', value: currentPhoto.fileFormat });

    if (currentPhoto.dateTime) {
      metadataItems.push({ label: 'Date Taken', value: formatDateTime(currentPhoto.dateTime) });
    }

    if (currentPhoto.width && currentPhoto.height) {
      metadataItems.push({ label: 'Dimensions', value: `${currentPhoto.width} × ${currentPhoto.height}` });
    }

    if (currentPhoto.cameraMake || currentPhoto.cameraModel) {
      const camera = [currentPhoto.cameraMake, currentPhoto.cameraModel].filter(Boolean).join(' ');
      metadataItems.push({ label: 'Camera', value: camera });
    }

    if (currentPhoto.iso) {
      metadataItems.push({ label: 'ISO', value: currentPhoto.iso });
    }

    if (currentPhoto.fNumber) {
      metadataItems.push({ label: 'Aperture', value: `f/${currentPhoto.fNumber}` });
    }

    if (currentPhoto.exposureTime) {
      metadataItems.push({ label: 'Shutter Speed', value: formatExposureTime(currentPhoto.exposureTime) });
    }

    if (currentPhoto.focalLength) {
      metadataItems.push({ label: 'Focal Length', value: formatFocalLength(currentPhoto.focalLength) });
    }

    if (currentPhoto.city || currentPhoto.state || currentPhoto.countryName) {
      const locationParts = [currentPhoto.city, currentPhoto.state, currentPhoto.countryName].filter(Boolean);
      metadataItems.push({ label: 'Location', value: locationParts.join(', ') });
    }

    if (currentPhoto.latitude && currentPhoto.longitude) {
      metadataItems.push({ label: 'GPS', value: `${currentPhoto.latitude.toFixed(5)}, ${currentPhoto.longitude.toFixed(5)}`, });
    }

    if (currentPhoto.duration) {
      metadataItems.push({ label: 'Duration', value: formatDuration(currentPhoto.duration) });
    }

    if (currentPhoto.fileCreatedAt) {
      metadataItems.push({ label: 'File Created', value: formatDateTime(currentPhoto.fileCreatedAt) });
    }

    if (currentPhoto.fileModifiedAt) {
      metadataItems.push({ label: 'File Modified', value: formatDateTime(currentPhoto.fileModifiedAt) });
    }

    if (currentPhoto.originalFilepath) {
      metadataItems.push({ label: 'Original Path', value: currentPhoto.originalFilepath });
    }

    const metadataElements = metadataItems.map((item, index) => (
      <div key={index} className="metadata-item">
        <div className="metadata-label">{item.label}</div>
        <div className="metadata-value">{item.value}</div>
      </div>
    ));

    metadataPanel = (
      <div className="lightbox-metadata">
        <div className="metadata-content">
          {metadataElements}
        </div>
      </div>
    );
  }

  let curateButtons = null;
  if (onCurate && !isZoomed) {
    curateButtons = (
      <>
        <div className="lightbox-button" onClick={() => { onCurate(currentPhoto.filePath, true, false, 0); advanceToNext(); }} title="Pick (P)">
          <PickIcon />
          <span>Pick</span>
        </div>
        <div className="lightbox-button" onClick={() => { onCurate(currentPhoto.filePath, true, true, 0); advanceToNext(); }} title="Reject (X)">
          <RejectIcon />
          <span>Reject</span>
        </div>
        <div className="lightbox-button" onClick={() => { onCurate(currentPhoto.filePath, false, false, 0); advanceToNext(); }} title="Unflag (U)">
          <UnflagIcon />
          <span>Unflag</span>
        </div>
        <div className="lightbox-divider"></div>
        {[1, 2, 3, 4, 5].map(rating => (
          <div key={rating} className="lightbox-button" onClick={() => { onCurate(currentPhoto.filePath, true, false, rating); advanceToNext(); }} title={`Rate ${rating} (${rating})`}>
            <StarIcon size={20} isFilled={currentPhoto.rating >= rating} />
          </div>
        ))}
        <div className="lightbox-divider"></div>
      </>
    );
  }

  let infoButton = null;
  if (!isZoomed) {
    infoButton = (
      <div className="lightbox-button" onClick={handleToggleMetadata} title="Toggle metadata (i)">
        <InfoIcon />
        <span>Info</span>
      </div>
    );
  }

  return (
    <ModalBackdrop onClose={onClose} isCentered={true}>
      <div className="lightbox-controls">
        {curateButtons}
        {infoButton}
        <div className="lightbox-button" onClick={onClose}>
          <CloseIcon />
        </div>
      </div>
      <ModalContainer className={isZoomed === true ? 'lightbox zoomed' : 'lightbox'}>
        <div className="lightbox-image-container">
          {mediaElement}
        </div>
        {metadataPanel}
      </ModalContainer>
    </ModalBackdrop>
  );
}

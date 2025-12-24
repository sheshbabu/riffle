import { ModalBackdrop, ModalContainer } from './Modal.jsx';
import { CloseIcon, InfoIcon } from './Icon.jsx';
import './Lightbox.css';

const { useState, useEffect } = React;

export default function Lightbox({ photos, selectedIndex, onClose, onCurate, isCurateMode = false }) {
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

      if (isCurateMode && onCurate && currentPhoto) {
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
  }, [currentIndex, photos.length, onClose, showMetadata, isCurateMode, onCurate, currentPhoto]);

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
  }

  function handleToggleMetadata() {
    setShowMetadata(!showMetadata);
  }

  function getPhotoUrl(filePath) {
    const encoded = btoa(filePath);
    return `/api/photo/?path=${encoded}`;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) {
      return `${bytes} B`
    };
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    };
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    };
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) {
      return null
    };
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
  }

  function formatExposureTime(exposureTime) {
    if (!exposureTime) {
      return null
    };
    const decimal = parseFloat(exposureTime);
    if (decimal >= 1) return `${decimal}s`;
    const fraction = 1 / decimal;
    return `1/${Math.round(fraction)}s`;
  }

  function getFileName(filePath) {
    return filePath.split('/').pop();
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
        autoPlay
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
      metadataItems.push({ label: 'Focal Length', value: `${currentPhoto.focalLength}mm` });
    }

    if (currentPhoto.latitude && currentPhoto.longitude) {
      metadataItems.push({ label: 'GPS', value: `${currentPhoto.latitude}, ${currentPhoto.longitude}` });
    }

    if (currentPhoto.duration) {
      metadataItems.push({ label: 'Duration', value: currentPhoto.duration });
    }

    if (currentPhoto.fileCreatedAt) {
      metadataItems.push({ label: 'File Created', value: formatDateTime(currentPhoto.fileCreatedAt) });
    }

    if (currentPhoto.fileModifiedAt) {
      metadataItems.push({ label: 'File Modified', value: formatDateTime(currentPhoto.fileModifiedAt) });
    }

    const metadataElements = metadataItems.map((item, index) => (
      <div key={index} className="metadata-item">
        <div className="metadata-label">{item.label}</div>
        <div className="metadata-value">{item.value}</div>
      </div>
    ));

    metadataPanel = (
      <div className="lightbox-metadata">
        <div className="metadata-header">
          <h3>Metadata</h3>
          <div className="metadata-close" onClick={handleToggleMetadata}><CloseIcon /></div>
        </div>
        <div className="metadata-content">
          {metadataElements}
        </div>
      </div>
    );
  }

  return (
    <ModalBackdrop onClose={onClose} isCentered={true}>
      <ModalContainer className={isZoomed === true ? 'lightbox zoomed' : 'lightbox'}>
        <div className="lightbox-image-container">
          {mediaElement}
          <div className="lightbox-controls">
            <div className="lightbox-info-button" onClick={handleToggleMetadata} title="Toggle metadata (i)">
              <InfoIcon />
            </div>
            <div className="lightbox-close-button" onClick={onClose}>
              <CloseIcon />
            </div>
          </div>
        </div>
        {metadataPanel}
      </ModalContainer>
    </ModalBackdrop>
  );
}

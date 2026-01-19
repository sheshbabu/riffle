import Lightbox from '../../commons/components/Lightbox.jsx';
import { StackIcon } from '../../commons/components/Icon.jsx';
import getThumbnailUrl from '../../commons/utils/getThumbnailUrl.js';
import isVideoFile from '../../commons/utils/isVideoFile.js';
import formatSessionDate from '../../commons/utils/formatSessionDate.js';
import formatDuration from '../../commons/utils/formatDuration.js';
import formatFileSize from '../../commons/utils/formatFileSize.js';
import './PhotoGallery.css';

const { useState, useEffect } = React;

export default function PhotoGallery({
  photos,
  groups,
  bursts,
  expandedBursts,
  onBurstToggle,
  selectedIndices,
  onSelectionChange,
  fadingPhotos,
  onCurate,
  onUndo,
  isCurateMode = false,
  onAddToAlbum
}) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const fadingSet = fadingPhotos || new Set();
  const selectedSet = selectedIndices || new Set();
  const isGroupView = groups && groups.length > 0;

  const selectedIndex = selectedSet.size > 0 ? Array.from(selectedSet)[0] : null;

  useEffect(() => {
    if (isCurateMode && selectedIndex !== null && selectedIndex >= photos.length && photos.length > 0) {
      onSelectionChange(new Set([Math.max(0, photos.length - 1)]));
    }
  }, [photos.length, selectedIndex, isCurateMode]);

  useEffect(() => {
    if (!isCurateMode) {
      return;
    }

    function handleKeyDown(e) {
      if (lightboxIndex !== null) {
        return;
      }

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (photos.length === 0) {
        return;
      }

      const currentPhoto = photos[selectedIndex];
      if (!currentPhoto || fadingSet.has(currentPhoto.filePath)) {
        return;
      }

      const lastIndex = photos.length - 1;
      const cols = getGridColumns();

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          onSelectionChange(new Set([Math.min(lastIndex, selectedIndex + 1)]));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onSelectionChange(new Set([Math.max(0, selectedIndex - 1)]));
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (isGroupView) {
            const newIndex = getNextRowIndex(selectedIndex, cols, groups, photos.length);
            onSelectionChange(new Set([newIndex]));
          } else {
            onSelectionChange(new Set([Math.min(lastIndex, selectedIndex + cols)]));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (isGroupView) {
            const newIndex = getPrevRowIndex(selectedIndex, cols, groups);
            onSelectionChange(new Set([newIndex]));
          } else {
            onSelectionChange(new Set([Math.max(0, selectedIndex - cols)]));
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          setLightboxIndex(selectedIndex);
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, photos, lightboxIndex, fadingSet, isCurateMode]);

  function getGridColumns() {
    const gridSelector = isGroupView ? '.group-grid' : '.photo-gallery';
    const gridElement = document.querySelector(gridSelector);
    if (!gridElement) {
      return 5;
    }
    const style = window.getComputedStyle(gridElement);
    const columns = style.gridTemplateColumns.split(' ').length;
    return columns;
  }

  function handlePhotoClick(index, e) {
    if (e.detail === 2) {
      setLightboxIndex(index);
      return;
    }

    if (!onSelectionChange) {
      return;
    }

    if (e.shiftKey && selectedIndex !== null) {
      onSelectionChange(createRangeSet(selectedIndex, index));
    } else if (e.metaKey || e.ctrlKey) {
      const newSelection = new Set(selectedSet);
      if (newSelection.has(index)) {
        newSelection.delete(index);
      } else {
        newSelection.add(index);
      }
      onSelectionChange(newSelection);
    } else {
      onSelectionChange(new Set([index]));
    }
  }

  function handleCloseLightbox() {
    setLightboxIndex(null);
  }

  function buildBurstMap() {
    const map = new Map();
    if (!bursts || bursts.length === 0) {
      return map;
    }
    for (const burst of bursts) {
      for (let i = 0; i < burst.count; i++) {
        const photoIndex = burst.startIndex + i;
        map.set(photoIndex, {
          burstId: burst.burstId,
          isFirst: i === 0,
          burstCount: burst.count,
          startIndex: burst.startIndex,
        });
      }
    }
    return map;
  }

  const burstMap = buildBurstMap();
  const expandedSet = expandedBursts || new Set();

  function handleBurstClick(burstId, index, e) {
    if (e.detail === 2) {
      setLightboxIndex(index);
      return;
    }
    if (onBurstToggle) {
      onBurstToggle(burstId);
    }
  }

  function renderBurstStack(photo, index, burstInfo) {
    const thumbnailUrl = getThumbnailUrl(photo.filePath);
    const isSelected = selectedSet.has(index);

    let className = 'gallery-item burst-stack';
    if (isSelected) {
      className += ' selected';
    }

    return (
      <div
        key={`burst-${burstInfo.burstId}`}
        className={className}
        onClick={(e) => handleBurstClick(burstInfo.burstId, index, e)}
      >
        <img
          src={thumbnailUrl}
          alt={photo.filePath}
          className="gallery-media"
          loading="lazy"
        />
        <div className="burst-badge">
          <StackIcon />
          <span>{burstInfo.burstCount}</span>
        </div>
      </div>
    );
  }

  function renderPhotoItem(photo, index, burstContext = null) {
    if (photo === undefined) {
      return null
    }

    const isVideo = photo.isVideo || isVideoFile(photo.filePath);
    const thumbnailUrl = getThumbnailUrl(photo.filePath);
    const isSelected = selectedSet.has(index);
    const isFading = fadingSet.has(photo.filePath);

    let className = 'gallery-item';
    if (isSelected) {
      className += ' selected';
    }
    if (isFading) {
      className += ' fading';
    }
    if (burstContext) {
      className += ' burst-photo';
      if (burstContext.isFirstInBurst) {
        className += ' burst-first';
      }
      if (burstContext.isLastInBurst) {
        className += ' burst-last';
      }
    }

    let undoButton = null;
    if (isFading && onUndo) {
      undoButton = (
        <div className="undo-overlay" onClick={(e) => {
          e.stopPropagation();
          onUndo(photo.filePath);
        }}>
          <button className="undo-button">Undo</button>
        </div>
      );
    }

    let videoIndicator = null;
    if (isVideo) {
      const duration = formatDuration(photo.duration, true) || '0:00';
      videoIndicator = (
        <div className="video-indicator">
          {duration}
        </div>
      );
    }

    let burstIndicator = null;
    if (burstContext) {
      burstIndicator = (
        <div className="burst-indicator">
          {burstContext.positionInBurst}/{burstContext.burstCount}
        </div>
      );
    }

    return (
      <div
        key={photo.filePath}
        className={className}
        onClick={(e) => handlePhotoClick(index, e)}
      >
        <img
          src={thumbnailUrl}
          alt={photo.filePath}
          className="gallery-media"
          loading="lazy"
        />
        {videoIndicator}
        {burstIndicator}
        {undoButton}
      </div>
    );
  }

  let galleryContent = null;

  function renderPhotosWithBursts(startIndex, endIndex) {
    const elements = [];
    let i = startIndex;

    while (i < endIndex) {
      const burstInfo = burstMap.get(i);

      if (burstInfo && burstInfo.isFirst) {
        const isExpanded = expandedSet.has(burstInfo.burstId);
        const burstEndIndex = Math.min(burstInfo.startIndex + burstInfo.burstCount, endIndex);
        const burstPhotosInRange = burstEndIndex - burstInfo.startIndex;

        if (isExpanded) {
          for (let j = 0; j < burstPhotosInRange; j++) {
            const photoIndex = burstInfo.startIndex + j;
            elements.push(renderPhotoItem(photos[photoIndex], photoIndex, {
              isBurstPhoto: true,
              burstId: burstInfo.burstId,
              isFirstInBurst: j === 0,
              isLastInBurst: j === burstPhotosInRange - 1,
              positionInBurst: j + 1,
              burstCount: burstInfo.burstCount,
            }));
          }
        } else {
          elements.push(renderBurstStack(photos[i], i, {
            ...burstInfo,
            burstCount: burstPhotosInRange,
          }));
        }
        i = burstEndIndex;
      } else if (!burstInfo) {
        elements.push(renderPhotoItem(photos[i], i));
        i++;
      } else {
        i++;
      }
    }

    return elements;
  }

  if (isGroupView) {
    let photoOffset = 0;
    const groupElements = groups.map((group) => {
      const groupStartIndex = photoOffset;
      const groupEndIndex = photoOffset + group.photoCount;
      photoOffset = groupEndIndex;

      const photoElements = renderPhotosWithBursts(groupStartIndex, groupEndIndex);

      let locationElement = null;
      if (group.location) {
        locationElement = <span className="group-location">{group.location}</span>;
      }

      let sizeElement = null;
      if (group.totalSize) {
        sizeElement = <span className="group-size">{formatFileSize(group.totalSize)}</span>;
      }

      let selectAllButton = null;
      if (onSelectionChange) {
        const groupPhotoIndices = [];
        for (let i = groupStartIndex; i < groupEndIndex; i++) {
          groupPhotoIndices.push(i);
        }

        const allSelected = groupPhotoIndices.every(index => selectedSet.has(index));

        function handleSelectAllClick() {
          if (allSelected) {
            const newSelection = new Set(selectedSet);
            groupPhotoIndices.forEach(index => newSelection.delete(index));
            onSelectionChange(newSelection);
          } else {
            const newSelection = new Set(selectedSet);
            groupPhotoIndices.forEach(index => newSelection.add(index));
            onSelectionChange(newSelection);
          }
        }

        const buttonText = allSelected ? 'Deselect All' : 'Select All';
        selectAllButton = (
          <button className="group-select-all-button" onClick={handleSelectAllClick}>
            {buttonText}
          </button>
        );
      }

      return (
        <div key={group.groupId} className="group-container">
          <div className="group-header">
            <div className="group-header-info">
              <span className="group-date">{formatSessionDate(group.startTime, group.endTime)}</span>
              {locationElement}
              <span className="group-count">{group.photoCount} {group.photoCount === 1 ? 'photo' : 'photos'}</span>
              {sizeElement}
            </div>
            {selectAllButton}
          </div>
          <div className="group-grid">
            {photoElements}
          </div>
        </div>
      );
    });

    galleryContent = (
      <div className="group-gallery">
        {groupElements}
      </div>
    );
  } else {
    const photoElements = renderPhotosWithBursts(0, photos.length);

    galleryContent = (
      <div className="photo-gallery">
        {photoElements}
      </div>
    );
  }

  let lightboxElement = null;
  if (lightboxIndex !== null) {
    lightboxElement = (
      <Lightbox
        photos={photos}
        selectedIndex={lightboxIndex}
        onClose={handleCloseLightbox}
        onCurate={isCurateMode ? onCurate : undefined}
        isCurateMode={isCurateMode}
      />
    );
  }

  return (
    <>
      {galleryContent}
      {lightboxElement}
    </>
  );
}

function createRangeSet(start, end) {
  const set = new Set();
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  for (let i = from; i <= to; i++) {
    set.add(i);
  }
  return set;
}

function getGroupInfo(index, groups) {
  let photoOffset = 0;
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const groupStart = photoOffset;
    const groupEnd = photoOffset + group.photoCount;
    if (index >= groupStart && index < groupEnd) {
      return {
        groupIndex: i,
        groupStart,
        groupEnd,
        indexInGroup: index - groupStart,
        photoCount: group.photoCount,
      };
    }
    photoOffset = groupEnd;
  }
  return null;
}

function getNextRowIndex(currentIndex, cols, groups, totalPhotos) {
  const info = getGroupInfo(currentIndex, groups);
  if (!info) {
    return Math.min(totalPhotos - 1, currentIndex + cols);
  }

  const currentRow = Math.floor(info.indexInGroup / cols);
  const currentCol = info.indexInGroup % cols;
  const totalRowsInGroup = Math.ceil(info.photoCount / cols);
  const nextRow = currentRow + 1;

  if (nextRow < totalRowsInGroup) {
    const nextIndexInGroup = nextRow * cols + currentCol;
    if (nextIndexInGroup < info.photoCount) {
      return info.groupStart + nextIndexInGroup;
    }
    return info.groupEnd - 1;
  }

  if (info.groupIndex + 1 < groups.length) {
    let nextGroupStart = info.groupEnd;
    const nextGroup = groups[info.groupIndex + 1];
    const targetIndexInNextGroup = Math.min(currentCol, nextGroup.photoCount - 1);
    return nextGroupStart + targetIndexInNextGroup;
  }

  return currentIndex;
}

function getPrevRowIndex(currentIndex, cols, groups) {
  const info = getGroupInfo(currentIndex, groups);
  if (!info) {
    return Math.max(0, currentIndex - cols);
  }

  const currentRow = Math.floor(info.indexInGroup / cols);
  const currentCol = info.indexInGroup % cols;
  const prevRow = currentRow - 1;

  if (prevRow >= 0) {
    const prevIndexInGroup = prevRow * cols + currentCol;
    return info.groupStart + prevIndexInGroup;
  }

  if (info.groupIndex > 0) {
    let prevGroupStart = 0;
    for (let i = 0; i < info.groupIndex - 1; i++) {
      prevGroupStart += groups[i].photoCount;
    }
    const prevGroup = groups[info.groupIndex - 1];
    const totalRowsInPrevGroup = Math.ceil(prevGroup.photoCount / cols);
    const lastRowStart = (totalRowsInPrevGroup - 1) * cols;
    const targetCol = Math.min(currentCol, prevGroup.photoCount - 1 - lastRowStart);
    const targetIndexInPrevGroup = lastRowStart + targetCol;
    return prevGroupStart + Math.min(targetIndexInPrevGroup, prevGroup.photoCount - 1);
  }

  return currentIndex;
}

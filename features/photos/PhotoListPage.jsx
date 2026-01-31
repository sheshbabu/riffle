import ApiClient from '../../commons/http/ApiClient.js';
import PhotoGallery from './PhotoGallery.jsx';
import FilterPanel from './FilterPanel.jsx';
import Pagination from '../../commons/components/Pagination.jsx';
import AddToAlbumModal from '../albums/AddToAlbumModal.jsx';
import IconButton from '../../commons/components/IconButton.jsx';
import EmptyState from '../../commons/components/EmptyState.jsx';
import MessageBox from '../../commons/components/MessageBox.jsx';
import SelectionCount from '../../commons/components/SelectionCount.jsx';
import { LoadingSpinner, PickIcon, RejectIcon, UnflagIcon, FilterIcon, TrashEmptyIcon, SparklesIcon, ImageIcon, FolderIcon, StarIcon } from '../../commons/components/Icon.jsx';
import { showToast } from '../../commons/components/Toast.jsx';
import useSearchParams from '../../commons/hooks/useSearchParams.js';
import { updateSearchParams } from '../../commons/components/Link.jsx';
import './LibraryPage.css';
import './Loading.css';

const { useState, useEffect } = React;

const PAGE_CONFIG = {
  library: {
    fetchPhotos: (offset, filters) => ApiClient.getPhotos(offset, filters),
    emptyState: {
      icon: ImageIcon,
      title: 'No photos yet',
      description: 'Picked photos will appear here.',
    },
    initialSelectedIndex: null,
  },
  curate: {
    fetchPhotos: (offset, filters) => ApiClient.getUncuratedPhotos(offset, filters),
    emptyState: {
      icon: SparklesIcon,
      title: 'Nothing to review',
      description: 'New imports will appear here for curation.',
    },
    initialSelectedIndex: 0,
  },
  trash: {
    fetchPhotos: (offset, filters) => ApiClient.getTrashedPhotos(offset, filters),
    emptyState: {
      icon: TrashEmptyIcon,
      title: 'Nothing here',
      description: 'Rejected photos will appear here.',
    },
    initialSelectedIndex: null,
  },
};

function parseFiltersFromUrl(searchParams) {
  const filters = {};

  const ratings = searchParams.getAll('ratings');
  if (ratings.length > 0) {
    filters.ratings = ratings.map(r => parseInt(r, 10)).filter(r => !isNaN(r));
  }

  const mediaType = searchParams.get('mediaType');
  if (mediaType && mediaType !== 'all') {
    filters.mediaType = mediaType;
  }

  const orientation = searchParams.get('orientation');
  if (orientation && orientation !== 'all') {
    filters.orientation = orientation;
  }

  const years = searchParams.getAll('years');
  if (years.length > 0) {
    filters.years = years.map(y => parseInt(y, 10)).filter(y => !isNaN(y));
  }

  const cameraMakes = searchParams.getAll('cameraMakes');
  if (cameraMakes.length > 0) {
    filters.cameraMakes = cameraMakes;
  }

  const cameraModels = searchParams.getAll('cameraModels');
  if (cameraModels.length > 0) {
    filters.cameraModels = cameraModels;
  }

  const countries = searchParams.getAll('countries');
  if (countries.length > 0) {
    filters.countries = countries;
  }

  const states = searchParams.getAll('states');
  if (states.length > 0) {
    filters.states = states;
  }

  const cities = searchParams.getAll('cities');
  if (cities.length > 0) {
    filters.cities = cities;
  }

  const fileFormats = searchParams.getAll('fileFormats');
  if (fileFormats.length > 0) {
    filters.fileFormats = fileFormats;
  }

  return filters;
}

function filtersToUrlParams(filters) {
  const params = {};

  if (filters.ratings && filters.ratings.length > 0) {
    params.ratings = filters.ratings;
  }
  if (filters.mediaType && filters.mediaType !== 'all') {
    params.mediaType = filters.mediaType;
  }
  if (filters.orientation && filters.orientation !== 'all') {
    params.orientation = filters.orientation;
  }
  if (filters.years && filters.years.length > 0) {
    params.years = filters.years;
  }
  if (filters.cameraMakes && filters.cameraMakes.length > 0) {
    params.cameraMakes = filters.cameraMakes;
  }
  if (filters.cameraModels && filters.cameraModels.length > 0) {
    params.cameraModels = filters.cameraModels;
  }
  if (filters.countries && filters.countries.length > 0) {
    params.countries = filters.countries;
  }
  if (filters.states && filters.states.length > 0) {
    params.states = filters.states;
  }
  if (filters.cities && filters.cities.length > 0) {
    params.cities = filters.cities;
  }
  if (filters.fileFormats && filters.fileFormats.length > 0) {
    params.fileFormats = filters.fileFormats;
  }

  return params;
}

export default function PhotoListPage({ mode = 'library' }) {
  const config = PAGE_CONFIG[mode];
  const isCurateMode = mode === 'curate';
  const searchParams = useSearchParams();

  const offsetParam = searchParams.get('offset');
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  const filters = parseFiltersFromUrl(searchParams);

  const [photos, setPhotos] = useState([]);
  const [groups, setGroups] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [expandedBursts, setExpandedBursts] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageStartRecord, setPageStartRecord] = useState(0);
  const [pageEndRecord, setPageEndRecord] = useState(0);
  const initialSelection = config.initialSelectedIndex !== null ? new Set([config.initialSelectedIndex]) : new Set();
  const [selectedIndices, setSelectedIndices] = useState(initialSelection);
  const [fadingPhotos, setFadingPhotos] = useState(new Set());
  const [isCurating, setIsCurating] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    async function fetchPhotos() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await config.fetchPhotos(offset, filters);
        const newPhotos = data.photos || [];
        setPhotos(newPhotos);
        setGroups(data.groups || []);
        setBursts(data.bursts || []);
        setExpandedBursts(new Set());
        setTotalRecords(data.totalRecords || 0);
        setPageStartRecord(data.pageStartRecord || 0);
        setPageEndRecord(data.pageEndRecord || 0);

        if (newPhotos.length === 0) {
          setSelectedIndices(new Set());
        } else if (config.initialSelectedIndex !== null) {
          setSelectedIndices(new Set([config.initialSelectedIndex]));
        } else {
          setSelectedIndices(new Set());
        }
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
  }, [offset, filtersKey]);

  const hasPrev = offset > 0;
  const hasNext = pageEndRecord < totalRecords;

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

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
  }, [hasNext, hasPrev]);

  useEffect(() => {
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


  function handleBurstToggle(burstId) {
    setExpandedBursts(prev => {
      const next = new Set(prev);
      if (next.has(burstId)) {
        next.delete(burstId);
      } else {
        next.add(burstId);
      }
      return next;
    });
  }

  function handleFiltersChange(newFilters) {
    const filterParams = filtersToUrlParams(newFilters);
    const clearParams = {
      ratings: null,
      mediaType: null,
      orientation: null,
      years: null,
      cameraMakes: null,
      cameraModels: null,
      countries: null,
      states: null,
      cities: null,
      fileFormats: null,
      offset: null,
    };
    updateSearchParams({ ...clearParams, ...filterParams });
  }

  function handleSelectionChange(indices) {
    setSelectedIndices(indices);
  }

  async function handleCurate(filePath, isCurated, isTrashed, rating) {
    setIsCurating(true);
    try {
      await ApiClient.curatePhoto(filePath, isCurated, isTrashed, rating);

      if (isCurated && !isTrashed && rating === 0) {
        setFadingPhotos(prev => new Set([...prev, filePath]));
      } else if (isTrashed) {
        setFadingPhotos(prev => new Set([...prev, filePath]));
      }

      setPhotos(prevPhotos => prevPhotos.map(p => {
        if (p.filePath === filePath) {
          return { ...p, isCurated, isTrashed, rating };
        }
        return p;
      }));
    } catch (err) {
      showToast('Failed to update photo', 3000);
    } finally {
      setIsCurating(false);
    }
  }

  async function handleUndo(filePath) {
    const photo = photos.find(p => p.filePath === filePath);
    if (!photo) {
      return;
    }

    try {
      await ApiClient.curatePhoto(filePath, false, false, 0);

      setPhotos(prevPhotos => prevPhotos.map(p => {
        if (p.filePath === filePath) {
          return { ...p, isCurated: false, isTrashed: false, rating: 0 };
        }
        return p;
      }));

      setFadingPhotos(prev => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
    } catch (err) {
      showToast('Failed to undo', 3000);
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
    filePaths.forEach(filePath => {
      const photo = photos.find(p => p.filePath === filePath);
      const currentRating = photo ? (photo.rating || 0) : 0;
      handleCurate(filePath, true, false, currentRating);
    });
  }

  function handleRejectClick() {
    const filePaths = getSelectedFilePaths();
    if (filePaths.length === 0) {
      return;
    }
    filePaths.forEach(filePath => handleCurate(filePath, true, true, 0));
  }

  function handleUnflagClick() {
    const filePaths = getSelectedFilePaths();
    if (filePaths.length === 0) {
      return;
    }
    filePaths.forEach(filePath => handleCurate(filePath, false, false, 0));
  }

  function handleRateClick(rating) {
    const filePaths = getSelectedFilePaths();
    if (filePaths.length === 0) {
      return;
    }
    filePaths.forEach(filePath => handleCurate(filePath, true, false, rating));
  }

  function handlePrevPage() {
    if (hasPrev) {
      const newOffset = Math.max(0, offset - 100);
      updateSearchParams({ offset: newOffset });
    }
  }

  function handleNextPage() {
    if (hasNext) {
      updateSearchParams({ offset: offset + 100 });
    }
  }

  function getActiveFilterCount() {
    let count = 0;
    if (filters.ratings && filters.ratings.length > 0) count += filters.ratings.length;
    if (filters.mediaType && filters.mediaType !== 'all') count++;
    if (filters.orientation && filters.orientation !== 'all') count++;
    if (filters.years && filters.years.length > 0) count += filters.years.length;
    if (filters.cameraMakes && filters.cameraMakes.length > 0) count += filters.cameraMakes.length;
    if (filters.cameraModels && filters.cameraModels.length > 0) count += filters.cameraModels.length;
    if (filters.countries && filters.countries.length > 0) count += filters.countries.length;
    if (filters.states && filters.states.length > 0) count += filters.states.length;
    if (filters.cities && filters.cities.length > 0) count += filters.cities.length;
    if (filters.fileFormats && filters.fileFormats.length > 0) count += filters.fileFormats.length;
    return count;
  }

  const activeFilterCount = getActiveFilterCount();

  let content = null;

  if (error) {
    content = (
      <MessageBox variant="error">
        Error: {error}
      </MessageBox>
    );
  } else if (photos.length === 0 && !isLoading) {
    const hasActiveFilters = activeFilterCount > 0;
    if (hasActiveFilters) {
      content = (
        <EmptyState
          icon={<FilterIcon />}
          title="No matches"
          description="Try adjusting your filters."
        />
      );
    } else {
      const EmptyIcon = config.emptyState.icon;
      content = (
        <EmptyState
          icon={<EmptyIcon />}
          title={config.emptyState.title}
          description={config.emptyState.description}
        />
      );
    }
  } else if (photos.length > 0) {
    function handleAddToAlbumFromGroup(photoIndices) {
      setSelectedIndices(new Set(photoIndices));
      setIsAlbumModalOpen(true);
    }

    content = (
      <PhotoGallery
        photos={photos}
        groups={groups}
        bursts={bursts}
        expandedBursts={expandedBursts}
        onBurstToggle={handleBurstToggle}
        selectedIndices={selectedIndices}
        onSelectionChange={handleSelectionChange}
        fadingPhotos={fadingPhotos}
        onCurate={handleCurate}
        onUndo={handleUndo}
        isCurateMode={isCurateMode}
        onAddToAlbum={handleAddToAlbumFromGroup}
      />
    );
  }

  let paginationElement = null;
  if (!error && (hasPrev || hasNext)) {
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

  let filterButton = null;
  if (!error) {
    let filterBadge = null;
    if (activeFilterCount > 0) {
      filterBadge = <span className="filter-badge">{activeFilterCount}</span>;
    }
    filterButton = (
      <IconButton
        className={`filter-button ${activeFilterCount > 0 ? 'has-filters' : ''}`}
        onClick={() => setIsFilterPanelOpen(true)}
        title="Filters"
      >
        <FilterIcon />
        {filterBadge}
      </IconButton>
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

  const hasSelection = selectedIndices.size > 0 && photos.length > 0;
  const firstSelectedIndex = hasSelection ? Array.from(selectedIndices)[0] : null;
  const selectedPhoto = firstSelectedIndex !== null ? photos[firstSelectedIndex] : null;

  let actionButtons = null;
  if (hasSelection) {
    const isPicked = selectedIndices.size === 1 && selectedPhoto ? (selectedPhoto.isCurated && !selectedPhoto.isTrashed) : false;
    const isRejected = selectedIndices.size === 1 && selectedPhoto ? selectedPhoto.isTrashed : false;
    const currentRating = selectedIndices.size === 1 && selectedPhoto ? (selectedPhoto.rating || 0) : 0;

    const starElements = [1, 2, 3, 4, 5].map(rating => {
      const isFilled = rating <= currentRating;
      return (
        <IconButton key={rating} variant="rate" active={isFilled} onClick={() => handleRateClick(rating)} title={`Rate ${rating}`} disabled={isCurating}>
          <StarIcon size={18} isFilled={isFilled} />
        </IconButton>
      );
    });


    let addToAlbumButton = null;
    if (!isCurateMode) {
      addToAlbumButton = (
        <IconButton onClick={() => setIsAlbumModalOpen(true)} title="Add to Album">
          <FolderIcon />
          <span>Add to Album</span>
        </IconButton>
      );
    }

    actionButtons = (
      <div className="library-actions">
        <IconButton variant="pick" active={isPicked && currentRating === 0} onClick={handlePickClick} title="Pick (P)" disabled={isCurating}>
          <PickIcon />
          <span>Pick</span>
        </IconButton>
        <IconButton variant="reject" active={isRejected} onClick={handleRejectClick} title="Reject (X)" disabled={isCurating}>
          <RejectIcon />
          <span>Reject</span>
        </IconButton>
        <IconButton onClick={handleUnflagClick} title="Unflag (U)" disabled={isCurating}>
          <UnflagIcon />
          <span>Unflag</span>
        </IconButton>
        <div className="rating-buttons">
          {starElements}
        </div>
        {addToAlbumButton}
      </div>
    );
  }

  let selectionCountElement = null;
  if (!isLoading && !error && photos.length > 0) {
    selectionCountElement = <SelectionCount count={selectedIndices.size} />;
  }

  let albumModal = null;
  if (isAlbumModalOpen && hasSelection) {
    const selectedPhotoPaths = Array.from(selectedIndices).map(index => photos[index].filePath);
    albumModal = (<AddToAlbumModal selectedPhotos={selectedPhotoPaths} onClose={() => setIsAlbumModalOpen(false)} />);
  }

  return (
    <div className="page-container">
      <div className="page-toolbar">
        {selectionCountElement}
        {actionButtons}
        <div className="right-actions">
          {filterButton}
          {paginationElement}
        </div>
      </div>
      {content}
      {loadingOverlay}
      <FilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />
      {albumModal}
    </div>
  );
}

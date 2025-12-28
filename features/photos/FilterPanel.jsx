import ApiClient from '../../commons/http/ApiClient.js';
import { CloseIcon, ChevronDownIcon, ChevronUpIcon } from '../../commons/components/Icon.jsx';
import './FilterPanel.css';

const { useState, useEffect } = React;

const RATINGS = [
  { value: 0, label: 'Unrated' },
  { value: 1, label: '1 Star' },
  { value: 2, label: '2 Stars' },
  { value: 3, label: '3 Stars' },
  { value: 4, label: '4 Stars' },
  { value: 5, label: '5 Stars' },
];

const MEDIA_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'photos', label: 'Photos only' },
  { value: 'videos', label: 'Videos only' },
];

const ORIENTATIONS = [
  { value: 'all', label: 'All' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'square', label: 'Square' },
];

export default function FilterPanel({ isOpen, onClose, filters, onFiltersChange }) {
  const [filterOptions, setFilterOptions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    rating: true,
    mediaType: true,
    orientation: false,
    year: false,
    camera: false,
    location: false,
    format: false,
  });

  useEffect(() => {
    if (isOpen && !filterOptions) {
      fetchFilterOptions();
    }
  }, [isOpen]);

  async function fetchFilterOptions() {
    setIsLoading(true);
    try {
      const options = await ApiClient.getFilterOptions();
      setFilterOptions(options);
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSection(section) {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  function handleFilterChange(key, value) {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  }

  function handleMultiSelectToggle(key, value) {
    const currentValues = filters[key] || [];
    let newValues;
    if (currentValues.includes(value)) {
      newValues = currentValues.filter(v => v !== value);
    } else {
      newValues = [...currentValues, value];
    }
    handleFilterChange(key, newValues);
  }

  function handleClearAll() {
    onFiltersChange({});
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

  if (!isOpen) {
    return null;
  }

  const activeCount = getActiveFilterCount();

  let content = null;
  if (isLoading) {
    content = <div className="filter-loading">Loading filters...</div>;
  } else {
    content = (
      <div className="filter-sections">
        {renderSection('rating', 'Rating', renderRatingOptions())}
        {renderSection('mediaType', 'Media Type', renderMediaTypeOptions())}
        {renderSection('orientation', 'Orientation', renderOrientationOptions())}
        {filterOptions && filterOptions.years.length > 0 && renderSection('year', 'Year', renderYearOptions())}
        {filterOptions && (filterOptions.cameraMakes.length > 0 || filterOptions.cameraModels.length > 0) && renderSection('camera', 'Camera', renderCameraOptions())}
        {filterOptions && (filterOptions.countries.length > 0 || filterOptions.states.length > 0 || filterOptions.cities.length > 0) && renderSection('location', 'Location', renderLocationOptions())}
        {filterOptions && filterOptions.fileFormats.length > 0 && renderSection('format', 'File Format', renderFormatOptions())}
      </div>
    );
  }

  function renderSection(key, label, children) {
    const isExpanded = expandedSections[key];
    const chevronIcon = isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />;

    return (
      <div key={key} className="filter-section">
        <div className="filter-section-header" onClick={() => toggleSection(key)}>
          <span className="filter-section-label">{label}</span>
          {chevronIcon}
        </div>
        {isExpanded && <div className="filter-section-content">{children}</div>}
      </div>
    );
  }

  function renderRatingOptions() {
    const selectedRatings = filters.ratings || [];
    return (
      <div className="filter-options">
        {RATINGS.map(rating => (
          <label key={rating.value} className="filter-option">
            <input
              type="checkbox"
              checked={selectedRatings.includes(rating.value)}
              onChange={() => handleMultiSelectToggle('ratings', rating.value)}
            />
            <span>{rating.label}</span>
          </label>
        ))}
      </div>
    );
  }

  function renderMediaTypeOptions() {
    const selectedType = filters.mediaType || 'all';
    return (
      <div className="filter-options">
        {MEDIA_TYPES.map(type => (
          <label key={type.value} className="filter-option">
            <input
              type="radio"
              name="mediaType"
              checked={selectedType === type.value}
              onChange={() => handleFilterChange('mediaType', type.value)}
            />
            <span>{type.label}</span>
          </label>
        ))}
      </div>
    );
  }

  function renderOrientationOptions() {
    const selectedOrientation = filters.orientation || 'all';
    return (
      <div className="filter-options">
        {ORIENTATIONS.map(orientation => (
          <label key={orientation.value} className="filter-option">
            <input
              type="radio"
              name="orientation"
              checked={selectedOrientation === orientation.value}
              onChange={() => handleFilterChange('orientation', orientation.value)}
            />
            <span>{orientation.label}</span>
          </label>
        ))}
      </div>
    );
  }

  function renderYearOptions() {
    const selectedYears = filters.years || [];
    return (
      <div className="filter-options">
        {filterOptions.years.map(year => (
          <label key={year} className="filter-option">
            <input
              type="checkbox"
              checked={selectedYears.includes(year)}
              onChange={() => handleMultiSelectToggle('years', year)}
            />
            <span>{year}</span>
          </label>
        ))}
      </div>
    );
  }

  function renderCameraOptions() {
    const selectedMakes = filters.cameraMakes || [];
    const selectedModels = filters.cameraModels || [];

    let makeOptions = null;
    if (filterOptions.cameraMakes.length > 0) {
      makeOptions = (
        <div className="filter-subsection">
          <div className="filter-subsection-label">Make</div>
          <div className="filter-options">
            {filterOptions.cameraMakes.map(make => (
              <label key={make} className="filter-option">
                <input
                  type="checkbox"
                  checked={selectedMakes.includes(make)}
                  onChange={() => handleMultiSelectToggle('cameraMakes', make)}
                />
                <span>{make}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    let modelOptions = null;
    if (filterOptions.cameraModels.length > 0) {
      modelOptions = (
        <div className="filter-subsection">
          <div className="filter-subsection-label">Model</div>
          <div className="filter-options">
            {filterOptions.cameraModels.map(model => (
              <label key={model} className="filter-option">
                <input
                  type="checkbox"
                  checked={selectedModels.includes(model)}
                  onChange={() => handleMultiSelectToggle('cameraModels', model)}
                />
                <span>{model}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    return (
      <>
        {makeOptions}
        {modelOptions}
      </>
    );
  }

  function renderLocationOptions() {
    const selectedCountries = filters.countries || [];
    const selectedStates = filters.states || [];
    const selectedCities = filters.cities || [];

    let countryOptions = null;
    if (filterOptions.countries.length > 0) {
      countryOptions = (
        <div className="filter-subsection">
          <div className="filter-subsection-label">Country</div>
          <div className="filter-options">
            {filterOptions.countries.map(country => (
              <label key={country} className="filter-option">
                <input
                  type="checkbox"
                  checked={selectedCountries.includes(country)}
                  onChange={() => handleMultiSelectToggle('countries', country)}
                />
                <span>{country}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    let stateOptions = null;
    if (filterOptions.states.length > 0) {
      stateOptions = (
        <div className="filter-subsection">
          <div className="filter-subsection-label">State</div>
          <div className="filter-options">
            {filterOptions.states.map(state => (
              <label key={state} className="filter-option">
                <input
                  type="checkbox"
                  checked={selectedStates.includes(state)}
                  onChange={() => handleMultiSelectToggle('states', state)}
                />
                <span>{state}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    let cityOptions = null;
    if (filterOptions.cities.length > 0) {
      cityOptions = (
        <div className="filter-subsection">
          <div className="filter-subsection-label">City</div>
          <div className="filter-options filter-options-scrollable">
            {filterOptions.cities.map(city => (
              <label key={city} className="filter-option">
                <input
                  type="checkbox"
                  checked={selectedCities.includes(city)}
                  onChange={() => handleMultiSelectToggle('cities', city)}
                />
                <span>{city}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    return (
      <>
        {countryOptions}
        {stateOptions}
        {cityOptions}
      </>
    );
  }

  function renderFormatOptions() {
    const selectedFormats = filters.fileFormats || [];
    return (
      <div className="filter-options">
        {filterOptions.fileFormats.map(format => (
          <label key={format} className="filter-option">
            <input
              type="checkbox"
              checked={selectedFormats.includes(format)}
              onChange={() => handleMultiSelectToggle('fileFormats', format)}
            />
            <span>{format.toUpperCase()}</span>
          </label>
        ))}
      </div>
    );
  }

  let clearButton = null;
  if (activeCount > 0) {
    clearButton = (
      <button className="filter-clear-button" onClick={handleClearAll}>
        Clear all
      </button>
    );
  }

  return (
    <div className="filter-panel-overlay" onClick={onClose}>
      <div className="filter-panel" onClick={e => e.stopPropagation()}>
        <div className="filter-panel-header">
          <h3>Filters {activeCount > 0 && <span className="filter-count">({activeCount})</span>}</h3>
          <div className="filter-panel-actions">
            {clearButton}
            <div className="filter-close-button" onClick={onClose}>
              <CloseIcon />
            </div>
          </div>
        </div>
        <div className="filter-panel-content">
          {content}
        </div>
      </div>
    </div>
  );
}

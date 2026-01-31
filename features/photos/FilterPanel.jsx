import ApiClient from '../../commons/http/ApiClient.js';
import Button from '../../commons/components/Button.jsx';
import Checkbox from '../../commons/components/Checkbox.jsx';
import { Accordion, AccordionItem } from '../../commons/components/Accordion.jsx';
import { CloseIcon, LoadingSpinner } from '../../commons/components/Icon.jsx';
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
    content = (
      <div className="filter-loading">
        <LoadingSpinner size={20} />
        <span>Loading filters...</span>
      </div>
    );
  } else {
    let yearSection = null;
    if (filterOptions && filterOptions.years.length > 0) {
      yearSection = (
        <AccordionItem value="year" title="Year">
          {renderYearOptions()}
        </AccordionItem>
      );
    }

    let cameraSection = null;
    if (filterOptions && (filterOptions.cameraMakes.length > 0 || filterOptions.cameraModels.length > 0)) {
      cameraSection = (
        <AccordionItem value="camera" title="Camera">
          {renderCameraOptions()}
        </AccordionItem>
      );
    }

    let locationSection = null;
    if (filterOptions && (filterOptions.countries.length > 0 || filterOptions.states.length > 0 || filterOptions.cities.length > 0)) {
      locationSection = (
        <AccordionItem value="location" title="Location">
          {renderLocationOptions()}
        </AccordionItem>
      );
    }

    let formatSection = null;
    if (filterOptions && filterOptions.fileFormats.length > 0) {
      formatSection = (
        <AccordionItem value="format" title="File Format">
          {renderFormatOptions()}
        </AccordionItem>
      );
    }

    content = (
      <Accordion defaultOpen={['rating', 'mediaType']}>
        <AccordionItem value="rating" title="Rating">
          {renderRatingOptions()}
        </AccordionItem>
        <AccordionItem value="mediaType" title="Media Type">
          {renderMediaTypeOptions()}
        </AccordionItem>
        <AccordionItem value="orientation" title="Orientation">
          {renderOrientationOptions()}
        </AccordionItem>
        {yearSection}
        {cameraSection}
        {locationSection}
        {formatSection}
      </Accordion>
    );
  }

  function renderRatingOptions() {
    const selectedRatings = filters.ratings || [];
    return (
      <div className="filter-options">
        {RATINGS.map(rating => (
          <Checkbox
            key={rating.value}
            checked={selectedRatings.includes(rating.value)}
            onChange={() => handleMultiSelectToggle('ratings', rating.value)}
          >
            {rating.label}
          </Checkbox>
        ))}
      </div>
    );
  }

  function renderMediaTypeOptions() {
    const selectedType = filters.mediaType || 'all';
    return (
      <div className="filter-options">
        {MEDIA_TYPES.map(type => (
          <Checkbox
            key={type.value}
            checked={selectedType === type.value}
            onChange={() => handleFilterChange('mediaType', type.value)}
          >
            {type.label}
          </Checkbox>
        ))}
      </div>
    );
  }

  function renderOrientationOptions() {
    const selectedOrientation = filters.orientation || 'all';
    return (
      <div className="filter-options">
        {ORIENTATIONS.map(orientation => (
          <Checkbox
            key={orientation.value}
            checked={selectedOrientation === orientation.value}
            onChange={() => handleFilterChange('orientation', orientation.value)}
          >
            {orientation.label}
          </Checkbox>
        ))}
      </div>
    );
  }

  function renderYearOptions() {
    const selectedYears = filters.years || [];
    return (
      <div className="filter-options">
        {filterOptions.years.map(year => (
          <Checkbox
            key={year}
            checked={selectedYears.includes(year)}
            onChange={() => handleMultiSelectToggle('years', year)}
          >
            {year}
          </Checkbox>
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
              <Checkbox
                key={make}
                checked={selectedMakes.includes(make)}
                onChange={() => handleMultiSelectToggle('cameraMakes', make)}
              >
                {make}
              </Checkbox>
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
              <Checkbox
                key={model}
                checked={selectedModels.includes(model)}
                onChange={() => handleMultiSelectToggle('cameraModels', model)}
              >
                {model}
              </Checkbox>
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
              <Checkbox
                key={country}
                checked={selectedCountries.includes(country)}
                onChange={() => handleMultiSelectToggle('countries', country)}
              >
                {country}
              </Checkbox>
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
              <Checkbox
                key={state}
                checked={selectedStates.includes(state)}
                onChange={() => handleMultiSelectToggle('states', state)}
              >
                {state}
              </Checkbox>
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
              <Checkbox
                key={city}
                checked={selectedCities.includes(city)}
                onChange={() => handleMultiSelectToggle('cities', city)}
              >
                {city}
              </Checkbox>
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
          <Checkbox
            key={format}
            checked={selectedFormats.includes(format)}
            onChange={() => handleMultiSelectToggle('fileFormats', format)}
          >
            {format.toUpperCase()}
          </Checkbox>
        ))}
      </div>
    );
  }

  let clearButton = null;
  if (activeCount > 0) {
    clearButton = (
      <Button variant="ghost" onClick={handleClearAll}>
        Clear all
      </Button>
    );
  }

  return (
    <div className="filter-panel-overlay" onClick={onClose}>
      <div className="filter-panel" onClick={e => e.stopPropagation()}>
        <div className="filter-panel-header">
          <h3>
            Filters {activeCount > 0 ? <span className="filter-count">({activeCount})</span> : null}
          </h3>
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

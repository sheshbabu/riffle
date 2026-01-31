import ApiClient from '../../commons/http/ApiClient.js';
import Button from '../../commons/components/Button.jsx';
import CheckboxGroup from '../../commons/components/CheckboxGroup.jsx';
import RadioGroup from '../../commons/components/RadioGroup.jsx';
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
    return (
      <CheckboxGroup
        options={RATINGS}
        selected={filters.ratings || []}
        onChange={(values) => handleFilterChange('ratings', values)}
      />
    );
  }

  function renderMediaTypeOptions() {
    return (
      <RadioGroup
        options={MEDIA_TYPES}
        selected={filters.mediaType || 'all'}
        onChange={(value) => handleFilterChange('mediaType', value)}
      />
    );
  }

  function renderOrientationOptions() {
    return (
      <RadioGroup
        options={ORIENTATIONS}
        selected={filters.orientation || 'all'}
        onChange={(value) => handleFilterChange('orientation', value)}
      />
    );
  }

  function renderYearOptions() {
    return (
      <CheckboxGroup
        options={filterOptions.years}
        selected={filters.years || []}
        onChange={(values) => handleFilterChange('years', values)}
      />
    );
  }

  function renderCameraOptions() {
    let makeOptions = null;
    if (filterOptions.cameraMakes.length > 0) {
      makeOptions = (
        <div className="filter-subsection">
          <div className="filter-subsection-label">Make</div>
          <CheckboxGroup
            options={filterOptions.cameraMakes}
            selected={filters.cameraMakes || []}
            onChange={(values) => handleFilterChange('cameraMakes', values)}
          />
        </div>
      );
    }

    let modelOptions = null;
    if (filterOptions.cameraModels.length > 0) {
      modelOptions = (
        <div className="filter-subsection">
          <div className="filter-subsection-label">Model</div>
          <CheckboxGroup
            options={filterOptions.cameraModels}
            selected={filters.cameraModels || []}
            onChange={(values) => handleFilterChange('cameraModels', values)}
          />
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
    let countryOptions = null;
    if (filterOptions.countries.length > 0) {
      countryOptions = (
        <div className="filter-subsection">
          <div className="filter-subsection-label">Country</div>
          <CheckboxGroup
            options={filterOptions.countries}
            selected={filters.countries || []}
            onChange={(values) => handleFilterChange('countries', values)}
          />
        </div>
      );
    }

    let stateOptions = null;
    if (filterOptions.states.length > 0) {
      stateOptions = (
        <div className="filter-subsection">
          <div className="filter-subsection-label">State</div>
          <CheckboxGroup
            options={filterOptions.states}
            selected={filters.states || []}
            onChange={(values) => handleFilterChange('states', values)}
          />
        </div>
      );
    }

    let cityOptions = null;
    if (filterOptions.cities.length > 0) {
      cityOptions = (
        <div className="filter-subsection">
          <div className="filter-subsection-label">City</div>
          <CheckboxGroup
            options={filterOptions.cities}
            selected={filters.cities || []}
            onChange={(values) => handleFilterChange('cities', values)}
            className="filter-options-scrollable"
          />
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
    const formatOptions = filterOptions.fileFormats.map(format => ({
      value: format,
      label: format.toUpperCase()
    }));
    return (
      <CheckboxGroup
        options={formatOptions}
        selected={filters.fileFormats || []}
        onChange={(values) => handleFilterChange('fileFormats', values)}
      />
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

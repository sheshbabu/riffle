import ApiClient from '../../commons/http/ApiClient.js';
import getThumbnailUrl from '../../commons/utils/getThumbnailUrl.js';
import { navigateTo } from '../../commons/components/Link.jsx';
import LoadingContainer from '../../commons/components/LoadingContainer.jsx';
import { showToast } from '../../commons/components/Toast.jsx';
import './CalendarPage.css';

const { useState, useEffect } = React;

export default function CalendarPage() {
  const [months, setMonths] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(function() {
    loadCalendarMonths();
  }, []);

  async function loadCalendarMonths() {
    try {
      setIsLoading(true);
      const response = await ApiClient.getCalendarMonths();
      setMonths(response.months || []);
    } catch (error) {
      console.error('Failed to load calendar months:', error);
      showToast('Failed to load calendar');
    } finally {
      setIsLoading(false);
    }
  }

  function handleMonthClick(year, month) {
    navigateTo(`/library?years=${year}`);
  }

  let content = null;

  if (isLoading) {
    content = <LoadingContainer size={32} />;
  } else {
    const monthsByYear = groupMonthsByYear(months);
    const years = Object.keys(monthsByYear).sort(function(a, b) {
      return b - a;
    });

    const yearSections = years.map(function(year) {
      return renderYearSection(year, monthsByYear[year], handleMonthClick);
    });

    content = yearSections;
  }

  return (
    <div className="calendar-page">
      {content}
    </div>
  );
}

function groupMonthsByYear(months) {
  const monthsByYear = {};
  months.forEach(function(month) {
    if (!monthsByYear[month.year]) {
      monthsByYear[month.year] = [];
    }
    monthsByYear[month.year].push(month);
  });
  return monthsByYear;
}

function renderYearSection(year, yearMonths, handleMonthClick) {
  const monthTiles = yearMonths.map(function(month) {
    return renderMonthTile(month, handleMonthClick);
  });

  return (
    <div key={year} className="calendar-year-section">
      <div className="calendar-year-header">{year}</div>
      <div className="calendar-month-grid">
        {monthTiles}
      </div>
    </div>
  );
}

function renderMonthTile(month, handleMonthClick) {
  const curatedPercentage = Math.round(
    (month.curatedPhotos / (month.curatedPhotos + month.uncuratedPhotos)) * 100
  );

  let thumbnailElement = null;
  if (month.coverPhotoPath) {
    const thumbnailUrl = getThumbnailUrl(month.coverPhotoPath);
    thumbnailElement = (
      <img
        src={thumbnailUrl}
        alt={month.monthName}
        className="calendar-month-image"
      />
    );
  } else {
    thumbnailElement = <div className="calendar-month-placeholder" />;
  }

  return (
    <div
      key={`${month.year}-${month.month}`}
      className="calendar-month-tile"
      onClick={() => handleMonthClick(month.year, month.month)}
    >
      {thumbnailElement}
      <div className="calendar-month-overlay">
        <span className="calendar-month-name">{month.monthName}</span>
      </div>
      <div className="calendar-month-hover">
        <span className="calendar-month-percentage">{curatedPercentage}% curated</span>
      </div>
    </div>
  );
}

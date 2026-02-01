import ApiClient from '../../commons/http/ApiClient.js';
import BarChart, { Legend } from './BarChart.jsx';
import './StatsPage.css';

const { useState, useEffect } = React;

export default function StatsPage() {
  const [months, setMonths] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setIsLoading(true);
      const data = await ApiClient.getStats();
      setMonths(data.months || []);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setIsLoading(false);
    }
  }

  let content = null;

  if (isLoading) {
    content = <div className="stats-loading">Loading...</div>;
  } else if (months.length === 0) {
    content = <div className="stats-empty">No photo data available</div>;
  } else {
    const decadeMap = {};
    for (const m of months) {
      const decade = Math.floor(m.year / 10) * 10;
      if (!decadeMap[decade]) {
        decadeMap[decade] = [];
      }
      decadeMap[decade].push(m);
    }

    let maxTotal = 0;
    for (const m of months) {
      const total = m.curatedCount + m.uncuratedCount + m.trashedCount;
      if (total > maxTotal) {
        maxTotal = total;
      }
    }

    const decades = Object.keys(decadeMap).sort((a, b) => b - a);

    const decadeSections = decades.map((decade) => {
      const decadeNum = parseInt(decade, 10);
      return (
        <DecadeSection
          key={decade}
          decade={decadeNum}
          months={decadeMap[decade]}
          maxTotal={maxTotal}
        />
      );
    });

    content = (
      <>
        <Legend />
        {decadeSections}
      </>
    );
  }

  return (
    <div className="stats-page">
      {content}
    </div>
  );
}

function DecadeSection({ decade, months, maxTotal }) {
  const label = `${decade}s`;
  return (
    <div className="stats-year-section">
      <h2 className="stats-year-header">{label}</h2>
      <BarChart months={months} startYear={decade} maxTotal={maxTotal} />
    </div>
  );
}

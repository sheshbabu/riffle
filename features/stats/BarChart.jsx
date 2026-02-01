const { useState, useRef, useEffect } = React;

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TOTAL_BARS = 120;

const CHART_WIDTH = 900;
const CHART_HEIGHT = 280;
const TOP_OFFSET = 20;
const BOTTOM_OFFSET = 50;
const LEFT_OFFSET = 0;
const BAR_AREA_HEIGHT = CHART_HEIGHT - TOP_OFFSET - BOTTOM_OFFSET;

const COLORS = {
  curated: 'var(--green-500)',
  uncurated: 'var(--neutral-300)',
  trashed: 'var(--red-500)',
};

export default function BarChart({ months, startYear, maxTotal }) {
  const [tooltip, setTooltip] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const tooltipRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!tooltip || !tooltipRef.current || !wrapperRef.current) {
      return;
    }
    const tooltipWidth = tooltipRef.current.offsetWidth;
    const wrapperWidth = wrapperRef.current.offsetWidth;
    let left = tooltip.x - tooltipWidth / 2;
    if (left < 0) {
      left = 0;
    }
    if (left + tooltipWidth > wrapperWidth) {
      left = wrapperWidth - tooltipWidth;
    }
    setTooltipStyle({ left: left, top: tooltip.y - 10 });
  }, [tooltip]);

  function handleMouseEnter(e, bar) {
    if (bar.total === 0) {
      return;
    }
    const svg = e.currentTarget.closest('svg');
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTooltip({ x, y, bar });
  }

  function handleMouseLeave() {
    setTooltip(null);
  }

  const dataMap = {};
  for (const m of months) {
    const key = `${m.year}-${m.month}`;
    dataMap[key] = m;
  }

  const effectiveMax = maxTotal > 0 ? maxTotal : 1;

  const availableBarWidth = (CHART_WIDTH - LEFT_OFFSET) / TOTAL_BARS;
  const barWidth = availableBarWidth * 0.7;
  const scaleFactor = BAR_AREA_HEIGHT / effectiveMax;
  const barBottom = TOP_OFFSET + BAR_AREA_HEIGHT;

  const bars = [];
  for (let yearOffset = 0; yearOffset < 10; yearOffset++) {
    const year = startYear + yearOffset;
    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const barIndex = yearOffset * 12 + monthIdx;
      const monthNum = monthIdx + 1;
      const key = `${year}-${monthNum}`;
      const data = dataMap[key];

      const curated = data ? data.curatedCount : 0;
      const uncurated = data ? data.uncuratedCount : 0;
      const trashed = data ? data.trashedCount : 0;
      const total = curated + uncurated + trashed;

      const x = LEFT_OFFSET + (barIndex * availableBarWidth) + (availableBarWidth - barWidth) / 2;

      bars.push({
        barIndex,
        year,
        monthNum,
        monthLabel: MONTH_LABELS[monthIdx],
        x,
        curated,
        uncurated,
        trashed,
        total,
        curatedHeight: curated * scaleFactor,
        uncuratedHeight: uncurated * scaleFactor,
        trashedHeight: trashed * scaleFactor,
        hitX: LEFT_OFFSET + (barIndex * availableBarWidth),
        hitWidth: availableBarWidth,
      });
    }
  }

  const barElements = bars.map((bar) => (
    <Bar
      key={bar.barIndex}
      bar={bar}
      barWidth={barWidth}
      barBottom={barBottom}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  ));

  const yearLabels = [];
  for (let yearOffset = 0; yearOffset < 10; yearOffset++) {
    const year = startYear + yearOffset;
    const barIndex = yearOffset * 12;
    const groupWidth = 12 * availableBarWidth;
    const centerX = LEFT_OFFSET + (barIndex * availableBarWidth) + groupWidth / 2;

    yearLabels.push(
      <text
        key={year}
        x={centerX}
        y={barBottom + 20}
        textAnchor="middle"
        className="stats-bar-label"
      >
        {year}
      </text>
    );
  }

  const yearSeparators = [];
  for (let yearOffset = 1; yearOffset < 10; yearOffset++) {
    const barIndex = yearOffset * 12;
    const sepX = LEFT_OFFSET + (barIndex * availableBarWidth);
    yearSeparators.push(
      <line
        key={yearOffset}
        x1={sepX}
        y1={TOP_OFFSET}
        x2={sepX}
        y2={barBottom}
        stroke="var(--neutral-100)"
        strokeWidth="1"
      />
    );
  }

  let tooltipElement = null;
  if (tooltip) {
    tooltipElement = <Tooltip tooltip={tooltip} tooltipRef={tooltipRef} style={tooltipStyle} />;
  }

  return (
    <div ref={wrapperRef} className="stats-chart-wrapper">
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="stats-chart-svg">
        {yearSeparators}
        <line
          x1={LEFT_OFFSET}
          y1={barBottom}
          x2={CHART_WIDTH}
          y2={barBottom}
          stroke="var(--neutral-200)"
          strokeWidth="1"
        />
        {barElements}
        {yearLabels}
      </svg>
      {tooltipElement}
    </div>
  );
}

function Bar({ bar, barWidth, barBottom, onMouseEnter, onMouseLeave }) {
  const segments = [];
  let currentY = barBottom;

  if (bar.curatedHeight > 0) {
    currentY -= bar.curatedHeight;
    segments.push(
      <rect
        key={`curated-${bar.barIndex}`}
        x={bar.x}
        y={currentY}
        width={barWidth}
        height={bar.curatedHeight}
        fill={COLORS.curated}
      />
    );
  }

  if (bar.uncuratedHeight > 0) {
    currentY -= bar.uncuratedHeight;
    segments.push(
      <rect
        key={`uncurated-${bar.barIndex}`}
        x={bar.x}
        y={currentY}
        width={barWidth}
        height={bar.uncuratedHeight}
        fill={COLORS.uncurated}
      />
    );
  }

  if (bar.trashedHeight > 0) {
    currentY -= bar.trashedHeight;
    segments.push(
      <rect
        key={`trashed-${bar.barIndex}`}
        x={bar.x}
        y={currentY}
        width={barWidth}
        height={bar.trashedHeight}
        fill={COLORS.trashed}
      />
    );
  }

  return (
    <g>
      {segments}
      <rect
        x={bar.hitX}
        y={TOP_OFFSET}
        width={bar.hitWidth}
        height={BAR_AREA_HEIGHT + BOTTOM_OFFSET}
        fill="transparent"
        onMouseEnter={(e) => onMouseEnter(e, bar)}
        onMouseLeave={onMouseLeave}
      />
    </g>
  );
}

export function Legend() {
  return (
    <div className="stats-legend">
      <div className="stats-legend-item">
        <span className="stats-legend-dot" style={{ backgroundColor: COLORS.curated }}></span>
        Curated
      </div>
      <div className="stats-legend-item">
        <span className="stats-legend-dot" style={{ backgroundColor: COLORS.uncurated }}></span>
        Uncurated
      </div>
      <div className="stats-legend-item">
        <span className="stats-legend-dot" style={{ backgroundColor: COLORS.trashed }}></span>
        Trashed
      </div>
    </div>
  );
}

function Tooltip({ tooltip, tooltipRef, style }) {
  return (
    <div ref={tooltipRef} className="stats-tooltip" style={style}>
      <div className="stats-tooltip-title">{tooltip.bar.monthLabel} {tooltip.bar.year}</div>
      <div className="stats-tooltip-row">
        <span className="stats-tooltip-dot" style={{ backgroundColor: COLORS.curated }}></span>
        Curated: {tooltip.bar.curated}
      </div>
      <div className="stats-tooltip-row">
        <span className="stats-tooltip-dot" style={{ backgroundColor: COLORS.uncurated }}></span>
        Uncurated: {tooltip.bar.uncurated}
      </div>
      <div className="stats-tooltip-row">
        <span className="stats-tooltip-dot" style={{ backgroundColor: COLORS.trashed }}></span>
        Trashed: {tooltip.bar.trashed}
      </div>
      <div className="stats-tooltip-total">Total: {tooltip.bar.total}</div>
    </div>
  );
}

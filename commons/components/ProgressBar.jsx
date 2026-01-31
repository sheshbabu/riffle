import './ProgressBar.css';

export default function ProgressBar({ label, current, total, percent, showCount = true, className = '' }) {
  const classes = `progress-bar ${className}`.trim();

  let countElement = null;
  if (showCount && total > 0) {
    countElement = (
      <div className="progress-bar-count">
        {current} / {total}
      </div>
    );
  }

  const fillStyle = { width: `${percent}%` };

  return (
    <div className={classes}>
      <div className="progress-bar-content">
        <div className="progress-bar-text">
          <div>{label}</div>
          {countElement}
        </div>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={fillStyle}></div>
      </div>
    </div>
  );
}

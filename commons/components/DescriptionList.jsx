import './DescriptionList.css';

export function DescriptionList({ children, className = '' }) {
  const classes = `description-list ${className}`.trim();
  return <div className={classes}>{children}</div>;
}

export function DescriptionItem({ label, value, children, className = '' }) {
  const classes = `description-item ${className}`.trim();

  let valueContent = null;
  if (children) {
    valueContent = children;
  } else if (value !== undefined && value !== null) {
    valueContent = value;
  }

  return (
    <div className={classes}>
      <div className="description-item-label">{label}</div>
      <div className="description-item-value">{valueContent}</div>
    </div>
  );
}

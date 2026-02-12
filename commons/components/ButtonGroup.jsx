import './ButtonGroup.css';

export default function ButtonGroup({ children, className = '' }) {
  const classes = `button-group ${className}`.trim();

  return (
    <div className={classes}>
      {children}
    </div>
  );
}

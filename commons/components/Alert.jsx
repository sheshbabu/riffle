import './Alert.css';

export default function Alert({ variant = 'info', children, className = '' }) {
  const classes = `alert alert-${variant} ${className}`.trim();

  return <div className={classes}>{children}</div>;
}

import './IconButton.css';

export default function IconButton({ children, variant = 'default', onClick, disabled = false, active = false, className = '', ...props }) {
  const classes = [
    'icon-button',
    variant,
    active ? 'active' : '',
    className
  ].filter(Boolean).join(' ');

  function handleClick(e) {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  }

  return (
    <button className={classes} onClick={handleClick} disabled={disabled} {...props}>
      {children}
    </button>
  );
}

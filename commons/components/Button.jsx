import { LoadingSpinner } from './Icon.jsx';
import './Button.css';

export default function Button({ children, variant = '', type = 'button', isDisabled = false, isLoading = false, onClick, className = '', ...props }) {
  const disabled = isDisabled || isLoading;
  const buttonClasses = ["button", variant, className, disabled ? 'disabled' : ''].filter(Boolean).join(" ");

  function handleClick(e) {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  }

  let content = children;
  if (isLoading) {
    content = (
      <>
        <LoadingSpinner size={16} />
        <span className="button-text">{children}</span>
      </>
    );
  }

  if (variant === 'ghost') {
    return (
      <div className={`ghost-button ${className} ${disabled ? 'disabled' : ''}`} onClick={handleClick} disabled={disabled} {...props}>
        {content}
      </div>
    );
  }

  if (type === 'submit') {
    return (
      <button type={type} className={buttonClasses} disabled={disabled} onClick={handleClick} {...props}>
        {content}
      </button>
    );
  }

  return (
    <div className={buttonClasses} disabled={disabled} onClick={handleClick} {...props}>
      {content}
    </div>
  );
}
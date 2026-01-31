import { SquareIcon, SquareCheckIcon } from './Icon.jsx';
import './Checkbox.css';

export default function Checkbox({ checked, onChange, disabled, className, label, children }) {
  const labelText = label || children;

  function handleChange(e) {
    if (!disabled && onChange) {
      onChange(e);
    }
  }

  const checkboxClassName = `checkbox ${disabled ? 'checkbox--disabled' : ''} ${className || ''}`.trim();

  return (
    <label className={checkboxClassName}>
      <input
        type="checkbox"
        className="checkbox-input"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
      />
      <span className="checkbox-icon">
        {checked ? <SquareCheckIcon /> : <SquareIcon />}
      </span>
      {labelText && <span className="checkbox-label">{labelText}</span>}
    </label>
  );
}

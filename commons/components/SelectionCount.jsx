import { CloseIcon } from './Icon.jsx';
import './SelectionCount.css';

export default function SelectionCount({ count, onDeselect }) {
  if (count === 0) {
    return null;
  }

  function handleClick() {
    if (onDeselect) {
      onDeselect();
    }
  }

  let closeButton = null;
  if (onDeselect) {
    closeButton = (
      <button className="selection-count-close" onClick={handleClick} title="Deselect all (ESC)">
        <CloseIcon className="selection-count-close-icon" />
      </button>
    );
  }

  return (
    <div className="selection-count">
      <span className="selection-count-text">{count} selected</span>
      {closeButton}
    </div>
  );
}

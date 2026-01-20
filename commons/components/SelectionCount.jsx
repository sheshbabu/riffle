import './SelectionCount.css';

export default function SelectionCount({ count }) {
  if (count === 0) {
    return null;
  }

  return (
    <span className="selection-count">
      {count} selected
    </span>
  );
}

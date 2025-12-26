import './SegmentedControl.css';

export default function SegmentedControl({ options, value, onChange }) {
  const optionElements = options.map(option => {
    const isSelected = option.value === value;
    const className = isSelected ? 'segment selected' : 'segment';
    return (
      <button
        key={option.value}
        className={className}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    );
  });

  return (
    <div className="segmented-control">
      {optionElements}
    </div>
  );
}

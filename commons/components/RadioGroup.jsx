import './RadioGroup.css';


export default function RadioGroup({ options, selected, onChange, keyField = 'value', labelField = 'label', className = '' }) {
  function handleSelect(value) {
    onChange(value);
  }

  const classes = `filter-options ${className}`.trim();

  const radioButtons = options.map(option => {
    const key = typeof option === 'object' ? option[keyField] : option;
    const label = typeof option === 'object' ? option[labelField] : option;
    const isChecked = selected === key;

    const icon = isChecked ? <CircleDotIcon /> : <CircleIcon />;

    return (
      <label key={key} className="radio-option">
        <input
          type="radio"
          checked={isChecked}
          onChange={() => handleSelect(key)}
          className="radio-input"
        />
        <span className="radio-icon">{icon}</span>
        <span className="radio-label">{label}</span>
      </label>
    );
  });

  return <div className={classes}>{radioButtons}</div>;
}


const CircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const CircleDotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="5" fill="currentColor" />
  </svg>
);
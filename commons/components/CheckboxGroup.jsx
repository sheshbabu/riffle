import Checkbox from './Checkbox.jsx';

export default function CheckboxGroup({ options, selected = [], onChange, keyField = 'value', labelField = 'label', className = '' }) {
  function handleToggle(value) {
    let newSelected;
    if (selected.includes(value)) {
      newSelected = selected.filter(v => v !== value);
    } else {
      newSelected = [...selected, value];
    }
    onChange(newSelected);
  }

  const classes = `filter-options ${className}`.trim();

  const checkboxes = options.map(option => {
    const key = typeof option === 'object' ? option[keyField] : option;
    const label = typeof option === 'object' ? option[labelField] : option;
    const isChecked = selected.includes(key);

    return (
      <Checkbox key={key} checked={isChecked} onChange={() => handleToggle(key)}>
        {label}
      </Checkbox>
    );
  });

  return <div className={classes}>{checkboxes}</div>;
}

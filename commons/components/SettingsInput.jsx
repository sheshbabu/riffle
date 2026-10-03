export default function SettingsInput({ id, label, description, type = "number", min, max, step, value, onChange }) {
  let descriptionElement = null;
  if (description) {
    descriptionElement = <p className="settings-field-description">{description}</p>;
  }

  return (
    <div className="settings-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="settings-input"
      />
      {descriptionElement}
    </div>
  );
}

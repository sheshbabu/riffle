import './Input.css';

export default function Input({ id, label, type = "text", placeholder, value, hint, error, isDisabled, onChange, rows, autoFocus }) {
  const isTextarea = type === "textarea";

  let inputElement = null;
  if (isTextarea) {
    inputElement = (
      <textarea
        id={id}
        name={id}
        placeholder={placeholder}
        className={error ? "has-error" : ""}
        disabled={isDisabled}
        value={value || ""}
        onChange={onChange}
        rows={rows}
        autoFocus={autoFocus}
      />
    );
  } else {
    inputElement = (
      <input
        type={type}
        id={id}
        name={id}
        placeholder={placeholder}
        className={error ? "has-error" : ""}
        disabled={isDisabled}
        value={value || ""}
        onChange={onChange}
        autoFocus={autoFocus}
      />
    );
  }

  let labelElement = null;
  if (label) {
    labelElement = (
      <>
        <label htmlFor={id}>{label}</label>
        <br />
      </>
    );
  }

  let hintElement = null;
  if (hint) {
    hintElement = <div className="input-hint">{hint}</div>;
  }

  let errorElement = null;
  if (error) {
    errorElement = <div className="input-error">{error}</div>;
  }

  return (
    <div className="input-container">
      {labelElement}
      {hintElement}
      {inputElement}
      <br />
      {errorElement}
    </div>
  );
}

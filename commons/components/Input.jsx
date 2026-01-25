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
        className={error ? "error" : ""}
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
        className={error ? "error" : ""}
        disabled={isDisabled}
        value={value || ""}
        onChange={onChange}
        autoFocus={autoFocus}
      />
    );
  }

  return (
    <div className="input-container">
      {label && (
        <>
          <label htmlFor={id}>{label}</label>
          <br />
        </>
      )}
      {hint && <div className="input-hint">{hint}</div>}
      {inputElement}
      <br />
      {error && <div className="input-error">{error}</div>}
    </div>
  );
}

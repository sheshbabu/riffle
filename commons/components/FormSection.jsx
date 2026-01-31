import './FormSection.css';

export default function FormSection({ title, description, children, className = '' }) {
  const classes = `form-section ${className}`.trim();

  let descriptionElement = null;
  if (description) {
    descriptionElement = <p className="form-section-description">{description}</p>;
  }

  return (
    <div className={classes}>
      <h4 className="form-section-title">{title}</h4>
      {descriptionElement}
      <div className="form-section-content">{children}</div>
    </div>
  );
}

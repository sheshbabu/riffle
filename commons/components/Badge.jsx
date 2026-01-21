export default function Badge({ children, variant = 'neutral' }) {
  const className = `badge badge-${variant}`;

  return (
    <span className={className}>
      {children}
    </span>
  );
}

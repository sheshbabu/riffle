import Badge from './Badge.jsx';

const DEFAULT_MAPPING = {
  completed: { variant: 'success', label: 'Completed' },
  error: { variant: 'error', label: 'Error' },
  running: { variant: 'warning', label: 'Running' },
  processing: { variant: 'warning', label: 'Processing' }
};

export default function StatusBadge({ status, labels = {}, className = '' }) {
  const mapping = { ...DEFAULT_MAPPING };

  Object.keys(labels).forEach(key => {
    if (mapping[key]) {
      mapping[key].label = labels[key];
    }
  });

  const config = mapping[status];

  if (!config) {
    return null;
  }

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

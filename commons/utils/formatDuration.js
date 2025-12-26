export default function formatDuration(durationStr) {
  if (!durationStr) {
    return null;
  }

  // Duration format is typically "0:00:28" or "00:28"
  const parts = durationStr.split(':').map(p => parseInt(p, 10));

  if (parts.length === 3) {
    // Format: H:MM:SS
    const hours = parts[0];
    const minutes = parts[1];
    const seconds = parts[2];

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  } else if (parts.length === 2) {
    // Format: MM:SS
    const minutes = parts[0];
    const seconds = parts[1];

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  return durationStr;
}

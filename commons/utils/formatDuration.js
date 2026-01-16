export default function formatDuration(duration, compact = false) {
  if (!duration && duration !== 0) {
    return null;
  }

  let totalSeconds;

  if (typeof duration === 'number') {
    totalSeconds = duration;
  } else if (typeof duration === 'string') {
    const parts = duration.split(':').map(p => parseInt(p, 10));

    if (parts.length === 3) {
      totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      totalSeconds = parts[0] * 60 + parts[1];
    } else {
      totalSeconds = parseInt(duration, 10);
      if (isNaN(totalSeconds)) {
        return duration;
      }
    }
  } else {
    return null;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (compact) {
    const pad = (n) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${minutes}:${pad(seconds)}`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

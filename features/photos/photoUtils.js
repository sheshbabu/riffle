export function getPhotoUrl(filePath, width = null, height = null) {
  const encoded = btoa(filePath);
  let url = `/api/photo/?path=${encoded}`;
  if (width) {
    url += `&width=${width}`;
  }
  if (height) {
    url += `&height=${height}`;
  }
  return url;
}

export function isVideoFile(filePath) {
  const ext = filePath.toLowerCase().split('.').pop();
  return ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg'].includes(ext);
}

export function formatSessionDate(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const timeOptions = { hour: 'numeric', minute: '2-digit' };

  const sameDay = start.toDateString() === end.toDateString();
  const startTimeStr = start.toLocaleTimeString('en-US', timeOptions);
  const endTimeStr = end.toLocaleTimeString('en-US', timeOptions);
  const sameDisplayTime = startTimeStr === endTimeStr;

  if (sameDay && sameDisplayTime) {
    return `${start.toLocaleDateString('en-US', dateOptions)} • ${startTimeStr}`;
  } else if (sameDay) {
    return `${start.toLocaleDateString('en-US', dateOptions)} • ${startTimeStr} - ${endTimeStr}`;
  } else {
    return `${start.toLocaleDateString('en-US', dateOptions)} - ${end.toLocaleDateString('en-US', dateOptions)}`;
  }
}

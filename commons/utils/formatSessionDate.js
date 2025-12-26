export default function formatSessionDate(startTime, endTime) {
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

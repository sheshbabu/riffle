// Parse datetime string, handling both with and without timezone
function parseDateTime(dateTimeStr) {
  if (!dateTimeStr) {
    return null;
  }

  // Check if the string has timezone info (ends with Z, or has +/-HH:MM)
  const hasTimezone = /[Zz]$|[+-]\d{2}:\d{2}$/.test(dateTimeStr);

  if (hasTimezone) {
    return new Date(dateTimeStr);
  }

  // No timezone: parse components directly and create a local date
  // Format: "2019-03-30 12:50:57" or "2019-03-30T12:50:57"
  const match = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (!match) {
    return new Date(dateTimeStr);
  }

  return new Date(
    parseInt(match[1], 10),
    parseInt(match[2], 10) - 1,
    parseInt(match[3], 10),
    parseInt(match[4], 10),
    parseInt(match[5], 10),
    parseInt(match[6], 10)
  );
}

export default function formatSessionDate(startTime, endTime) {
  const start = parseDateTime(startTime);
  const end = parseDateTime(endTime);

  if (!start || !end) {
    return '';
  }

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

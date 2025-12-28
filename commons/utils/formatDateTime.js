export default function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) {
    return null;
  }

  // Check if the string has timezone info (ends with Z, or has +/-HH:MM)
  const hasTimezone = /[Zz]$|[+-]\d{2}:\d{2}$/.test(dateTimeStr);

  let year, month, day, hours, minutes, seconds;

  if (hasTimezone) {
    // Has timezone: parse and display in local time
    const date = new Date(dateTimeStr);
    day = String(date.getDate()).padStart(2, '0');
    month = String(date.getMonth() + 1).padStart(2, '0');
    year = date.getFullYear();
    hours = date.getHours();
    minutes = String(date.getMinutes()).padStart(2, '0');
    seconds = String(date.getSeconds()).padStart(2, '0');
  } else {
    // No timezone: treat as local capture time, extract components directly
    // Format: "2019-03-30 12:50:57" or "2019-03-30T12:50:57"
    const match = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
    if (!match) {
      return dateTimeStr;
    }
    year = parseInt(match[1], 10);
    month = match[2];
    day = match[3];
    hours = parseInt(match[4], 10);
    minutes = match[5];
    seconds = match[6];
  }

  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${day}/${month}/${year}, ${displayHours}:${minutes}:${seconds} ${ampm}`;
}

export default function formatGroupDate(dateStr) {
  if (dateStr === 'Unknown') {
    return 'Unknown Date';
  }

  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) {
    return dateStr;
  }
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

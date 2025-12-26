export default function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) {
    return null;
  }
  const date = new Date(dateTimeStr);
  return date.toLocaleString();
}

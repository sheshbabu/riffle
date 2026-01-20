export default function formatCount(number, defaultValue = 0) {
  return (number ?? defaultValue).toLocaleString();
}

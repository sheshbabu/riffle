export default function formatExposureTime(exposureTime) {
  if (!exposureTime) {
    return null;
  }
  const decimal = parseFloat(exposureTime);
  if (decimal >= 1) {
    return `${decimal}s`;
  }
  const fraction = 1 / decimal;
  return `1/${Math.round(fraction)}s`;
}

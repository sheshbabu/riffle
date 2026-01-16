export default function formatFocalLength(focalLength) {
  if (!focalLength && focalLength !== 0) {
    return null;
  }

  const numericValue = typeof focalLength === 'number' ? focalLength : parseFloat(focalLength);

  if (isNaN(numericValue)) {
    return focalLength;
  }

  return `${numericValue}mm`;
}

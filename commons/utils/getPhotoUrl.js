export default function getPhotoUrl(filePath) {
  const encoded = btoa(filePath);
  return `/api/photo/?path=${encoded}`;
}

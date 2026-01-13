export default function getThumbnailUrl(filePath) {
  const encoded = btoa(filePath);
  return `/api/thumbnail/?path=${encoded}`;
}

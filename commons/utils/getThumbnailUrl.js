export default function getThumbnailUrl(filePath) {
  const encoded = btoa(filePath);
  return `/api/thumbnails/?path=${encoded}`;
}

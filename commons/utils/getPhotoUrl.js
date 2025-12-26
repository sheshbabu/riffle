export default function getPhotoUrl(filePath, width = null, height = null) {
  const encoded = btoa(filePath);
  let url = `/api/photo/?path=${encoded}`;
  if (width) {
    url += `&width=${width}`;
  }
  if (height) {
    url += `&height=${height}`;
  }
  return url;
}

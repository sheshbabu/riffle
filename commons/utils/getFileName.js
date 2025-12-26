export default function getFileName(filePath) {
  return filePath.split('/').pop();
}

export default function isVideoFile(filePath) {
  const ext = filePath.toLowerCase().split('.').pop();
  return ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg'].includes(ext);
}

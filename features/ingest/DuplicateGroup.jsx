import './DuplicateGroup.css';

function DuplicateFile({ file, importPath }) {
  const isVideo = isVideoFile(file.path);
  const photoUrl = getPhotoUrl(file.path);

  let mediaElement = null;
  if (isVideo) {
    mediaElement = (
      <video src={photoUrl} className="duplicate-file-media" controls />
    );
  } else {
    mediaElement = (
      <img
        src={photoUrl}
        alt={file.path}
        className="duplicate-file-media clickable"
        onClick={() => window.open(photoUrl, '_blank')}
      />
    );
  }

  let badges = null;
  const badgeElements = [];

  if (file.isCandidate) {
    badgeElements.push(
      <span key="picked" className="badge badge-picked">PICKED</span>
    );
  }

  if (file.hasExif) {
    badgeElements.push(
      <span key="exif" className="badge badge-exif">Has EXIF</span>
    );
  }

  if (file.size) {
    badgeElements.push(
      <span key="size" className="badge badge-info">{formatFileSize(file.size)}</span>
    );
  }

  if (isVideo && file.exifData && file.exifData.Duration) {
    const formattedDuration = formatDuration(file.exifData.Duration);
    if (formattedDuration) {
      badgeElements.push(
        <span key="duration" className="badge badge-info">{formattedDuration}</span>
      );
    }
  }

  if (badgeElements.length > 0) {
    badges = <div className="badges">{badgeElements}</div>;
  }

  const fileClassName = file.isCandidate ? 'duplicate-file candidate' : 'duplicate-file';
  const displayPath = truncatePath(file.path, importPath);

  return (
    <div className={fileClassName}>
      {mediaElement}
      <div className="file-info">
        {badges}
        <code className="file-path" title={file.path}>{displayPath}</code>
      </div>
    </div>
  );
}

export default function DuplicateGroup({ group, index, importPath }) {
  const fileElements = group.files.map((file, fileIndex) => (
    <DuplicateFile key={fileIndex} file={file} importPath={importPath} />
  ));

  return (
    <div className="duplicate-group">
      <h4 className="group-header">
        Group {index + 1} (Hash: {group.hash})
      </h4>
      <div className="group-files">
        {fileElements}
      </div>
    </div>
  );
}

function getPhotoUrl(filePath) {
  const encoded = btoa(filePath);
  return `/api/photo/?path=${encoded}`;
}

function isVideoFile(filePath) {
  const ext = filePath.toLowerCase().split('.').pop();
  return ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg'].includes(ext);
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i];
}

function formatDuration(durationStr) {
  if (!durationStr) return null;

  // Duration format is typically "0:00:28" or "00:28"
  const parts = durationStr.split(':').map(p => parseInt(p, 10));

  if (parts.length === 3) {
    // Format: H:MM:SS
    const hours = parts[0];
    const minutes = parts[1];
    const seconds = parts[2];

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  } else if (parts.length === 2) {
    // Format: MM:SS
    const minutes = parts[0];
    const seconds = parts[1];

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  return durationStr;
}

function truncatePath(fullPath, importPath) {
  if (!importPath) {
    return fullPath;
  }

  // Ensure ingest path ends with a slash for proper prefix matching
  const normalizedimportPath = importPath.endsWith('/') ? importPath : importPath + '/';

  if (fullPath.startsWith(normalizedimportPath)) {
    const relativePath = fullPath.substring(normalizedimportPath.length);
    return '.../' + relativePath;
  }

  return fullPath;
}
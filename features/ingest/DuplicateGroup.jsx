import './DuplicateGroup.css';
import getPhotoUrl from '../../commons/utils/getPhotoUrl.js';
import isVideoFile from '../../commons/utils/isVideoFile.js';
import formatFileSize from '../../commons/utils/formatFileSize.js';
import formatDuration from '../../commons/utils/formatDuration.js';

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
      <span key="picked" className="badge badge-picked">Picked</span>
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
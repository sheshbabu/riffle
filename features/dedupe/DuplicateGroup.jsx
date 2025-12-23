import './DuplicateGroup.css';

function getPhotoUrl(filePath) {
  const encoded = btoa(filePath);
  return `/api/photo/?path=${encoded}`;
}

function isVideoFile(filePath) {
  const ext = filePath.toLowerCase().split('.').pop();
  return ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg'].includes(ext);
}

function DuplicateFile({ file }) {
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
      <span key="kept" className="badge badge-kept">KEPT</span>
    );
  }

  if (file.hasExif) {
    badgeElements.push(
      <span key="exif" className="badge badge-exif">Has EXIF</span>
    );
  }

  if (badgeElements.length > 0) {
    badges = <div className="badges">{badgeElements}</div>;
  }

  const fileClassName = file.isCandidate ? 'duplicate-file candidate' : 'duplicate-file';

  return (
    <div className={fileClassName}>
      {mediaElement}
      <div className="file-info">
        {badges}
        <code className="file-path">{file.path}</code>
      </div>
    </div>
  );
}

export default function DuplicateGroup({ group, index }) {
  const fileElements = group.files.map((file, fileIndex) => (
    <DuplicateFile key={fileIndex} file={file} />
  ));

  return (
    <div className="duplicate-group">
      <h4 className="group-header">
        Group {index + 1} (Hash: {group.hash})
      </h4>
      {fileElements}
    </div>
  );
}

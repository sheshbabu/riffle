import './assets/reset.css';
import './assets/index.css';
import Button from './commons/components/Button.jsx';
import Input from './commons/components/Input.jsx';
import ApiClient from './commons/http/ApiClient.js';

const { useState, useEffect } = React;

function getPhotoUrl(filePath) {
  const encoded = btoa(filePath);
  return `/api/photo/?path=${encoded}`;
}

function isVideoFile(filePath) {
  const ext = filePath.toLowerCase().split('.').pop();
  return ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg'].includes(ext);
}

function App() {
  const [inboxPath, setInboxPath] = useState('');
  const [libraryPath, setLibraryPath] = useState('');
  const [trashPath, setTrashPath] = useState('');
  const [isDryRun, setIsDryRun] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!isProcessing) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const data = await ApiClient.getDedupeResults();
        setResults(data);
        setIsProcessing(false);
        setMessage('Deduplication completed!');
      } catch (error) {
        // Results not ready yet, keep polling
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isProcessing]);

  async function handleDedupe() {
    if (!inboxPath || !libraryPath || !trashPath) {
      setMessage('Please fill in all folder paths');
      return;
    }

    setIsProcessing(true);
    setMessage('Starting deduplication...');
    setResults(null);

    try {
      const response = await ApiClient.dedupe({
        inboxPath,
        libraryPath,
        trashPath,
        isDryRun
      });

      setMessage(response.message || 'Deduplication started successfully');
    } catch (error) {
      setMessage(error.message || 'Failed to start deduplication');
      setIsProcessing(false);
    }
  }

  const buttonText = isProcessing ? 'Processing...' : 'Start Deduplication';

  let messageElement = null;
  if (message) {
    messageElement = (
      <div style={{
        marginTop: 'var(--spacing-6)',
        padding: 'var(--spacing-4)',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '4px',
        border: '1px solid var(--neutral-200)'
      }}>
        {message}
      </div>
    );
  }

  let resultsElement = null;
  if (results) {
    resultsElement = (
      <div style={{
        marginTop: 'var(--spacing-6)',
        padding: 'var(--spacing-4)',
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '4px',
        border: '1px solid var(--neutral-200)'
      }}>
        <h3 style={{ marginTop: 0 }}>Summary</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--neutral-200)' }}>
              <td style={{ padding: 'var(--spacing-2)', fontWeight: 600 }}>Total files scanned:</td>
              <td style={{ padding: 'var(--spacing-2)', textAlign: 'right' }}>{results.totalScanned}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--neutral-200)' }}>
              <td style={{ padding: 'var(--spacing-2)', fontWeight: 600 }}>Unique files:</td>
              <td style={{ padding: 'var(--spacing-2)', textAlign: 'right' }}>{results.uniqueFiles}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--neutral-200)' }}>
              <td style={{ padding: 'var(--spacing-2)', fontWeight: 600 }}>Duplicate groups found:</td>
              <td style={{ padding: 'var(--spacing-2)', textAlign: 'right' }}>{results.duplicateGroups}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--neutral-200)' }}>
              <td style={{ padding: 'var(--spacing-2)', fontWeight: 600 }}>Duplicates removed:</td>
              <td style={{ padding: 'var(--spacing-2)', textAlign: 'right' }}>{results.duplicatesRemoved}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--neutral-200)' }}>
              <td style={{ padding: 'var(--spacing-2)', fontWeight: 600 }}>Files moved to library:</td>
              <td style={{ padding: 'var(--spacing-2)', textAlign: 'right' }}>{results.movedToLibrary}</td>
            </tr>
            <tr>
              <td style={{ padding: 'var(--spacing-2)', fontWeight: 600 }}>Files moved to trash:</td>
              <td style={{ padding: 'var(--spacing-2)', textAlign: 'right' }}>{results.movedToTrash}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  let duplicatesElement = null;
  if (results && results.duplicates && results.duplicates.length > 0) {
    const duplicateGroupElements = results.duplicates.map((group, groupIndex) => {
      const fileElements = group.files.map((file, fileIndex) => {
        const candidateStyle = file.isCandidate ? {
          backgroundColor: 'var(--green-500)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '3px',
          fontSize: '0.75rem',
          marginLeft: 'var(--spacing-2)'
        } : null;

        const exifBadge = file.hasExif ? (
          <span style={{
            backgroundColor: 'var(--neutral-200)',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '0.75rem',
            marginLeft: 'var(--spacing-2)'
          }}>
            Has EXIF
          </span>
        ) : null;

        const isVideo = isVideoFile(file.path);
        const photoUrl = getPhotoUrl(file.path);

        let mediaElement = null;
        if (isVideo) {
          mediaElement = (
            <video
              src={photoUrl}
              style={{
                width: '200px',
                height: '200px',
                objectFit: 'cover',
                borderRadius: '4px',
                marginBottom: 'var(--spacing-2)'
              }}
              controls
            />
          );
        } else {
          mediaElement = (
            <img
              src={photoUrl}
              alt={file.path}
              style={{
                width: '200px',
                height: '200px',
                objectFit: 'cover',
                borderRadius: '4px',
                marginBottom: 'var(--spacing-2)',
                cursor: 'pointer'
              }}
              onClick={() => window.open(photoUrl, '_blank')}
            />
          );
        }

        return (
          <div
            key={fileIndex}
            style={{
              padding: 'var(--spacing-4)',
              borderLeft: file.isCandidate ? '3px solid var(--green-500)' : '3px solid var(--neutral-200)',
              marginBottom: 'var(--spacing-2)',
              backgroundColor: file.isCandidate ? 'var(--bg-secondary)' : 'transparent',
              display: 'flex',
              gap: 'var(--spacing-4)',
              alignItems: 'flex-start'
            }}
          >
            {mediaElement}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginBottom: 'var(--spacing-2)' }}>
                {file.isCandidate && <span style={candidateStyle}>KEPT</span>}
                {exifBadge}
              </div>
              <code style={{ fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--neutral-600)' }}>
                {file.path}
              </code>
            </div>
          </div>
        );
      });

      return (
        <div
          key={groupIndex}
          style={{
            marginBottom: 'var(--spacing-6)',
            padding: 'var(--spacing-4)',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '4px',
            border: '1px solid var(--neutral-200)'
          }}
        >
          <h4 style={{ marginTop: 0, fontSize: '0.875rem', color: 'var(--neutral-500)', marginBottom: 'var(--spacing-4)' }}>
            Group {groupIndex + 1} (Hash: {group.hash})
          </h4>
          {fileElements}
        </div>
      );
    });

    duplicatesElement = (
      <div style={{ marginTop: 'var(--spacing-6)' }}>
        <h3>Duplicate Groups ({results.duplicates.length})</h3>
        {duplicateGroupElements}
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Riffle</h1>

      <Input
        id="inboxPath"
        label="Inbox Path"
        type="text"
        value={inboxPath}
        onChange={(e) => setInboxPath(e.target.value)}
        placeholder="/path/to/inbox"
        hint="Source folder containing photos to organize"
      />

      <Input
        id="libraryPath"
        label="Library Path"
        type="text"
        value={libraryPath}
        onChange={(e) => setLibraryPath(e.target.value)}
        placeholder="/path/to/library"
        hint="Destination folder for organized photos"
      />

      <Input
        id="trashPath"
        label="Trash Path"
        type="text"
        value={trashPath}
        onChange={(e) => setTrashPath(e.target.value)}
        placeholder="/path/to/trash"
        hint="Folder for duplicate photos"
      />

      <div style={{ marginTop: 'var(--spacing-6)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isDryRun}
            onChange={(e) => setIsDryRun(e.target.checked)}
          />
          Dry Run (no files will be moved)
        </label>
      </div>

      <div style={{ marginTop: 'var(--spacing-6)' }}>
        <Button
          className='primary'
          onClick={handleDedupe}
          disabled={isProcessing}
        >
          {buttonText}
        </Button>
      </div>

      {messageElement}
      {resultsElement}
      {duplicatesElement}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

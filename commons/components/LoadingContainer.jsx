import { LoadingSpinner } from './Icon.jsx';
import './LoadingContainer.css';

export default function LoadingContainer({ size = 32, message, minHeight = 300 }) {
  let messageElement = null;
  if (message) {
    messageElement = <p className="loading-container-message">{message}</p>;
  }

  return (
    <div className="loading-container" style={{ minHeight: `${minHeight}px` }}>
      <LoadingSpinner size={size} />
      {messageElement}
    </div>
  );
}

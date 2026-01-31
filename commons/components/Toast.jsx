import { CloseIcon } from "./Icon.jsx";
import "./Toast.css";

const { useState, useEffect } = React;

let showToastFn = null;

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    showToastFn = (message, duration = 4000) => {
      setToast({ message, duration });
    };

    return () => {
      showToastFn = null;
    };
  }, []);

  function handleDismiss() {
    setToast(null);
  }

  const toastRoot = document.querySelector('.toast-root');

  let toastPortal = null;
  if (toast && toastRoot) {
    toastPortal = ReactDOM.createPortal(
      <Toast message={toast.message} duration={toast.duration} onDismiss={handleDismiss} />,
      toastRoot
    );
  }

  return (
    <>
      {children}
      {toastPortal}
    </>
  );
}

function Toast({ message, duration, onDismiss }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 200);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  function handleDismissClick() {
    setIsVisible(false);
    setTimeout(onDismiss, 200);
  }

  const containerClass = `toast-container ${isVisible ? '' : 'toast-exit'}`;

  return (
    <div className={containerClass}>
      <div className="toast-message">
        {message}
      </div>
      <div className="toast-close" onClick={handleDismissClick}>
        <CloseIcon />
      </div>
    </div>
  );
}

export function showToast(message, duration = 4000) {
  if (showToastFn) {
    showToastFn(message, duration);
  }
}

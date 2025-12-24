const { useState, useEffect } = React;

export function navigateTo(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new CustomEvent('navigate', { detail: { path } }));
}

export default function Link({ to, className, activeClassName, children }) {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    function handleNavigate() {
      setCurrentPath(window.location.pathname);
    }

    window.addEventListener('navigate', handleNavigate);
    window.addEventListener('popstate', handleNavigate);

    return () => {
      window.removeEventListener('navigate', handleNavigate);
      window.removeEventListener('popstate', handleNavigate);
    };
  }, []);

  const isActive = currentPath === to;

  let linkClassName = className || '';
  if (isActive && activeClassName) {
    linkClassName += ' ' + activeClassName;
  }

  function handleClick(e) {
    e.preventDefault();
    navigateTo(to);
  }

  return (
    <a href={to} className={linkClassName} onClick={handleClick}>
      {children}
    </a>
  );
}

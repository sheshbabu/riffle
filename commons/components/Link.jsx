const { useState, useEffect } = React;

export function navigateTo(path, shouldPreserveSearchParams = false) {
  if (shouldPreserveSearchParams) {
    const currentUrl = new URL(window.location.href);
    const newUrl = new URL(path, currentUrl.origin);

    for (const [key, value] of currentUrl.searchParams.entries()) {
      if (!newUrl.searchParams.has(key)) {
        newUrl.searchParams.set(key, value);
      }
    }
    path = newUrl.pathname + newUrl.search;
  }

  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('navigate'));
}

export function updateSearchParams(params) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '' || value === 0) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  }
  const newPath = url.pathname + url.search;
  window.history.pushState({}, '', newPath);
  window.dispatchEvent(new PopStateEvent('navigate'));
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

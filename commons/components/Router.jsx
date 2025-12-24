const { createContext, useContext, useState, useEffect } = React;

const RouterContext = createContext(null);

export function useRouter() {
  return useContext(RouterContext);
}

export default function Router({ children }) {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    function handleNavigate(event) {
      setCurrentPath(event.detail.path);
    }

    window.addEventListener('navigate', handleNavigate);

    function handlePopState() {
      setCurrentPath(window.location.pathname);
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('navigate', handleNavigate);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <RouterContext.Provider value={{ currentPath }}>
      {children}
    </RouterContext.Provider>
  );
}

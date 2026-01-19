const { useState, useEffect, createContext, useContext } = React;

const RouterContext = createContext(null);

export function useRouter() {
  return useContext(RouterContext);
}

export default function Router({ children }) {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    function handleLocationChange() {
      setCurrentPath(window.location.pathname);
    }

    window.addEventListener("navigate", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);

    return () => {
      window.removeEventListener("navigate", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  let matchedComponent = null;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const { path, component } = child.props;

    if (path.includes(":")) {
      const pathSegments = path.split("/");
      const pathPattern = pathSegments.map(segment => {
        if (segment.startsWith(":")) {
          const paramName = segment.slice(1);
          return `(?<${paramName}>[^/]+)`;
        }
        return segment;
      }).join("\\/");
      const pattern = new RegExp(`^${pathPattern}$`);
      const match = pattern.exec(currentPath);

      if (match) {
        const params = match.groups;
        matchedComponent = React.createElement(component, { ...params });
        break;
      }
    }

    if (currentPath === path) {
      matchedComponent = React.createElement(component, {});
      break;
    }
  }

  return React.createElement(RouterContext.Provider, { value: { currentPath } }, matchedComponent);
}

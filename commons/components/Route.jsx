import { useRouter } from './Router.jsx';

export default function Route({ path, component: Component }) {
  const { currentPath } = useRouter();

  if (currentPath !== path) {
    return null;
  }

  return <Component />;
}

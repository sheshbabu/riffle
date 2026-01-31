import { ImportIcon, DatabaseIcon, ExportIcon, StackIcon } from '../../commons/components/Icon.jsx';
import Link, { navigateTo } from '../../commons/components/Link.jsx';
import { useRouter } from '../../commons/components/Router.jsx';
import ImportPane from './ImportPane.jsx';
import LibraryPane from './LibraryPane.jsx';
import ExportPane from './ExportPane.jsx';
import BurstPane from './BurstPane.jsx';
import './SettingsPage.css';

const { useEffect } = React;

const tabs = [
  { id: 'import', path: '/settings/import', label: 'Import', icon: <ImportIcon className="settings-tab-icon" />, component: ImportPane },
  { id: 'library', path: '/settings/library', label: 'Library', icon: <DatabaseIcon className="settings-tab-icon" />, component: LibraryPane },
  { id: 'burst', path: '/settings/burst', label: 'Burst', icon: <StackIcon className="settings-tab-icon" />, component: BurstPane },
  { id: 'export', path: '/settings/export', label: 'Export', icon: <ExportIcon className="settings-tab-icon" />, component: ExportPane }
];

export default function SettingsPage() {
  const { currentPath } = useRouter();

  useEffect(() => {
    if (currentPath === '/settings') {
      navigateTo('/settings/import');
    }
  }, [currentPath]);

  const sidebar = tabs.map(tab => {
    return (
      <Link key={tab.id} to={tab.path} className="settings-tab" activeClassName="is-active">
        {tab.icon}
        {tab.label}
      </Link>
    );
  });

  let activeTab = tabs.find(tab => tab.path === currentPath);
  if (!activeTab && currentPath === '/settings') {
    activeTab = tabs[0];
  }

  let paneContent = null;
  if (activeTab) {
    const Component = activeTab.component;
    paneContent = <Component />;
  }

  return (
    <div className="settings-page">
      <div className="settings-content">
        <div className="settings-sidebar">
          {sidebar}
        </div>
        <div className="settings-main">
          {paneContent}
        </div>
      </div>
    </div>
  );
}

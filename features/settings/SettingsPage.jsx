import { ImportIcon, DatabaseIcon } from '../../commons/components/Icon.jsx';
import ImportPane from './ImportPane.jsx';
import LibraryPane from './LibraryPane.jsx';
import './SettingsPage.css';

const { useState } = React;

const tabs = [
  { id: 'import', label: 'Import', icon: <ImportIcon className="settings-tab-icon" />, content: <ImportPane /> },
  { id: 'library', label: 'Library', icon: <DatabaseIcon className="settings-tab-icon" />, content: <LibraryPane /> }
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('import');

  function handleTabClick(tabId) {
    setActiveTab(tabId);
  }

  const sidebar = tabs.map(tab => (
    <div key={tab.id} className={`settings-tab ${activeTab === tab.id ? 'is-active' : ''}`} onClick={() => handleTabClick(tab.id)}>
      {tab.icon}
      {tab.label}
    </div>
  ));

  const activeTabData = tabs.find(tab => tab.id === activeTab);
  const paneContent = activeTabData ? activeTabData.content : null;

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

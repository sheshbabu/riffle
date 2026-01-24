import Link from './Link.jsx';
import Logo from './Logo.jsx';
import { ImportIcon, CurateIcon, LibraryIcon, FolderIcon, TrashIcon, CalendarIcon, SettingsIcon, ExportIcon } from './Icon.jsx';
import './Sidebar.css';

export default function Sidebar() {
  return (
    <div className="sidebar-container">
      <div className="sidebar-fixed">
        <div className="sidebar-header">
          <Logo />
        </div>

        <Link className="sidebar-button" activeClassName="is-active" to="/import">
          <ImportIcon />
          Import
        </Link>
        <Link className="sidebar-button" activeClassName="is-active" to="/curate">
          <CurateIcon />
          Curate
        </Link>
        <Link className="sidebar-button" activeClassName="is-active" to="/library">
          <LibraryIcon />
          Library
        </Link>
        <Link className="sidebar-button" activeClassName="is-active" to="/albums">
          <FolderIcon />
          Albums
        </Link>
        <Link className="sidebar-button" activeClassName="is-active" to="/calendar">
          <CalendarIcon />
          Calendar
        </Link>
        <Link className="sidebar-button" activeClassName="is-active" to="/export">
          <ExportIcon />
          Export
        </Link>
        <Link className="sidebar-button" activeClassName="is-active" to="/trash">
          <TrashIcon />
          Trash
        </Link>
        <Link className="sidebar-button" activeClassName="is-active" to="/settings">
          <SettingsIcon />
          Settings
        </Link>
      </div>
    </div>
  );
}

import Link from './Link.jsx';
import { InboxIcon, ImagesIcon, AlbumsIcon, BrushCleaningIcon, TagIcon } from './Icon.jsx';
import './Sidebar.css';

export default function Sidebar() {
  return (
    <div className="sidebar-container">
      <div className="sidebar-fixed">
        <div className="sidebar-header">
          <h2>Riffle</h2>
        </div>

        <Link className="sidebar-button" activeClassName="is-active" to="/inbox">
          <InboxIcon />
          Inbox
        </Link>
        <Link className="sidebar-button" activeClassName="is-active" to="/photos">
          <ImagesIcon />
          Photos
        </Link>
        <Link className="sidebar-button" activeClassName="is-active" to="/albums">
          <AlbumsIcon />
          Albums
        </Link>
        <Link className="sidebar-button" activeClassName="is-active" to="/curate">
          <BrushCleaningIcon />
          Curate
        </Link>
        <Link className="sidebar-button" activeClassName="is-active" to="/tags">
          <TagIcon />
          Tags
        </Link>
      </div>
    </div>
  );
}

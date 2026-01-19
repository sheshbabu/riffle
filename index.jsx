import './assets/reset.css';
import './assets/index.css';
import Router from './commons/components/Router.jsx';
import Route from './commons/components/Route.jsx';
import Sidebar from './commons/components/Sidebar.jsx';
import { ToastProvider } from './commons/components/Toast.jsx';
import ImportPage from './features/ingest/ImportPage.jsx';
import PhotoListPage from './features/photos/PhotoListPage.jsx';
import CalendarPage from './features/calendar/CalendarPage.jsx';
import SettingsPage from './features/settings/SettingsPage.jsx';
import AlbumsPage from './features/albums/AlbumsPage.jsx';
import AlbumDetailPage from './features/albums/AlbumDetailPage.jsx';

function App() {
  return (
    <ToastProvider>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Router>
            <Route path="/" component={ImportPage} />
            <Route path="/import" component={ImportPage} />
            <Route path="/curate" component={CuratePage} />
            <Route path="/library" component={LibraryPage} />
            <Route path="/albums" component={AlbumsPage} />
            <Route path="/albums/:albumId" component={AlbumDetailPage} />
            <Route path="/calendar" component={CalendarPage} />
            <Route path="/trash" component={TrashPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/settings/import" component={SettingsPage} />
            <Route path="/settings/library" component={SettingsPage} />
          </Router>
        </div>
      </div>
    </ToastProvider>
  );
}

function LibraryPage() {
  return <PhotoListPage mode="library" />;
}

function CuratePage() {
  return <PhotoListPage mode="curate" />;
}

function TrashPage() {
  return <PhotoListPage mode="trash" />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

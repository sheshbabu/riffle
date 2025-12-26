import './assets/reset.css';
import './assets/index.css';
import Router from './commons/components/Router.jsx';
import Route from './commons/components/Route.jsx';
import Sidebar from './commons/components/Sidebar.jsx';
import ImportPage from './features/ingest/ImportPage.jsx';
import PhotoListPage from './features/photos/PhotoListPage.jsx';

function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Router>
          <Route path="/" component={ImportPage} />
          <Route path="/import" component={ImportPage} />
          <Route path="/curate" component={CuratePage} />
          <Route path="/library" component={LibraryPage} />
          <Route path="/trash" component={TrashPage} />
        </Router>
      </div>
    </div>
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

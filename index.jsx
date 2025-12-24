import './assets/reset.css';
import './assets/index.css';
import Router from './commons/components/Router.jsx';
import Route from './commons/components/Route.jsx';
import Sidebar from './commons/components/Sidebar.jsx';
import ImportPage from './features/ingest/ImportPage.jsx';
import PhotosPage from './features/photos/PhotosPage.jsx';
import CuratePage from './features/photos/CuratePage.jsx';
import TrashPage from './features/photos/TrashPage.jsx';

function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Router>
          <Route path="/" component={ImportPage} />
          <Route path="/import" component={ImportPage} />
          <Route path="/curate" component={CuratePage} />
          <Route path="/library" component={PhotosPage} />
          <Route path="/trash" component={TrashPage} />
        </Router>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

import './assets/reset.css';
import './assets/index.css';
import Router from './commons/components/Router.jsx';
import Route from './commons/components/Route.jsx';
import Sidebar from './commons/components/Sidebar.jsx';
import ImportPage from './features/ingest/ImportPage.jsx';
import PhotosPage from './features/photos/PhotosPage.jsx';

function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Router>
          <Route path="/" component={ImportPage} />
          <Route path="/import" component={ImportPage} />
          <Route path="/library" component={PhotosPage} />
        </Router>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

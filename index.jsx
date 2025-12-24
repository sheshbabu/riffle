import './assets/reset.css';
import './assets/index.css';
import Router from './commons/components/Router.jsx';
import Route from './commons/components/Route.jsx';
import Sidebar from './commons/components/Sidebar.jsx';
import InboxPage from './features/inbox/InboxPage.jsx';
import PhotosPage from './features/photos/PhotosPage.jsx';

function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Router>
          <Route path="/" component={InboxPage} />
          <Route path="/inbox" component={InboxPage} />
          <Route path="/photos" component={PhotosPage} />
        </Router>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

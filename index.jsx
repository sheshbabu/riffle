import './assets/reset.css';
import './assets/index.css';
import Button from './commons/components/Button.jsx';

const { useState } = React;

function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>React Test</h1>
      <p>Count: {count}</p>
      <Button className='primary' onClick={() => setCount(count + 1)}>
        Increment
      </Button>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

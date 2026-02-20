import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    fetch('/api/hello')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('Failed to connect to server'));
  }, []);

  return (
    <div className="app">
      <h1>Nimbus Home Cloud</h1>
      <p className="message">{message}</p>
    </div>
  );
}

export default App;

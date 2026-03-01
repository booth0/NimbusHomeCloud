import { useState, useEffect } from 'react';
import './App.css';
import AuthForm from './components/AuthForm';
import AdminPage from './components/AdminPage';

function App() {
  const [user, setUser] = useState(null); // null = loading, false = logged out, {...} = logged in
  const [page, setPage] = useState('dashboard'); // 'dashboard' | 'admin'

  useEffect(() => {
    const token = localStorage.getItem('nimbus_token');
    if (!token) {
      setUser(false);
      return;
    }
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('nimbus_token');
        setUser(false);
      });
  }, []);

  function handleAuthSuccess(loggedInUser) {
    setUser(loggedInUser);
  }

  function handleSignOut() {
    localStorage.removeItem('nimbus_token');
    setUser(false);
    setPage('dashboard');
  }

  if (user === null) {
    return (
      <div className="app">
        <p className="message">Loading…</p>
      </div>
    );
  }

  if (user === false) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  if (page === 'admin') {
    return <AdminPage onBack={() => setPage('dashboard')} />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Nimbus Home Cloud</h1>
        <div className="dashboard-actions">
          <span className={`role-badge role-${user.role}`}>{user.role}</span>
          <span className="username">Welcome, {user.username}</span>
          {user.role === 'admin' && (
            <button className="btn-admin" onClick={() => setPage('admin')}>
              Admin Panel
            </button>
          )}
          <button className="btn-logout" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>
      <p className="message">You are signed in.</p>
    </div>
  );
}

export default App;

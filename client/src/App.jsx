import { useState, useEffect } from 'react';
import './App.css';
import AuthForm from './components/AuthForm';
import AdminPage from './components/AdminPage';
import FileManager from './components/FileManager';
import SharedWithMe from './components/SharedWithMe';
import SharePreview from './components/SharePreview';
import CollectionsPage from './components/CollectionsPage';

const shareToken = window.location.pathname.startsWith('/share/')
  ? window.location.pathname.slice('/share/'.length)
  : null;

function App() {
  const [user, setUser] = useState(null); // null = loading, false = logged out, {...} = logged in
  const [page, setPage] = useState('dashboard'); // 'dashboard' | 'shared' | 'admin'

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

  if (shareToken) return <SharePreview token={shareToken} />;

  if (user === null) {
    return (
      <div className="app">
        <p className="message">Loading…</p>
      </div>
    );
  }

  if (user === false) {
    return (
      <div className="auth-page">
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      </div>
    );
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
          <button
            className={`btn-nav${page === 'dashboard' ? ' btn-nav--active' : ''}`}
            onClick={() => setPage('dashboard')}
          >
            My Files
          </button>
          <button
            className={`btn-nav${page === 'collections' ? ' btn-nav--active' : ''}`}
            onClick={() => setPage('collections')}
          >
            My Collections
          </button>
          <button
            className={`btn-nav${page === 'shared' ? ' btn-nav--active' : ''}`}
            onClick={() => setPage('shared')}
          >
            Shared with Me
          </button>
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
      {page === 'dashboard'   && <FileManager user={user} />}
      {page === 'collections' && <CollectionsPage user={user} />}
      {page === 'shared'      && <SharedWithMe />}
    </div>
  );
}

export default App;

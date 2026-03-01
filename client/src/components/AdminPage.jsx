import { useState, useEffect } from 'react';

export default function AdminPage({ onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('nimbus_token');
    fetch('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((json) => setData(json))
      .catch((status) => {
        if (status === 403) {
          setError('Access denied — admins only.');
        } else {
          setError('Failed to load admin data.');
        }
      });
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Admin Panel</h1>
        <button className="btn-logout" onClick={onBack}>
          ← Back
        </button>
      </div>

      {error && <p className="auth-error">{error}</p>}

      {data && (
        <div className="admin-card">
          <div className="admin-row">
            <span className="admin-label">Message</span>
            <span>{data.message}</span>
          </div>
          <div className="admin-row">
            <span className="admin-label">Admin user ID</span>
            <span className="admin-mono">{data.adminUser}</span>
          </div>
          <div className="admin-row">
            <span className="admin-label">Server time</span>
            <span className="admin-mono">{data.serverTime}</span>
          </div>
        </div>
      )}

      {!data && !error && <p className="message">Loading…</p>}
    </div>
  );
}

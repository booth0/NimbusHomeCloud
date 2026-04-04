import { useState, useEffect } from 'react';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function currentUserId() {
  try {
    const token = localStorage.getItem('nimbus_token');
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
  } catch {
    return null;
  }
}

export default function AdminPage({ onBack }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionError, setActionError] = useState('');

  const myId = currentUserId();
  const token = localStorage.getItem('nimbus_token');

  useEffect(() => {
    fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(({ users }) => setUsers(users))
      .catch((status) => {
        setError(status === 403 ? 'Access denied — admins only.' : 'Failed to load users.');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleChange(userId, newRole) {
    setActionError('');
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    if (!res.ok) return setActionError(data.error || 'Failed to update role.');
    setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
  }

  async function handleDelete(userId) {
    setActionError('');
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return setActionError(data.error || 'Failed to delete user.');
    setUsers((prev) => prev.filter((u) => u._id !== userId));
    setConfirmDelete(null);
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Admin Panel</h1>
        <button className="btn-logout" onClick={onBack}>← Back</button>
      </div>

      {error && <p className="auth-error">{error}</p>}
      {actionError && <p className="auth-error" style={{ marginBottom: '1rem' }}>{actionError}</p>}
      {loading && <p className="message">Loading…</p>}

      {!loading && !error && (
        <table className="file-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Storage Used</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.username}</td>
                <td style={{ color: '#a0a8b8' }}>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                    {user.role}
                  </span>
                </td>
                <td style={{ color: '#a0a8b8' }}>{formatBytes(user.storageUsed)}</td>
                <td style={{ color: '#a0a8b8', whiteSpace: 'nowrap' }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td>
                  {user._id !== myId && (
                    <div className="file-actions">
                      {user.role === 'user' ? (
                        <button
                          className="btn-file-action btn-share"
                          onClick={() => handleRoleChange(user._id, 'admin')}
                        >
                          Promote
                        </button>
                      ) : (
                        <button
                          className="btn-file-action btn-download"
                          onClick={() => handleRoleChange(user._id, 'user')}
                        >
                          Demote
                        </button>
                      )}
                      {confirmDelete === user._id ? (
                        <>
                          <button
                            className="btn-file-action btn-delete"
                            onClick={() => handleDelete(user._id)}
                          >
                            Confirm
                          </button>
                          <button
                            className="btn-file-action"
                            style={{ background: '#23273a', color: '#a0a8b8' }}
                            onClick={() => setConfirmDelete(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn-file-action btn-delete"
                          onClick={() => { setConfirmDelete(user._id); setActionError(''); }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';

export default function CollectionShareModal({ collection, onClose }) {
  const [allUsers, setAllUsers]     = useState([]);
  const [members, setMembers]       = useState([]); // [{ user: { _id, username }, role }]
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);

  // New users being added: Map<userId, role>
  const [selected, setSelected]     = useState(new Map());
  // Role changes for existing members: Map<userId, newRole>
  const [roleChanges, setRoleChanges] = useState(new Map());

  const token = () => localStorage.getItem('nimbus_token');

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, membersRes] = await Promise.all([
          fetch('/api/auth/users', { headers: { Authorization: `Bearer ${token()}` } }),
          fetch(`/api/collections/${collection._id}/members`, { headers: { Authorization: `Bearer ${token()}` } }),
        ]);
        const usersData   = await usersRes.json();
        const membersData = await membersRes.json();
        if (usersRes.ok)   setAllUsers(usersData.users);
        if (membersRes.ok) setMembers(membersData.members);
      } catch { setError('Failed to load'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  function toggleUser(userId) {
    setSelected(prev => {
      const next = new Map(prev);
      next.has(userId) ? next.delete(userId) : next.set(userId, 'viewer');
      return next;
    });
  }

  function setNewRole(userId, role) {
    setSelected(prev => new Map(prev).set(userId, role));
  }

  function setExistingRole(userId, role) {
    setRoleChanges(prev => new Map(prev).set(userId, role));
  }

  async function handleRevoke(userId) {
    setError('');
    try {
      const res = await fetch(`/api/collections/${collection._id}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return setError('Failed to revoke access');
      setMembers(prev => prev.filter(m => m.user._id !== userId));
      setRoleChanges(prev => { const next = new Map(prev); next.delete(userId); return next; });
    } catch { setError('Failed to revoke access'); }
  }

  async function handleSave() {
    if (selected.size === 0 && roleChanges.size === 0) return;
    setSaving(true); setError('');
    try {
      for (const [userId, role] of [...roleChanges, ...selected]) {
        const res = await fetch(`/api/collections/${collection._id}/members`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, role }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Failed to save changes'); return; }
      }
      // Refresh members list
      const membersRes = await fetch(`/api/collections/${collection._id}/members`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const membersData = await membersRes.json();
      if (membersRes.ok) setMembers(membersData.members);
      setSelected(new Map());
      setRoleChanges(new Map());
    } catch { setError('Failed to save changes'); }
    finally { setSaving(false); }
  }

  const memberIds   = new Set(members.map(m => m.user._id));
  const nonMembers  = allUsers.filter(u => !memberIds.has(u._id));
  const hasChanges  = selected.size > 0 || roleChanges.size > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="fpm-close" onClick={onClose} title="Close">✕</button>
        <div className="modal-header">
          <h2>Share Collection</h2>
          <p className="modal-filename">{collection.name}</p>
        </div>

        {loading ? (
          <p className="file-empty">Loading…</p>
        ) : (
          <>
            {/* Existing members */}
            {members.length > 0 && (
              <div className="modal-section">
                <label className="modal-label">Current Members</label>
                <ul className="share-list">
                  {members.map(m => (
                    <li key={m.user._id} className="share-list-item">
                      <span className="share-user-name">{m.user.username}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          className="csm-role-select"
                          value={roleChanges.get(m.user._id) ?? m.role}
                          onChange={e => setExistingRole(m.user._id, e.target.value)}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button className="btn-revoke" onClick={() => handleRevoke(m.user._id)}>Revoke</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Add new members */}
            {nonMembers.length > 0 ? (
              <div className="modal-section">
                <label className="modal-label">Add Members</label>
                <div style={{ maxHeight: '30vh', overflowY: 'auto' }}>
                  <ul className="share-list">
                    {nonMembers.map(u => {
                      const isSelected = selected.has(u._id);
                      return (
                        <li key={u._id} className="share-list-item">
                          <label className="share-user-label">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleUser(u._id)}
                            />
                            <span className="share-user-name">{u.username}</span>
                          </label>
                          {isSelected && (
                            <select
                              className="csm-role-select"
                              value={selected.get(u._id)}
                              onChange={e => setNewRole(u._id, e.target.value)}
                            >
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                            </select>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ) : members.length === 0 ? (
              <p className="file-empty">No other users on this server.</p>
            ) : null}
          </>
        )}

        {error && <p className="file-error">{error}</p>}

        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

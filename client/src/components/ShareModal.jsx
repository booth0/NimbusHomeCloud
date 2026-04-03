import { useState, useEffect } from 'react';

const EXPIRY_OPTIONS = [
  { label: '1 Hour',   value: '1h' },
  { label: '24 Hours', value: '24h' },
  { label: '7 Days',   value: '7d' },
  { label: '30 Days',  value: '30d' },
];

export default function ShareModal({ file, files, onClose }) {
  const fileList = files ?? (file ? [file] : []);
  const isMulti  = fileList.length > 1;

  const [tab, setTab] = useState(isMulti ? 'users' : 'link'); // 'link' | 'users'

  // ── Link tab state ──────────────────────────────
  const [expiresIn, setExpiresIn]         = useState('24h');
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied]               = useState(false);
  const [activeShares, setActiveShares]   = useState([]);
  const [linkLoading, setLinkLoading]     = useState(false);
  const [linkError, setLinkError]         = useState('');

  // ── Users tab state ─────────────────────────────
  const [allUsers, setAllUsers]           = useState([]);
  const [sharedWith, setSharedWith]       = useState([]); // user IDs already shared
  const [selected, setSelected]           = useState(new Set());
  const [usersLoading, setUsersLoading]   = useState(false);
  const [usersError, setUsersError]       = useState('');

  const token = () => localStorage.getItem('nimbus_token');

  // Use the first file for single-file operations
  const primaryFile = fileList[0];

  useEffect(() => {
    if (!isMulti) loadShares();
    loadUsers();
  }, []);

  // ── Link tab functions ──────────────────────────

  async function loadShares() {
    try {
      const res = await fetch(`/api/files/${primaryFile._id}/shares`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (res.ok) setActiveShares(data.shares);
    } catch { /* non-fatal */ }
  }

  async function handleGenerate() {
    setLinkLoading(true);
    setLinkError('');
    setGeneratedLink(null);
    try {
      const res = await fetch(`/api/files/${primaryFile._id}/share`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn }),
      });
      const data = await res.json();
      if (!res.ok) return setLinkError(data.error || 'Failed to generate link');
      setGeneratedLink(data.shareUrl);
      await loadShares();
    } catch {
      setLinkError('Failed to generate link');
    } finally {
      setLinkLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setLinkError('Could not copy to clipboard');
    }
  }

  async function handleRevoke(linkId) {
    try {
      const res = await fetch(`/api/files/${primaryFile._id}/shares/${linkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return setLinkError('Failed to revoke link');
      setActiveShares(prev => prev.filter(s => s._id !== linkId));
      if (generatedLink) setGeneratedLink(null);
    } catch {
      setLinkError('Failed to revoke link');
    }
  }

  // ── Users tab functions ─────────────────────────

  async function loadUsers() {
    try {
      if (isMulti) {
        const usersRes = await fetch('/api/auth/users', { headers: { Authorization: `Bearer ${token()}` } });
        const usersData = await usersRes.json();
        if (usersRes.ok) setAllUsers(usersData.users);
      } else {
        const [usersRes, sharedRes] = await Promise.all([
          fetch('/api/auth/users', { headers: { Authorization: `Bearer ${token()}` } }),
          fetch(`/api/files/${primaryFile._id}/shared-with`, { headers: { Authorization: `Bearer ${token()}` } }),
        ]);
        const usersData  = await usersRes.json();
        const sharedData = await sharedRes.json();
        if (usersRes.ok)  setAllUsers(usersData.users);
        if (sharedRes.ok) setSharedWith(sharedData.sharedWith.map(u => u._id));
      }
    } catch { /* non-fatal */ }
  }

  function toggleUser(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleShareWithUsers() {
    if (selected.size === 0) return;
    setUsersLoading(true);
    setUsersError('');
    try {
      for (const f of fileList) {
        const res = await fetch(`/api/files/${f._id}/share-with`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: [...selected] }),
        });
        const data = await res.json();
        if (!res.ok) { setUsersError(data.error || 'Failed to share'); return; }
      }
      setSharedWith(prev => [...new Set([...prev, ...selected])]);
      setSelected(new Set());
    } catch {
      setUsersError('Failed to share with users');
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleRevokeUser(userId) {
    try {
      const res = await fetch(`/api/files/${primaryFile._id}/shared-with/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return setUsersError('Failed to revoke access');
      setSharedWith(prev => prev.filter(id => id !== userId));
    } catch {
      setUsersError('Failed to revoke access');
    }
  }

  // ── Render ──────────────────────────────────────

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="fpm-close" onClick={onClose} title="Close">✕</button>
        <div className="modal-header">
          <h2>Share {isMulti ? `${fileList.length} Files` : 'File'}</h2>
          <p className="modal-filename">{isMulti ? `${fileList.length} files selected` : primaryFile.originalName}</p>
        </div>

        {!isMulti && (
          <div className="modal-tabs">
            <button
              className={`modal-tab${tab === 'link' ? ' modal-tab--active' : ''}`}
              onClick={() => setTab('link')}
            >
              Link
            </button>
            <button
              className={`modal-tab${tab === 'users' ? ' modal-tab--active' : ''}`}
              onClick={() => setTab('users')}
            >
              Users
            </button>
          </div>
        )}

        {tab === 'link' && (
          <>
            <div className="modal-section">
              <label className="modal-label">Link expires in</label>
              <div className="expiry-picker">
                {EXPIRY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`expiry-btn${expiresIn === opt.value ? ' expiry-btn--active' : ''}`}
                    onClick={() => setExpiresIn(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn-primary" onClick={handleGenerate} disabled={linkLoading}>
              {linkLoading ? 'Generating…' : 'Generate Link'}
            </button>

            {linkError && <p className="file-error">{linkError}</p>}

            {generatedLink && (
              <div className="modal-section">
                <label className="modal-label">Share link</label>
                <div className="share-link-row">
                  <input className="share-link-input" readOnly value={generatedLink} />
                  <button className="btn-copy" onClick={handleCopy}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {activeShares.length > 0 && (
              <div className="modal-section">
                <label className="modal-label">Active links</label>
                <ul className="share-list">
                  {activeShares.map(s => (
                    <li key={s._id} className="share-list-item">
                      <span>Expires {new Date(s.expiresAt).toLocaleDateString()}</span>
                      <button className="btn-revoke" onClick={() => handleRevoke(s._id)}>Revoke</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {tab === 'users' && (
          <>
            {allUsers.length === 0 ? (
              <p className="file-empty">No other users on this server.</p>
            ) : (
              <div className="modal-section">
                <label className="modal-label">Select users to share with</label>
                <ul className="share-list">
                  {allUsers.map(u => {
                    const alreadyShared = sharedWith.includes(u._id);
                    return (
                      <li key={u._id} className="share-list-item">
                        {alreadyShared ? (
                          <>
                            <span className="share-user-name">{u.username} <span className="share-user-badge">shared</span></span>
                            <button className="btn-revoke" onClick={() => handleRevokeUser(u._id)}>Revoke</button>
                          </>
                        ) : (
                          <>
                            <label className="share-user-label">
                              <input
                                type="checkbox"
                                checked={selected.has(u._id)}
                                onChange={() => toggleUser(u._id)}
                              />
                              <span className="share-user-name">{u.username}</span>
                            </label>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {usersError && <p className="file-error">{usersError}</p>}

            <button
              className="btn-primary"
              onClick={handleShareWithUsers}
              disabled={usersLoading || selected.size === 0}
            >
              {usersLoading ? 'Sharing…' : `Share with ${selected.size > 0 ? selected.size : ''} User${selected.size === 1 ? '' : 's'}`}
            </button>
          </>
        )}

      </div>
    </div>
  );
}

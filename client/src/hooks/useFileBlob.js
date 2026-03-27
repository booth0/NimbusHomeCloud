import { useState, useEffect } from 'react';

// Module-level cache — persists across renders, cleared only on page reload
const cache = new Map();

export default function useFileBlob(fileId, token) {
  const [blobUrl, setBlobUrl] = useState(() => cache.get(fileId) || null);
  const [loading, setLoading] = useState(!cache.has(fileId));
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!fileId || !token) return;
    if (cache.has(fileId)) {
      setBlobUrl(cache.get(fileId));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/files/${fileId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('Fetch failed');
        return res.blob();
      })
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        cache.set(fileId, url);
        setBlobUrl(url);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [fileId, token]);

  return { blobUrl, loading, error };
}

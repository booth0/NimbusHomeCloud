import { useState, useEffect, useRef } from 'react';
import useFileBlob from '../hooks/useFileBlob.js';

function CollectionQuadrant({ fileId, collectionId, token, isVisible }) {
  const { blobUrl } = useFileBlob(
    isVisible && fileId ? fileId : null,
    token,
    `/api/collections/${collectionId}/files`
  );
  return (
    <div className="col-thumb-quadrant">
      {blobUrl && (
        <img
          src={blobUrl}
          alt=""
          className="col-thumb-img"
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}
    </div>
  );
}

function CollectionCell({ collection, isOwner, onOpen, onDownload, onShare, onDelete }) {
  const [isVisible, setIsVisible] = useState(false);
  const cellRef = useRef(null);
  const token = localStorage.getItem('nimbus_token');

  useEffect(() => {
    const el = cellRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Always provide exactly 4 slots (null = empty placeholder)
  const quadrantIds = [...collection.fileIds.slice(0, 4)];
  while (quadrantIds.length < 4) quadrantIds.push(null);

  return (
    <div ref={cellRef} className="col-cell" onClick={() => onOpen(collection)}>
      <div className="col-thumb">
        {quadrantIds.map((id, i) => (
          <CollectionQuadrant
            key={i}
            fileId={id}
            collectionId={collection._id}
            token={token}
            isVisible={isVisible}
          />
        ))}
      </div>
      <div className="col-title">{collection.name}</div>
      <div className="col-overlay">
        {onDownload && (
          <button
            className="fpi-action-btn"
            title="Download"
            onClick={e => { e.stopPropagation(); onDownload(collection); }}
          >⬇</button>
        )}
        {onShare && isOwner && (
          <button
            className="fpi-action-btn"
            title="Share"
            onClick={e => { e.stopPropagation(); onShare(collection); }}
          >🔗</button>
        )}
        {onDelete && isOwner && (
          <button
            className="fpi-action-btn fpi-action-btn--delete"
            title="Delete"
            onClick={e => { e.stopPropagation(); onDelete(collection); }}
          >🗑</button>
        )}
      </div>
    </div>
  );
}

const SIZE_PX = { small: 120, medium: 180, large: 280 };

export default function CollectionGridView({ collections, user, onOpen, onDownload, onShare, onDelete, viewSize = 'medium' }) {
  if (collections.length === 0) {
    return <p className="file-empty">No collections yet.</p>;
  }
  const cellSize = SIZE_PX[viewSize] ?? 180;
  return (
    <div
      className="col-grid"
      data-size={viewSize}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cellSize}px, 1fr))` }}
    >
      {collections.map(c => (
        <CollectionCell
          key={c._id}
          collection={c}
          isOwner={c.owner._id === user._id}
          onOpen={onOpen}
          onDownload={onDownload}
          onShare={onShare}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

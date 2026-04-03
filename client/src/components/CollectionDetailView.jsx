export default function CollectionDetailView({ collections, user, onOpen, onDownload, onShare, onDelete }) {
  if (collections.length === 0) {
    return <p className="file-empty">No collections yet.</p>;
  }

  return (
    <>
      {/* Desktop table */}
      <table className="fdt-table">
        <thead>
          <tr>
            <th>Collection</th>
            <th>Owner</th>
            <th>Files</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {collections.map(c => {
            const isOwner = c.owner._id === user._id;
            return (
              <tr key={c._id}>
                <td
                  className="fdt-name"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onOpen(c)}
                  title={c.name}
                >{c.name}</td>
                <td className="fdt-type">{c.owner.username}</td>
                <td className="fdt-size">{c.fileCount}</td>
                <td className="fdt-actions">
                  {onDownload && <button className="btn-file-action btn-download" onClick={() => onDownload(c)}>Download</button>}
                  {onShare && isOwner && <button className="btn-file-action btn-share" onClick={() => onShare(c)}>Share</button>}
                  {onDelete && isOwner && <button className="btn-file-action btn-delete" onClick={() => onDelete(c)}>Delete</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="fdt-cards">
        {collections.map(c => {
          const isOwner = c.owner._id === user._id;
          return (
            <div key={c._id} className="fdt-card">
              <div
                className="fdt-card-name"
                style={{ cursor: 'pointer' }}
                onClick={() => onOpen(c)}
              >{c.name}</div>
              <div className="fdt-card-meta">
                <span>Owner: {c.owner.username}</span>
                <span>{c.fileCount} file{c.fileCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="fdt-card-actions">
                {onDownload && <button className="btn-file-action btn-download" onClick={() => onDownload(c)}>Download</button>}
                {onShare && isOwner && <button className="btn-file-action btn-share" onClick={() => onShare(c)}>Share</button>}
                {onDelete && isOwner && <button className="btn-file-action btn-delete" onClick={() => onDelete(c)}>Delete</button>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

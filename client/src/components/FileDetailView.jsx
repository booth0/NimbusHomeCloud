import { getExtension } from '../utils/fileUtils.js';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function FileDate({ file }) {
  if (file.dateTaken) {
    return (
      <span title="Date Taken">
        {new Date(file.dateTaken).toLocaleDateString()}
        <span className="fdt-date-label"> (taken)</span>
      </span>
    );
  }
  return (
    <span title="Upload Date">
      {new Date(file.createdAt).toLocaleDateString()}
      <span className="fdt-date-label"> (uploaded)</span>
    </span>
  );
}

export default function FileDetailView({ files, onDownload, onShare, onDelete }) {
  if (files.length === 0) {
    return <p className="file-empty">No files match the current filter.</p>;
  }

  return (
    <>
      {/* Desktop table */}
      <table className="fdt-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Size</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map(f => (
            <tr key={f._id}>
              <td className="fdt-name" title={f.originalName}>{f.originalName}</td>
              <td className="fdt-type">{getExtension(f).toUpperCase()}</td>
              <td className="fdt-size">{formatSize(f.size)}</td>
              <td className="fdt-date"><FileDate file={f} /></td>
              <td className="fdt-actions">
                <button className="btn-file-action btn-download" onClick={() => onDownload(f)}>Download</button>
                <button className="btn-file-action btn-share"    onClick={() => onShare(f)}>Share</button>
                <button className="btn-file-action btn-delete"   onClick={() => onDelete(f._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="fdt-cards">
        {files.map(f => (
          <div key={f._id} className="fdt-card">
            <div className="fdt-card-name" title={f.originalName}>{f.originalName}</div>
            <div className="fdt-card-meta">
              <span>{getExtension(f).toUpperCase()}</span>
              <span>{formatSize(f.size)}</span>
              <span><FileDate file={f} /></span>
            </div>
            <div className="fdt-card-actions">
              <button className="btn-file-action btn-download" onClick={() => onDownload(f)}>Download</button>
              <button className="btn-file-action btn-share"    onClick={() => onShare(f)}>Share</button>
              <button className="btn-file-action btn-delete"   onClick={() => onDelete(f._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

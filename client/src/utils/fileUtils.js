export function getExtension(file) {
  const parts = file.originalName.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : 'unknown';
}

export function isMedia(file) {
  return file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
}

export function isImage(file) {
  return file.mimetype.startsWith('image/');
}

export function isVideo(file) {
  return file.mimetype.startsWith('video/');
}

export function isPreviewable(file) {
  return (
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('audio/') ||
    file.mimetype === 'application/pdf' ||
    file.mimetype.startsWith('text/')
  );
}

export function getAvailableTypes(files) {
  const types = new Set(files.map(f => getExtension(f)));
  return [...types].sort();
}

export function filterFiles(files, filter) {
  if (filter.mode === 'media') return files.filter(isMedia);
  if (filter.mode === 'non-media') return files.filter(f => !isMedia(f));
  // 'all' or legacy 'byType' — apply selectedTypes if any are chosen
  if (filter.selectedTypes.length > 0)
    return files.filter(f => filter.selectedTypes.includes(getExtension(f)));
  return files;
}

export function sortFiles(files, sort) {
  const sorted = [...files].sort((a, b) => {
    if (sort.by === 'date') {
      return new Date(a.dateTaken || a.createdAt) - new Date(b.dateTaken || b.createdAt);
    }
    if (sort.by === 'uploaded') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
    // 'name'
    return a.originalName.localeCompare(b.originalName, undefined, { numeric: true });
  });
  return sort.direction === 'desc' ? sorted.reverse() : sorted;
}

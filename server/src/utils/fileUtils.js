export function isPreviewable(mimetype) {
  return (
    mimetype.startsWith('image/') ||
    mimetype.startsWith('video/') ||
    mimetype.startsWith('audio/') ||
    mimetype === 'application/pdf' ||
    mimetype.startsWith('text/')
  );
}

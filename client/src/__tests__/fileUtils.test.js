import { describe, it, expect } from 'vitest';
import {
  getExtension,
  isMedia,
  isPreviewable,
  getAvailableTypes,
  filterFiles,
  sortFiles,
} from '../utils/fileUtils.js';

// Builds a minimal mock file object
function f(originalName, mimetype, overrides = {}) {
  return { originalName, mimetype, createdAt: '2024-01-01T00:00:00Z', size: 1000, ...overrides };
}

// ── getExtension ──────────────────────────────────────────────────────────────

describe('getExtension', () => {
  it('returns the extension in lowercase', () => {
    expect(getExtension(f('photo.JPG', 'image/jpeg'))).toBe('jpg');
    expect(getExtension(f('report.PDF', 'application/pdf'))).toBe('pdf');
    expect(getExtension(f('archive.TAR.GZ', 'application/gzip'))).toBe('gz');
  });

  it('returns "unknown" when there is no extension', () => {
    expect(getExtension(f('README', 'text/plain'))).toBe('unknown');
  });
});

// ── isMedia ───────────────────────────────────────────────────────────────────

describe('isMedia', () => {
  it('returns true for images and videos', () => {
    expect(isMedia(f('img.jpg', 'image/jpeg'))).toBe(true);
    expect(isMedia(f('img.png', 'image/png'))).toBe(true);
    expect(isMedia(f('vid.mp4', 'video/mp4'))).toBe(true);
    expect(isMedia(f('vid.mov', 'video/quicktime'))).toBe(true);
  });

  it('returns false for audio, PDF, and text', () => {
    expect(isMedia(f('song.mp3', 'audio/mpeg'))).toBe(false);
    expect(isMedia(f('doc.pdf', 'application/pdf'))).toBe(false);
    expect(isMedia(f('notes.txt', 'text/plain'))).toBe(false);
  });
});

// ── isPreviewable ─────────────────────────────────────────────────────────────

describe('isPreviewable', () => {
  it('returns true for images, videos, audio, PDFs, and text', () => {
    expect(isPreviewable(f('img.jpg',   'image/jpeg'))).toBe(true);
    expect(isPreviewable(f('vid.mp4',   'video/mp4'))).toBe(true);
    expect(isPreviewable(f('song.mp3',  'audio/mpeg'))).toBe(true);
    expect(isPreviewable(f('doc.pdf',   'application/pdf'))).toBe(true);
    expect(isPreviewable(f('notes.txt', 'text/plain'))).toBe(true);
  });

  it('returns false for non-previewable types', () => {
    expect(isPreviewable(f('archive.zip', 'application/zip'))).toBe(false);
    expect(isPreviewable(f('word.docx',   'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))).toBe(false);
    expect(isPreviewable(f('data.bin',    'application/octet-stream'))).toBe(false);
  });
});

// ── getAvailableTypes ─────────────────────────────────────────────────────────

describe('getAvailableTypes', () => {
  it('returns a sorted, deduplicated list of extensions', () => {
    const files = [
      f('a.jpg', 'image/jpeg'),
      f('b.jpg', 'image/jpeg'),
      f('c.pdf', 'application/pdf'),
      f('d.mp4', 'video/mp4'),
    ];
    expect(getAvailableTypes(files)).toEqual(['jpg', 'mp4', 'pdf']);
  });

  it('returns an empty array for an empty file list', () => {
    expect(getAvailableTypes([])).toEqual([]);
  });
});

// ── filterFiles ───────────────────────────────────────────────────────────────

describe('filterFiles', () => {
  const files = [
    f('photo.jpg', 'image/jpeg'),
    f('video.mp4', 'video/mp4'),
    f('doc.pdf',   'application/pdf'),
    f('notes.txt', 'text/plain'),
  ];

  it('mode "media" returns only images and videos', () => {
    const result = filterFiles(files, { mode: 'media', selectedTypes: [] });
    expect(result).toHaveLength(2);
    expect(result.every(file => file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/'))).toBe(true);
  });

  it('mode "non-media" excludes images and videos', () => {
    const result = filterFiles(files, { mode: 'non-media', selectedTypes: [] });
    expect(result).toHaveLength(2);
    expect(result.every(file => !file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/'))).toBe(true);
  });

  it('mode "all" with no selectedTypes returns all files', () => {
    expect(filterFiles(files, { mode: 'all', selectedTypes: [] })).toHaveLength(4);
  });

  it('mode "all" with selectedTypes filters by extension', () => {
    const result = filterFiles(files, { mode: 'all', selectedTypes: ['pdf', 'txt'] });
    expect(result).toHaveLength(2);
    expect(result.map(file => getExtension(file)).sort()).toEqual(['pdf', 'txt']);
  });
});

// ── sortFiles ─────────────────────────────────────────────────────────────────

describe('sortFiles', () => {
  const files = [
    f('banana.jpg', 'image/jpeg', { createdAt: '2024-01-02T00:00:00Z', dateTaken: '2024-01-02T00:00:00Z' }),
    f('apple.jpg',  'image/jpeg', { createdAt: '2024-01-01T00:00:00Z', dateTaken: '2024-01-01T00:00:00Z' }),
    f('cherry.jpg', 'image/jpeg', { createdAt: '2024-01-03T00:00:00Z', dateTaken: '2024-01-03T00:00:00Z' }),
  ];

  it('sorts by name A → Z', () => {
    const result = sortFiles(files, { by: 'name', direction: 'asc' });
    expect(result.map(file => file.originalName)).toEqual(['apple.jpg', 'banana.jpg', 'cherry.jpg']);
  });

  it('sorts by name Z → A', () => {
    const result = sortFiles(files, { by: 'name', direction: 'desc' });
    expect(result.map(file => file.originalName)).toEqual(['cherry.jpg', 'banana.jpg', 'apple.jpg']);
  });

  it('sorts by date taken, newest first', () => {
    const result = sortFiles(files, { by: 'date', direction: 'desc' });
    expect(result[0].originalName).toBe('cherry.jpg');
    expect(result[2].originalName).toBe('apple.jpg');
  });

  it('sorts by date taken, oldest first', () => {
    const result = sortFiles(files, { by: 'date', direction: 'asc' });
    expect(result[0].originalName).toBe('apple.jpg');
    expect(result[2].originalName).toBe('cherry.jpg');
  });

  it('sorts by upload date (createdAt)', () => {
    const result = sortFiles(files, { by: 'uploaded', direction: 'asc' });
    expect(result[0].originalName).toBe('apple.jpg');
  });
});

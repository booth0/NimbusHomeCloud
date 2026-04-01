import { Router } from 'express';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UserShare } from '../models/UserShare.js';
import { File } from '../models/File.js';
import { requireAuth } from '../middleware/auth.js';
import { decryptBuffer } from '../utils/encryption.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_BASE = path.resolve(__dirname, '../../uploads');

const router = Router();

// GET /api/shared-with-me
router.get('/', requireAuth, async (req, res) => {
  try {
    const shares = await UserShare.find({ sharedWith: req.user.userId })
      .populate('sharedBy', 'username')
      .populate('fileId')
      .sort({ createdAt: -1 });

    // Filter out entries where the file has since been deleted
    const active = shares.filter(s => s.fileId !== null);

    res.json({
      shared: active.map(s => ({
        _id: s._id,
        sharedBy: { username: s.sharedBy.username },
        file: {
          _id: s.fileId._id,
          originalName: s.fileId.originalName,
          size: s.fileId.size,
          mimetype: s.fileId.mimetype,
          createdAt: s.fileId.createdAt,
        },
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    console.error('Shared-with-me list error:', err);
    res.status(500).json({ error: 'Server error fetching shared files' });
  }
});

// GET /api/shared-with-me/:fileId/download
router.get('/:fileId/download', requireAuth, async (req, res) => {
  try {
    const share = await UserShare.findOne({
      fileId: req.params.fileId,
      sharedWith: req.user.userId,
    });
    if (!share) return res.status(403).json({ error: 'Access denied' });

    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const raw = await fs.promises.readFile(file.path);
    const output = file.encrypted
      ? decryptBuffer({ encrypted: raw, iv: file.iv, authTag: file.authTag })
      : raw;
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Length', output.length);
    res.send(output);
  } catch (err) {
    console.error('Shared download error:', err);
    res.status(500).json({ error: 'Server error downloading shared file' });
  }
});

// POST /api/shared-with-me/:fileId/copy
router.post('/:fileId/copy', requireAuth, async (req, res) => {
  try {
    const share = await UserShare.findOne({
      fileId: req.params.fileId,
      sharedWith: req.user.userId,
    });
    if (!share) return res.status(403).json({ error: 'Access denied' });

    const original = await File.findById(req.params.fileId);
    if (!original) return res.status(404).json({ error: 'File not found' });

    // Copy file on disk to the recipient's upload directory
    const ext = path.extname(original.filename);
    const newFilename = `${randomUUID()}${ext}`;
    const userDir = path.join(UPLOADS_BASE, req.user.userId.toString());
    fs.mkdirSync(userDir, { recursive: true });
    const newPath = path.join(userDir, newFilename);
    fs.copyFileSync(original.path, newPath);

    // Create a new File record owned by the recipient
    const copy = await File.create({
      filename: newFilename,
      originalName: original.originalName,
      owner: req.user.userId,
      size: original.size,
      mimetype: original.mimetype,
      path: newPath,
      encrypted: original.encrypted,
      iv: original.iv,
      authTag: original.authTag,
    });

    res.status(201).json({ file: copy });
  } catch (err) {
    console.error('Shared copy error:', err);
    res.status(500).json({ error: 'Server error copying shared file' });
  }
});

export default router;

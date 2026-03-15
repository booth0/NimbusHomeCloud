import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { File } from '../models/File.js';
import { ShareLink } from '../models/ShareLink.js';
import { requireAuth } from '../middleware/auth.js';

const ALLOWED_EXPIRY = { '1h': 1, '24h': 24, '7d': 168, '30d': 720 }; // values unused, just for validation
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_BASE = path.resolve(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(UPLOADS_BASE, req.user.userId.toString());
    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 1024 * 1024 * 1024 } }); // 1 GB limit

const router = Router();

// POST /api/files/upload
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const { originalname, filename, size, mimetype, path: filePath } = req.file;
    const file = await File.create({
      filename,
      originalName: originalname,
      owner: req.user.userId,
      size,
      mimetype,
      path: filePath,
    });
    res.status(201).json({ file });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Server error during upload' });
  }
});

// GET /api/files
router.get('/', requireAuth, async (req, res) => {
  try {
    const files = await File.find({ owner: req.user.userId }).sort({ createdAt: -1 });
    res.json({ files });
  } catch (err) {
    console.error('List error:', err);
    res.status(500).json({ error: 'Server error listing files' });
  }
});

// GET /api/files/:id/download
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.owner.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Access denied' });

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    res.sendFile(file.path);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Server error during download' });
  }
});

// POST /api/files/:id/share
router.post('/:id/share', requireAuth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.owner.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Access denied' });

    const { expiresIn } = req.body;
    if (!expiresIn || !Object.keys(ALLOWED_EXPIRY).includes(expiresIn))
      return res.status(400).json({ error: 'expiresIn must be one of: 1h, 24h, 7d, 30d' });

    const jti = randomUUID();
    const token = jwt.sign({ fileId: file._id, jti }, process.env.SHARE_JWT_SECRET, { expiresIn });
    const { exp } = jwt.decode(token);
    const expiresAt = new Date(exp * 1000);

    await ShareLink.create({
      fileId: file._id,
      jti,
      token,
      createdBy: req.user.userId,
      expiresAt,
      type: 'public',
    });

    res.status(201).json({
      shareUrl: `${CLIENT_ORIGIN}/share/${token}`,
      expiresAt,
    });
  } catch (err) {
    console.error('Share create error:', err);
    res.status(500).json({ error: 'Server error creating share link' });
  }
});

// GET /api/files/:id/shares
router.get('/:id/shares', requireAuth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.owner.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Access denied' });

    const shares = await ShareLink.find({ fileId: file._id, active: true }).sort({ createdAt: -1 });
    res.json({
      shares: shares.map(s => ({
        _id: s._id,
        shareUrl: `${CLIENT_ORIGIN}/share/${s.token}`,
        expiresAt: s.expiresAt,
        type: s.type,
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    console.error('Share list error:', err);
    res.status(500).json({ error: 'Server error listing share links' });
  }
});

// DELETE /api/files/:id/shares/:linkId
router.delete('/:id/shares/:linkId', requireAuth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.owner.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Access denied' });

    const link = await ShareLink.findById(req.params.linkId);
    if (!link || link.fileId.toString() !== req.params.id)
      return res.status(404).json({ error: 'Share link not found' });

    link.active = false;
    await link.save();
    res.json({ message: 'Share link revoked' });
  } catch (err) {
    console.error('Share revoke error:', err);
    res.status(500).json({ error: 'Server error revoking share link' });
  }
});

// DELETE /api/files/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.owner.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Access denied' });

    fs.unlinkSync(file.path);
    await file.deleteOne();
    res.json({ message: 'File deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Server error during delete' });
  }
});

export default router;

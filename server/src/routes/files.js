import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { File } from '../models/File.js';
import { requireAuth } from '../middleware/auth.js';

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

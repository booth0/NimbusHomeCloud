import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { ShareLink } from '../models/ShareLink.js';
import { File } from '../models/File.js';

const router = Router();

// GET /api/share/:token/info  — public, returns file metadata without streaming
router.get('/:token/info', async (req, res) => {
  try {
    let payload;
    try {
      payload = jwt.verify(req.params.token, process.env.SHARE_JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Share link is invalid or expired' });
    }

    const link = await ShareLink.findOne({ jti: payload.jti, active: true });
    if (!link) return res.status(403).json({ error: 'Share link has been revoked' });

    const file = await File.findById(payload.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    res.json({
      originalName: file.originalName,
      size: file.size,
      mimetype: file.mimetype,
      expiresAt: link.expiresAt,
    });
  } catch (err) {
    console.error('Share info error:', err);
    res.status(500).json({ error: 'Server error fetching share info' });
  }
});

// GET /api/share/:token  — public, no auth required
router.get('/:token', async (req, res) => {
  try {
    // 1. Verify JWT signature and expiry
    let payload;
    try {
      payload = jwt.verify(req.params.token, process.env.SHARE_JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Share link is invalid or expired' });
    }

    // 2. Check the link is still active in the DB
    const link = await ShareLink.findOne({ jti: payload.jti, active: true });
    if (!link) return res.status(403).json({ error: 'Share link has been revoked' });

    // 3. Fetch file metadata
    const file = await File.findById(payload.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    // 4. Stream file to client
    const previewable = /^(image|video|audio)\/.+$|^application\/pdf$|^text\/.+$/.test(file.mimetype);
    const disposition = previewable ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    res.sendFile(file.path);
  } catch (err) {
    console.error('Share access error:', err);
    res.status(500).json({ error: 'Server error accessing shared file' });
  }
});

export default router;

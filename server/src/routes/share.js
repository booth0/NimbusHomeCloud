import { Router } from 'express';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { ShareLink } from '../models/ShareLink.js';
import { File } from '../models/File.js';
import { decryptBuffer } from '../utils/encryption.js';
import { isPreviewable } from '../utils/fileUtils.js';

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

    // 4. Decrypt and send file
    const disposition = isPreviewable(file.mimetype) ? 'inline' : 'attachment';
    const raw = await fs.promises.readFile(file.path);
    const output = file.encrypted
      ? decryptBuffer({ encrypted: raw, iv: file.iv, authTag: file.authTag })
      : raw;
    res.setHeader('Content-Disposition', `${disposition}; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Length', output.length);
    res.send(output);
  } catch (err) {
    console.error('Share access error:', err);
    res.status(500).json({ error: 'Server error accessing shared file' });
  }
});

export default router;

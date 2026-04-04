import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import exifr from 'exifr';
import archiver from 'archiver';
import { File } from '../models/File.js';
import { ShareLink } from '../models/ShareLink.js';
import { UserShare } from '../models/UserShare.js';
import { Collection } from '../models/Collection.js';
import { requireAuth } from '../middleware/auth.js';
import { encryptBuffer, decryptBuffer } from '../utils/encryption.js';

const ALLOWED_EXPIRY = ['1h', '24h', '7d', '30d'];
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
router.post('/upload', requireAuth, upload.array('files', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: 'No files provided' });

    const uploadedFiles = [];
    for (const reqFile of req.files) {
      const { filename, size, mimetype, path: filePath } = reqFile;
      const originalname = path.basename(reqFile.originalname.replace(/\\/g, '/')) || 'file';

      let dateTaken;
      try {
        const exif = await exifr.parse(filePath, { pick: ['DateTimeOriginal', 'CreateDate', 'DateTime'] });
        dateTaken = exif?.DateTimeOriginal || exif?.CreateDate || exif?.DateTime;
      } catch (_) {}
      if (!dateTaken) {
        const clientMtime = req.body.lastModified ? new Date(parseInt(req.body.lastModified)) : null;
        dateTaken = (clientMtime && !isNaN(clientMtime)) ? clientMtime : (await fs.promises.stat(filePath)).mtime;
      }

      const plaintext = await fs.promises.readFile(filePath);
      const { encrypted: ciphertext, iv, authTag } = encryptBuffer(plaintext);
      await fs.promises.writeFile(filePath, ciphertext);

      const file = await File.create({
        filename,
        originalName: originalname,
        owner: req.user.userId,
        size,
        mimetype,
        path: filePath,
        dateTaken,
        encrypted: true,
        iv,
        authTag,
      });
      uploadedFiles.push(file);
    }
    res.status(201).json({ files: uploadedFiles });
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

// POST /api/files/zip
router.post('/zip', requireAuth, async (req, res) => {
  try {
    const { fileIds, archiveName } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0)
      return res.status(400).json({ error: 'fileIds must be a non-empty array' });

    const safeName = (archiveName || 'archive').replace(/[^a-z0-9_\-. ]/gi, '_');
    const files = await File.find({ _id: { $in: fileIds }, owner: req.user.userId });
    if (files.length !== fileIds.length)
      return res.status(403).json({ error: 'Access denied to one or more files' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', () => res.destroy());
    archive.pipe(res);
    for (const file of files) {
      if (file.encrypted) {
        const raw = await fs.promises.readFile(file.path);
        const decrypted = decryptBuffer({ encrypted: raw, iv: file.iv, authTag: file.authTag });
        archive.append(decrypted, { name: file.originalName });
      } else {
        archive.file(file.path, { name: file.originalName });
      }
    }
    await archive.finalize();
  } catch (err) {
    console.error('Zip error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Server error creating zip' });
  }
});

// GET /api/files/:id/download
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.owner.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Access denied' });

    const raw = await fs.promises.readFile(file.path);
    const output = file.encrypted
      ? decryptBuffer({ encrypted: raw, iv: file.iv, authTag: file.authTag })
      : raw;
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Length', output.length);
    res.send(output);
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
    if (!expiresIn || !ALLOWED_EXPIRY.includes(expiresIn))
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

// POST /api/files/:id/share-with
router.post('/:id/share-with', requireAuth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.owner.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Access denied' });

    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0)
      return res.status(400).json({ error: 'userIds must be a non-empty array' });

    // Filter out the owner's own ID to prevent self-sharing
    const recipients = userIds.filter(id => id !== req.user.userId);

    // insertMany with ordered:false continues past duplicates; ignore duplicate key errors
    await UserShare.insertMany(
      recipients.map(id => ({ fileId: file._id, sharedBy: req.user.userId, sharedWith: id })),
      { ordered: false }
    ).catch(err => { if (err.code !== 11000) throw err; });

    res.status(201).json({ message: 'File shared successfully' });
  } catch (err) {
    console.error('Share-with error:', err);
    res.status(500).json({ error: 'Server error sharing file' });
  }
});

// GET /api/files/:id/shared-with
router.get('/:id/shared-with', requireAuth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.owner.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Access denied' });

    const shares = await UserShare.find({ fileId: file._id })
      .populate('sharedWith', 'username')
      .sort({ createdAt: -1 });

    res.json({ sharedWith: shares.map(s => ({ _id: s.sharedWith._id, username: s.sharedWith.username })) });
  } catch (err) {
    console.error('Shared-with list error:', err);
    res.status(500).json({ error: 'Server error listing shared users' });
  }
});

// DELETE /api/files/:id/shared-with/:userId
router.delete('/:id/shared-with/:userId', requireAuth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.owner.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Access denied' });

    await UserShare.deleteOne({ fileId: file._id, sharedWith: req.params.userId });
    res.json({ message: 'Share revoked' });
  } catch (err) {
    console.error('Share-with revoke error:', err);
    res.status(500).json({ error: 'Server error revoking share' });
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
    await Promise.all([
      file.deleteOne(),
      ShareLink.deleteMany({ fileId: file._id }),
      UserShare.deleteMany({ fileId: file._id }),
      Collection.updateMany({ files: file._id }, { $pull: { files: file._id } }),
    ]);
    res.json({ message: 'File deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Server error during delete' });
  }
});

export default router;

import { Router } from 'express';
import fs from 'fs';
import archiver from 'archiver';
import { Collection } from '../models/Collection.js';
import { File } from '../models/File.js';
import { requireAuth } from '../middleware/auth.js';
import { decryptBuffer } from '../utils/encryption.js';

const router = Router();

// Returns 'owner', 'editor', 'viewer', or null
function getRole(collection, userId) {
  if (collection.owner.equals(userId)) return 'owner';
  const m = collection.members.find(m => m.user.equals(userId));
  return m ? m.role : null;
}

function validateName(name, res) {
  if (!name || typeof name !== 'string' || name.trim().length === 0)
    return res.status(400).json({ error: 'Collection name is required' });
  if (name.trim().length > 100)
    return res.status(400).json({ error: 'Collection name must be 100 characters or fewer' });
  return null;
}

// POST /api/collections
router.post('/', requireAuth, async (req, res) => {
  try {
    if (validateName(req.body.name, res)) return;
    const collection = await Collection.create({
      name: req.body.name.trim(),
      owner: req.user.userId,
    });
    res.status(201).json({ collection });
  } catch (err) {
    console.error('Collection create error:', err);
    res.status(500).json({ error: 'Server error creating collection' });
  }
});

// GET /api/collections
router.get('/', requireAuth, async (req, res) => {
  try {
    const collections = await Collection.find({
      $or: [
        { owner: req.user.userId },
        { 'members.user': req.user.userId },
      ],
    })
      .populate('owner', 'username')
      .sort({ createdAt: -1 });

    res.json({
      collections: collections.map(c => ({
        _id: c._id,
        name: c.name,
        owner: c.owner,
        fileCount: c.files.length,
        fileIds: c.files.map(id => id.toString()),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (err) {
    console.error('Collection list error:', err);
    res.status(500).json({ error: 'Server error listing collections' });
  }
});

// GET /api/collections/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('owner', 'username')
      .populate('files')
      .populate('members.user', 'username');
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    const role = getRole(collection, req.user.userId);
    if (!role) return res.status(403).json({ error: 'Access denied' });

    res.json({ collection, role });
  } catch (err) {
    console.error('Collection get error:', err);
    res.status(500).json({ error: 'Server error fetching collection' });
  }
});

// PATCH /api/collections/:id
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    if (!collection.owner.equals(req.user.userId))
      return res.status(403).json({ error: 'Only the owner can rename this collection' });

    if (validateName(req.body.name, res)) return;
    collection.name = req.body.name.trim();
    await collection.save();
    res.json({ collection });
  } catch (err) {
    console.error('Collection rename error:', err);
    res.status(500).json({ error: 'Server error renaming collection' });
  }
});

// DELETE /api/collections/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    if (!collection.owner.equals(req.user.userId))
      return res.status(403).json({ error: 'Only the owner can delete this collection' });

    await collection.deleteOne();
    res.json({ message: 'Collection deleted' });
  } catch (err) {
    console.error('Collection delete error:', err);
    res.status(500).json({ error: 'Server error deleting collection' });
  }
});

// POST /api/collections/:id/files
router.post('/:id/files', requireAuth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    const role = getRole(collection, req.user.userId);
    if (role !== 'owner' && role !== 'editor')
      return res.status(403).json({ error: 'Access denied' });

    const { fileIds } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0)
      return res.status(400).json({ error: 'fileIds must be a non-empty array' });

    // Only allow files the caller owns
    const owned = await File.find({ _id: { $in: fileIds }, owner: req.user.userId });
    if (owned.length !== fileIds.length)
      return res.status(403).json({ error: 'You can only add files you own' });

    // Push new IDs, skipping duplicates already in the collection
    const existing = new Set(collection.files.map(id => id.toString()));
    const toAdd = fileIds.filter(id => !existing.has(id.toString()));
    if (toAdd.length > 0) {
      collection.files.push(...toAdd);
      await collection.save();
    }

    res.json({ collection });
  } catch (err) {
    console.error('Collection add files error:', err);
    res.status(500).json({ error: 'Server error adding files to collection' });
  }
});

// DELETE /api/collections/:id/files/:fileId
router.delete('/:id/files/:fileId', requireAuth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    const role = getRole(collection, req.user.userId);
    if (role !== 'owner' && role !== 'editor')
      return res.status(403).json({ error: 'Access denied' });

    collection.files = collection.files.filter(
      id => id.toString() !== req.params.fileId
    );
    await collection.save();
    res.json({ collection });
  } catch (err) {
    console.error('Collection remove file error:', err);
    res.status(500).json({ error: 'Server error removing file from collection' });
  }
});

// GET /api/collections/:id/files/:fileId/download
router.get('/:id/files/:fileId/download', requireAuth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    const role = getRole(collection, req.user.userId);
    if (!role) return res.status(403).json({ error: 'Access denied' });

    const inCollection = collection.files.some(id => id.toString() === req.params.fileId);
    if (!inCollection) return res.status(404).json({ error: 'File not found in collection' });

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
    console.error('Collection file download error:', err);
    res.status(500).json({ error: 'Server error downloading file' });
  }
});

// POST /api/collections/:id/zip
router.post('/:id/zip', requireAuth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id).populate('files');
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    const role = getRole(collection, req.user.userId);
    if (!role) return res.status(403).json({ error: 'Access denied' });

    const safeName = (req.body.archiveName || collection.name).replace(/[^a-z0-9_\-. ]/gi, '_');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', () => res.destroy());
    archive.pipe(res);

    for (const file of collection.files) {
      if (!file) continue; // stale reference from a deleted file — skip silently
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
    console.error('Collection zip error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Server error creating zip' });
  }
});

// GET /api/collections/:id/members
router.get('/:id/members', requireAuth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('members.user', 'username');
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    if (!collection.owner.equals(req.user.userId))
      return res.status(403).json({ error: 'Access denied' });

    res.json({ members: collection.members });
  } catch (err) {
    console.error('Collection members error:', err);
    res.status(500).json({ error: 'Server error fetching members' });
  }
});

// POST /api/collections/:id/members
router.post('/:id/members', requireAuth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    if (!collection.owner.equals(req.user.userId))
      return res.status(403).json({ error: 'Access denied' });

    const { userId, role } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (!['viewer', 'editor'].includes(role))
      return res.status(400).json({ error: 'role must be viewer or editor' });
    if (collection.owner.equals(userId))
      return res.status(400).json({ error: 'Cannot add the owner as a member' });

    const existing = collection.members.find(m => m.user.equals(userId));
    if (existing) {
      existing.role = role;
    } else {
      collection.members.push({ user: userId, role });
    }
    await collection.save();
    await collection.populate('members.user', 'username');
    res.json({ members: collection.members });
  } catch (err) {
    console.error('Collection add member error:', err);
    res.status(500).json({ error: 'Server error updating member' });
  }
});

// DELETE /api/collections/:id/members/:userId
router.delete('/:id/members/:userId', requireAuth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    if (!collection.owner.equals(req.user.userId))
      return res.status(403).json({ error: 'Access denied' });

    collection.members = collection.members.filter(
      m => !m.user.equals(req.params.userId)
    );
    await collection.save();
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error('Collection remove member error:', err);
    res.status(500).json({ error: 'Server error removing member' });
  }
});

export default router;

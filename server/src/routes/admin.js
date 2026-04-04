import { Router } from 'express';
import fs from 'fs';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { File } from '../models/File.js';

const router = Router();

// GET /api/admin/users — list all users with storage usage
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: 1 });

    const usersWithStorage = await Promise.all(users.map(async (user) => {
      const result = await File.aggregate([
        { $match: { owner: user._id } },
        { $group: { _id: null, total: { $sum: '$size' } } },
      ]);
      return {
        ...user.toJSON(),
        storageUsed: result[0]?.total ?? 0,
      };
    }));

    res.json({ users: usersWithStorage });
  } catch (err) {
    console.error('Admin users list error:', err);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// PATCH /api/admin/users/:id/role — promote or demote a user
router.patch('/users/:id/role', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.userId)
      return res.status(400).json({ error: 'You cannot change your own role' });

    const { role } = req.body;
    if (!['user', 'admin'].includes(role))
      return res.status(400).json({ error: 'Role must be "user" or "admin"' });

    if (role === 'user') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1)
        return res.status(400).json({ error: 'Cannot demote the last admin' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });
  } catch (err) {
    console.error('Admin role update error:', err);
    res.status(500).json({ error: 'Server error updating role' });
  }
});

// DELETE /api/admin/users/:id — delete a user and all their files
router.delete('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.userId)
      return res.status(400).json({ error: 'You cannot delete your own account' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const files = await File.find({ owner: req.params.id });
    for (const file of files) {
      try { fs.unlinkSync(file.path); } catch (_) {}
    }
    await File.deleteMany({ owner: req.params.id });
    await user.deleteOne();

    res.json({ message: 'User and all their files deleted' });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Server error deleting user' });
  }
});

export default router;

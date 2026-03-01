import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/admin/dashboard — admin only
router.get('/dashboard', requireAuth, requireRole('admin'), (req, res) => {
  res.json({
    message: 'Welcome to the admin dashboard.',
    adminUser: req.user.userId,
  });
});

export default router;

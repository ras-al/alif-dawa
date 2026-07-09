import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/announcements
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let query = 'SELECT a.*, u.username as created_by_name FROM announcements a LEFT JOIN users u ON a.created_by = u.id WHERE a.is_active = true';

    if (req.user!.role !== 'admin') {
      query += ` AND (a.target_role IS NULL OR a.target_role = '${req.user!.role}')`;
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Get announcements error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/announcements
router.post('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, content, target_role } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: 'Title and content are required' });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO announcements (title, content, target_role, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, content, target_role || null, req.user!.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create announcement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/announcements/:id
router.put('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, content, target_role, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE announcements SET title = COALESCE($1, title), content = COALESCE($2, content),
       target_role = $3, is_active = COALESCE($4, is_active), updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [title, content, target_role, is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update announcement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    console.error('Delete announcement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

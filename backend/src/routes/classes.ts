import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog, getClientIp } from '../middleware/audit';

const router = Router();

// GET /api/classes
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM classes ORDER BY display_order, name');

    // Attach subjects for each class
    for (const cls of result.rows) {
      const subjects = await pool.query(
        `SELECT s.id, s.name, cs.display_order
         FROM class_subjects cs
         JOIN subjects s ON cs.subject_id = s.id
         WHERE cs.class_id = $1
         ORDER BY cs.display_order`,
        [cls.id]
      );
      cls.subjects = subjects.rows;
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Get classes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/classes
router.post('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, display_order } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Class name is required' });
    return;
  }
  try {
    const result = await pool.query(
      'INSERT INTO classes (name, display_order) VALUES ($1, $2) RETURNING *',
      [name, display_order || 0]
    );
    await auditLog(req.user!.id, 'CREATE', 'class', result.rows[0].id, { name }, getClientIp(req));
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Class name already exists' });
      return;
    }
    console.error('Create class error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/classes/:id
router.put('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, display_order } = req.body;
  try {
    const result = await pool.query(
      'UPDATE classes SET name = COALESCE($1, name), display_order = COALESCE($2, display_order) WHERE id = $3 RETURNING *',
      [name, display_order, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update class error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/classes/:id
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('DELETE FROM classes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }
    await auditLog(req.user!.id, 'DELETE', 'class', parseInt(req.params.id), { name: result.rows[0].name }, getClientIp(req));
    res.json({ message: 'Class deleted' });
  } catch (err) {
    console.error('Delete class error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/classes/:id/subjects - Update subjects for a class
router.put('/:id/subjects', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { subject_ids } = req.body;
  if (!Array.isArray(subject_ids)) {
    res.status(400).json({ error: 'subject_ids must be an array' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM class_subjects WHERE class_id = $1', [req.params.id]);
    for (let i = 0; i < subject_ids.length; i++) {
      await client.query(
        'INSERT INTO class_subjects (class_id, subject_id, display_order) VALUES ($1, $2, $3)',
        [req.params.id, subject_ids[i], i + 1]
      );
    }
    await client.query('COMMIT');

    await auditLog(req.user!.id, 'UPDATE_SUBJECTS', 'class', parseInt(req.params.id), { subject_ids }, getClientIp(req));
    res.json({ message: 'Subjects updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update class subjects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/subjects
router.get('/subjects/all', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM subjects ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Get subjects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/classes/subjects
router.post('/subjects', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Subject name is required' });
    return;
  }
  try {
    const result = await pool.query('INSERT INTO subjects (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create subject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/classes/subjects/:id
router.delete('/subjects/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await pool.query('DELETE FROM subjects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    console.error('Delete subject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import { Router, Response, Request } from 'express';
import pool from '../db';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/feedback/classes - Public route to get classes for feedback form
router.get('/classes', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT id, name FROM classes ORDER BY display_order, name');
    res.json(result.rows);
  } catch (err) {
    console.error('Get public classes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/feedback/students - Public route to get students for feedback form
router.get('/students', async (req: Request, res: Response): Promise<void> => {
  const { class_id } = req.query;
  try {
    if (!class_id) {
      res.json({ data: [] });
      return;
    }
    const result = await pool.query(
      'SELECT id, name, admission_number FROM students WHERE class_id = $1 AND is_active = true ORDER BY name', 
      [class_id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Get public students error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/feedback - Public route to submit feedback
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { student_name, parent_name, relationship, phone_number, class_name, feedback } = req.body;
  if (!student_name || !parent_name || !relationship || !phone_number || !feedback) {
    res.status(400).json({ error: 'All fields except class name are required' });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO parent_feedback (student_name, parent_name, relationship, phone_number, class_name, feedback) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [student_name, parent_name, relationship, phone_number, class_name || null, feedback]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Submit feedback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/feedback - Admin route to view all feedback
router.get('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM parent_feedback ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get feedback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/feedback/:id - Admin route to delete feedback
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('DELETE FROM parent_feedback WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }
    res.json({ message: 'Feedback deleted' });
  } catch (err) {
    console.error('Delete feedback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/settings
router.get('/', authenticate, authorize('admin'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings: Record<string, string> = {};
    result.rows.forEach((row: { key: string; value: string }) => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings
router.put('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const settings = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, value] of Object.entries(settings)) {
      await client.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value as string]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Settings updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/search?q=
router.get('/search', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const q = req.query.q as string;
  if (!q || q.length < 2) {
    res.json({ students: [], teachers: [], classes: [] });
    return;
  }

  try {
    const students = await pool.query(
      `SELECT s.id, s.name, s.admission_number, c.name as class_name, 'student' as type
       FROM students s LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.name ILIKE $1 OR s.admission_number ILIKE $1
       LIMIT 10`,
      [`%${q}%`]
    );

    const teachers = await pool.query(
      `SELECT id, name, 'teacher' as type FROM teachers WHERE name ILIKE $1 LIMIT 10`,
      [`%${q}%`]
    );

    const classes = await pool.query(
      `SELECT id, name, 'class' as type FROM classes WHERE name ILIKE $1 LIMIT 10`,
      [`%${q}%`]
    );

    res.json({
      students: students.rows,
      teachers: teachers.rows,
      classes: classes.rows,
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-logs
router.get('/audit-logs', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '30' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM audit_logs');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT al.*, u.username FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Get audit logs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

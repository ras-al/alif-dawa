import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog, getClientIp } from '../middleware/audit';

const router = Router();

// GET /api/teachers
router.get('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', search = '' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (t.name ILIKE $${paramIndex} OR t.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM teachers t ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT t.*
       FROM teachers t
       ${whereClause}
       ORDER BY t.name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      data: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Get teachers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teachers/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT t.* FROM teachers t WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Teacher not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get teacher error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/teachers
router.post('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, phone, email } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  try {
    const teacherResult = await pool.query(
      'INSERT INTO teachers (name, phone, email) VALUES ($1, $2, $3) RETURNING *',
      [name, phone || null, email || null]
    );

    const teacherId = teacherResult.rows[0].id;
    await auditLog(req.user!.id, 'CREATE', 'teacher', teacherId, { name }, getClientIp(req));

    res.status(201).json(teacherResult.rows[0]);
  } catch (err: any) {
    console.error('Create teacher error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/teachers/:id
router.put('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, phone, email, is_active } = req.body;

  try {
    const result = await pool.query(
      `UPDATE teachers SET name = COALESCE($1, name), phone = $2, email = $3,
       is_active = COALESCE($4, is_active), updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [name, phone, email, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Teacher not found' });
      return;
    }

    await auditLog(req.user!.id, 'UPDATE', 'teacher', parseInt(req.params.id), req.body, getClientIp(req));

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update teacher error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/teachers/:id
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('DELETE FROM teachers WHERE id = $1 RETURNING id, name', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Teacher not found' });
      return;
    }
    await auditLog(req.user!.id, 'DELETE', 'teacher', parseInt(req.params.id), { name: result.rows[0].name }, getClientIp(req));
    res.json({ message: 'Teacher deleted' });
  } catch (err) {
    console.error('Delete teacher error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

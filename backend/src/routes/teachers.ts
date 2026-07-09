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
      `SELECT t.*, u.username
       FROM teachers t
       LEFT JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY t.name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    // Fetch assigned classes for each teacher
    for (const teacher of result.rows) {
      const classes = await pool.query(
        `SELECT c.name FROM teacher_classes tc
         JOIN classes c ON tc.class_id = c.id
         JOIN academic_years ay ON tc.academic_year_id = ay.id
         WHERE tc.teacher_id = $1 AND ay.is_active = true
         ORDER BY c.display_order`,
        [teacher.id]
      );
      teacher.assigned_classes = classes.rows.map((c: { name: string }) => c.name);
    }

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
      `SELECT t.*, u.username FROM teachers t LEFT JOIN users u ON t.user_id = u.id WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Teacher not found' });
      return;
    }

    const classes = await pool.query(
      `SELECT tc.class_id, c.name as class_name, ay.name as year_name
       FROM teacher_classes tc
       JOIN classes c ON tc.class_id = c.id
       JOIN academic_years ay ON tc.academic_year_id = ay.id
       WHERE tc.teacher_id = $1
       ORDER BY ay.is_active DESC, c.display_order`,
      [req.params.id]
    );

    res.json({ ...result.rows[0], classes: classes.rows });
  } catch (err) {
    console.error('Get teacher error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/teachers
router.post('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, phone, email, username, password, class_ids } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let userId = null;
    if (username && password) {
      const hash = await bcrypt.hash(password, 10);
      const roleResult = await client.query("SELECT id FROM roles WHERE name = 'teacher'");
      const userResult = await client.query(
        'INSERT INTO users (username, password_hash, role_id) VALUES ($1, $2, $3) RETURNING id',
        [username, hash, roleResult.rows[0].id]
      );
      userId = userResult.rows[0].id;
    }

    const teacherResult = await client.query(
      'INSERT INTO teachers (user_id, name, phone, email) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, name, phone || null, email || null]
    );

    const teacherId = teacherResult.rows[0].id;

    // Assign classes if provided
    if (class_ids && class_ids.length > 0) {
      const activeYear = await client.query('SELECT id FROM academic_years WHERE is_active = true LIMIT 1');
      if (activeYear.rows.length > 0) {
        for (const classId of class_ids) {
          await client.query(
            'INSERT INTO teacher_classes (teacher_id, class_id, academic_year_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [teacherId, classId, activeYear.rows[0].id]
          );
        }
      }
    }

    await client.query('COMMIT');
    await auditLog(req.user!.id, 'CREATE', 'teacher', teacherId, { name }, getClientIp(req));

    res.status(201).json(teacherResult.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }
    console.error('Create teacher error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PUT /api/teachers/:id
router.put('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, phone, email, is_active, class_ids, password } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE teachers SET name = COALESCE($1, name), phone = $2, email = $3,
       is_active = COALESCE($4, is_active), updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [name, phone, email, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Teacher not found' });
      return;
    }

    // Update password if provided
    if (password && result.rows[0].user_id) {
      const hash = await bcrypt.hash(password, 10);
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, result.rows[0].user_id]);
    }

    // Update class assignments if provided
    if (class_ids !== undefined) {
      const activeYear = await client.query('SELECT id FROM academic_years WHERE is_active = true LIMIT 1');
      if (activeYear.rows.length > 0) {
        await client.query(
          'DELETE FROM teacher_classes WHERE teacher_id = $1 AND academic_year_id = $2',
          [req.params.id, activeYear.rows[0].id]
        );
        for (const classId of class_ids) {
          await client.query(
            'INSERT INTO teacher_classes (teacher_id, class_id, academic_year_id) VALUES ($1, $2, $3)',
            [req.params.id, classId, activeYear.rows[0].id]
          );
        }
      }
    }

    await client.query('COMMIT');
    await auditLog(req.user!.id, 'UPDATE', 'teacher', parseInt(req.params.id), req.body, getClientIp(req));

    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update teacher error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
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

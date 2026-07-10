import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
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

      // Check if class has a login account
      if (cls.user_id) {
        const userResult = await pool.query(
          'SELECT username, is_active FROM users WHERE id = $1',
          [cls.user_id]
        );
        if (userResult.rows.length > 0) {
          cls.login_username = userResult.rows[0].username;
          cls.login_active = userResult.rows[0].is_active;
        }
      }
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Get classes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/classes
router.post('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, display_order, create_login, username, password } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Class name is required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let userId = null;
    if (create_login && username && password) {
      const hash = await bcrypt.hash(password, 10);
      const roleResult = await client.query("SELECT id FROM roles WHERE name = 'class'");
      if (roleResult.rows.length === 0) {
        // Create class role if it doesn't exist
        const newRole = await client.query("INSERT INTO roles (name) VALUES ('class') RETURNING id");
        userId = newRole.rows[0].id;
      }
      const classRoleId = roleResult.rows.length > 0 ? roleResult.rows[0].id : userId;
      const userResult = await client.query(
        'INSERT INTO users (username, password_hash, role_id) VALUES ($1, $2, $3) RETURNING id',
        [username, hash, classRoleId]
      );
      userId = userResult.rows[0].id;
    }

    const result = await client.query(
      'INSERT INTO classes (name, display_order, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, display_order || 0, userId]
    );

    await client.query('COMMIT');
    await auditLog(req.user!.id, 'CREATE', 'class', result.rows[0].id, { name }, getClientIp(req));
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      res.status(409).json({ error: 'Class name or username already exists' });
      return;
    }
    console.error('Create class error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
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

// POST /api/classes/:id/create-login - Create or update login for a class
router.post('/:id/create-login', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const classResult = await client.query('SELECT id, user_id, name FROM classes WHERE id = $1', [req.params.id]);
    if (classResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    const cls = classResult.rows[0];
    const hash = await bcrypt.hash(password, 10);

    if (cls.user_id) {
      // Update existing login
      await client.query(
        'UPDATE users SET username = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [username, hash, cls.user_id]
      );
    } else {
      // Create new login
      let roleResult = await client.query("SELECT id FROM roles WHERE name = 'class'");
      if (roleResult.rows.length === 0) {
        roleResult = await client.query("INSERT INTO roles (name) VALUES ('class') RETURNING id");
      }
      const userResult = await client.query(
        'INSERT INTO users (username, password_hash, role_id) VALUES ($1, $2, $3) RETURNING id',
        [username, hash, roleResult.rows[0].id]
      );
      await client.query('UPDATE classes SET user_id = $1 WHERE id = $2', [userResult.rows[0].id, req.params.id]);
    }

    await client.query('COMMIT');
    await auditLog(req.user!.id, 'CREATE_CLASS_LOGIN', 'class', parseInt(req.params.id), { username, className: cls.name }, getClientIp(req));
    res.json({ message: 'Class login created/updated successfully' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }
    console.error('Create class login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PUT /api/classes/:id/teacher-subjects - Assign teachers to subjects for a class
router.put('/:id/teacher-subjects', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { assignments } = req.body;
  // assignments: [{ subject_id, teacher_id }]

  if (!Array.isArray(assignments)) {
    res.status(400).json({ error: 'assignments must be an array of { subject_id, teacher_id }' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const activeYear = await client.query('SELECT id FROM academic_years WHERE is_active = true LIMIT 1');
    if (activeYear.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'No active academic year' });
      return;
    }

    const yearId = activeYear.rows[0].id;

    // Remove existing assignments for this class and year
    await client.query(
      'DELETE FROM class_teacher_subjects WHERE class_id = $1 AND academic_year_id = $2',
      [req.params.id, yearId]
    );

    // Insert new assignments
    for (const a of assignments) {
      if (a.subject_id && a.teacher_id) {
        await client.query(
          `INSERT INTO class_teacher_subjects (class_id, teacher_id, subject_id, academic_year_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (class_id, subject_id, academic_year_id)
           DO UPDATE SET teacher_id = $2`,
          [req.params.id, a.teacher_id, a.subject_id, yearId]
        );
      }
    }

    await client.query('COMMIT');
    await auditLog(req.user!.id, 'UPDATE_TEACHER_SUBJECTS', 'class', parseInt(req.params.id), { assignments }, getClientIp(req));
    res.json({ message: 'Teacher-subject assignments updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update teacher subjects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/classes/:id/teacher-subjects - Get teacher-subject assignments for a class
router.get('/:id/teacher-subjects', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT cts.subject_id, cts.teacher_id, t.name as teacher_name, s.name as subject_name
       FROM class_teacher_subjects cts
       JOIN teachers t ON cts.teacher_id = t.id
       JOIN subjects s ON cts.subject_id = s.id
       JOIN academic_years ay ON cts.academic_year_id = ay.id
       WHERE cts.class_id = $1 AND ay.is_active = true
       ORDER BY s.name`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get teacher subjects error:', err);
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

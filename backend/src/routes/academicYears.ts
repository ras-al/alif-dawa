import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog, getClientIp } from '../middleware/audit';

const router = Router();

// GET /api/academic-years
router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM academic_years ORDER BY start_date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get academic years error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/academic-years
router.post('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, start_date, end_date, is_active } = req.body;
  if (!name || !start_date || !end_date) {
    res.status(400).json({ error: 'Name, start date, and end date are required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (is_active) {
      await client.query('UPDATE academic_years SET is_active = false');
    }

    const result = await client.query(
      'INSERT INTO academic_years (name, start_date, end_date, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, start_date, end_date, is_active || false]
    );

    await client.query('COMMIT');
    await auditLog(req.user!.id, 'CREATE', 'academic_year', result.rows[0].id, { name }, getClientIp(req));
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      res.status(409).json({ error: 'Academic year already exists' });
      return;
    }
    console.error('Create academic year error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PUT /api/academic-years/:id
router.put('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, start_date, end_date, is_active } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (is_active) {
      await client.query('UPDATE academic_years SET is_active = false');
    }

    const result = await client.query(
      `UPDATE academic_years SET name = COALESCE($1, name), start_date = COALESCE($2, start_date),
       end_date = COALESCE($3, end_date), is_active = COALESCE($4, is_active) WHERE id = $5 RETURNING *`,
      [name, start_date, end_date, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Academic year not found' });
      return;
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update academic year error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/academic-years/:id/months
router.get('/:id/months', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM academic_months WHERE academic_year_id = $1 ORDER BY month_number',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get academic months error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/academic-years/:id/months
router.post('/:id/months', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, month_number } = req.body;
  if (!name || month_number === undefined) {
    res.status(400).json({ error: 'Name and month number are required' });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO academic_months (academic_year_id, name, month_number) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, name, month_number]
    );
    await auditLog(req.user!.id, 'CREATE', 'academic_month', result.rows[0].id, { name }, getClientIp(req));
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Month number already exists for this year' });
      return;
    }
    console.error('Create academic month error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/academic-years/months/:monthId/lock
router.put('/months/:monthId/lock', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body;
  if (!['open', 'locked'].includes(status)) {
    res.status(400).json({ error: 'Status must be open or locked' });
    return;
  }

  try {
    const result = await pool.query(
      'UPDATE academic_months SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.monthId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Academic month not found' });
      return;
    }
    await auditLog(req.user!.id, 'LOCK_MONTH', 'academic_month', parseInt(req.params.monthId), { status }, getClientIp(req));
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Lock month error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/academic-years/:id
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('DELETE FROM academic_years WHERE id = $1 RETURNING id, name', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Academic year not found' });
      return;
    }
    await auditLog(req.user!.id, 'DELETE', 'academic_year', parseInt(req.params.id), { name: result.rows[0].name }, getClientIp(req));
    res.json({ message: 'Academic year deleted' });
  } catch (err) {
    console.error('Delete academic year error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/academic-years/months/:monthId
router.put('/months/:monthId', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, month_number } = req.body;
  try {
    const result = await pool.query(
      'UPDATE academic_months SET name = COALESCE($1, name), month_number = COALESCE($2, month_number) WHERE id = $3 RETURNING *',
      [name, month_number, req.params.monthId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Academic month not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Month number already exists for this year' });
      return;
    }
    console.error('Update academic month error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/academic-years/months/:monthId
router.delete('/months/:monthId', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('DELETE FROM academic_months WHERE id = $1 RETURNING id, name, academic_year_id', [req.params.monthId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Academic month not found' });
      return;
    }
    await auditLog(req.user!.id, 'DELETE', 'academic_month', parseInt(req.params.monthId), { name: result.rows[0].name }, getClientIp(req));
    res.json({ message: 'Academic month deleted' });
  } catch (err) {
    console.error('Delete academic month error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

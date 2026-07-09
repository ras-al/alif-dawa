import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/leave
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let query = `
      SELECT lr.*, s.name as student_name, s.admission_number, c.name as class_name
      FROM leave_requests lr
      JOIN students s ON lr.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
    `;
    const params: (number | string)[] = [];

    if (req.user!.role === 'student') {
      const studentResult = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user!.id]);
      if (studentResult.rows.length === 0) {
        res.json([]);
        return;
      }
      query += ' WHERE lr.student_id = $1';
      params.push(studentResult.rows[0].id);
    }

    query += ' ORDER BY lr.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get leave requests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/leave
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { student_id, start_date, end_date, reason } = req.body;

  if (!start_date || !end_date || !reason) {
    res.status(400).json({ error: 'Start date, end date, and reason are required' });
    return;
  }

  let finalStudentId = student_id;

  // If student role, use their own student_id
  if (req.user!.role === 'student') {
    const studentResult = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user!.id]);
    if (studentResult.rows.length === 0) {
      res.status(404).json({ error: 'Student profile not found' });
      return;
    }
    finalStudentId = studentResult.rows[0].id;
  }

  if (!finalStudentId) {
    res.status(400).json({ error: 'student_id is required' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO leave_requests (student_id, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [finalStudentId, start_date, end_date, reason]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create leave request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/leave/:id/review
router.put('/:id/review', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, review_remarks } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'Status must be approved or rejected' });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE leave_requests SET status = $1, review_remarks = $2, reviewed_by = $3,
       updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [status, review_remarks || null, req.user!.id, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Leave request not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Review leave request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// POST /api/attendance/mark
router.post('/mark', authenticate, authorize('admin', 'class'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { date, records } = req.body;
  // records: [{ student_id, status }]

  if (!date || !Array.isArray(records)) {
    res.status(400).json({ error: 'date and records array are required' });
    return;
  }

  // Class login: verify all students belong to their class
  if (req.user!.role === 'class' && req.user!.classId) {
    const studentIds = records.map((r: any) => r.student_id);
    if (studentIds.length > 0) {
      const check = await pool.query(
        'SELECT id FROM students WHERE id = ANY($1::int[]) AND class_id != $2',
        [studentIds, req.user!.classId]
      );
      if (check.rows.length > 0) {
        res.status(403).json({ error: 'Access denied: some students not in your class' });
        return;
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const record of records) {
      await client.query(
        `INSERT INTO attendance (student_id, date, status, marked_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, date)
         DO UPDATE SET status = $3, marked_by = $4`,
        [record.student_id, date, record.status, req.user!.id]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Attendance marked' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Mark attendance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/attendance?date=&class_id=
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { date, class_id } = req.query as Record<string, string>;

  if (!date) {
    res.status(400).json({ error: 'date is required' });
    return;
  }

  // Determine effective class_id
  let effectiveClassId = class_id;
  if (req.user!.role === 'class' && req.user!.classId) {
    effectiveClassId = req.user!.classId.toString();
  }

  if (!effectiveClassId) {
    res.status(400).json({ error: 'class_id is required' });
    return;
  }

  if (req.user!.role === 'teacher') {
    const teacherResult = await pool.query('SELECT id FROM teachers WHERE user_id = $1', [req.user!.id]);
    if (teacherResult.rows.length === 0) {
      res.json([]);
      return;
    }
    const hasAccess = await pool.query(
      `SELECT 1 FROM class_teacher_subjects cts
       JOIN academic_years ay ON cts.academic_year_id = ay.id
       WHERE cts.teacher_id = $1 AND cts.class_id = $2 AND ay.is_active = true
       UNION
       SELECT 1 FROM classes WHERE id = $2 AND charge_teacher_id = $1`,
      [teacherResult.rows[0].id, effectiveClassId]
    );
    if (hasAccess.rows.length === 0) {
      res.status(403).json({ error: 'Access denied: you are not assigned to this class' });
      return;
    }
  }

  try {
    const result = await pool.query(
      `SELECT s.id as student_id, s.name, s.admission_number,
              a.status, a.id as attendance_id
       FROM students s
       LEFT JOIN attendance a ON s.id = a.student_id AND a.date = $1
       WHERE s.class_id = $2 AND s.is_active = true
       ORDER BY s.name`,
      [date, effectiveClassId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get attendance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/attendance/summary?student_id=&month=&year=
router.get('/summary', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { student_id, month, year } = req.query as Record<string, string>;

  try {
    let query = `
      SELECT status, COUNT(*) as count
      FROM attendance
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (student_id) {
      query += ` AND student_id = $${paramIndex}`;
      params.push(parseInt(student_id));
      paramIndex++;
    }

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM date) = $${paramIndex} AND EXTRACT(YEAR FROM date) = $${paramIndex + 1}`;
      params.push(parseInt(month), parseInt(year));
      paramIndex += 2;
    }

    query += ' GROUP BY status';

    const result = await pool.query(query, params);

    const summary: Record<string, number> = { present: 0, absent: 0, leave: 0 };
    result.rows.forEach((row: { status: string; count: string }) => {
      summary[row.status] = parseInt(row.count);
    });

    res.json(summary);
  } catch (err) {
    console.error('Get attendance summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/attendance/monthly/:classId/:monthId
router.get('/monthly/:classId/:monthId', authenticate, authorize('admin', 'class'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { classId, monthId } = req.params;

  if (req.user!.role === 'class' && req.user!.classId !== parseInt(classId)) {
    res.status(403).json({ error: 'Access denied: cannot view other class attendance' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT s.id as student_id, s.name, s.admission_number,
              ma.total_days, ma.present_days
       FROM students s
       LEFT JOIN monthly_attendance ma ON s.id = ma.student_id AND ma.academic_month_id = $1
       WHERE s.class_id = $2 AND s.is_active = true
       ORDER BY s.name`,
      [monthId, classId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get monthly attendance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/attendance/monthly
router.post('/monthly', authenticate, authorize('admin', 'class'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { class_id, academic_month_id, records } = req.body;
  // records: [{ student_id, total_days, present_days }]

  if (!class_id || !academic_month_id || !Array.isArray(records)) {
    res.status(400).json({ error: 'class_id, academic_month_id, and records array are required' });
    return;
  }

  if (req.user!.role === 'class' && req.user!.classId !== class_id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const record of records) {
      await client.query(
        `INSERT INTO monthly_attendance (student_id, academic_month_id, total_days, present_days)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, academic_month_id)
         DO UPDATE SET total_days = $3, present_days = $4, updated_at = CURRENT_TIMESTAMP`,
        [record.student_id, academic_month_id, record.total_days || 0, record.present_days || 0]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Monthly attendance saved' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Save monthly attendance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;

import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// POST /api/attendance/mark
router.post('/mark', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { date, records } = req.body;
  // records: [{ student_id, status }]

  if (!date || !Array.isArray(records)) {
    res.status(400).json({ error: 'date and records array are required' });
    return;
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

  if (!date || !class_id) {
    res.status(400).json({ error: 'date and class_id are required' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT s.id as student_id, s.name, s.admission_number,
              a.status, a.id as attendance_id
       FROM students s
       LEFT JOIN attendance a ON s.id = a.student_id AND a.date = $1
       WHERE s.class_id = $2 AND s.is_active = true
       ORDER BY s.name`,
      [date, class_id]
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

export default router;

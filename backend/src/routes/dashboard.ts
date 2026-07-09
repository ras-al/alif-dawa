import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, authorize('admin'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const students = await pool.query('SELECT COUNT(*) FROM students WHERE is_active = true');
    const teachers = await pool.query('SELECT COUNT(*) FROM teachers WHERE is_active = true');
    const classes = await pool.query('SELECT COUNT(*) FROM classes');
    const reports = await pool.query('SELECT COUNT(DISTINCT (student_id, academic_month_id)) FROM exam_marks');
    const pendingLeaves = await pool.query("SELECT COUNT(*) FROM leave_requests WHERE status = 'pending'");

    res.json({
      totalStudents: parseInt(students.rows[0].count),
      totalTeachers: parseInt(teachers.rows[0].count),
      totalClasses: parseInt(classes.rows[0].count),
      totalReports: parseInt(reports.rows[0].count),
      pendingLeaves: parseInt(pendingLeaves.rows[0].count),
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', authenticate, authorize('admin'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT al.*, u.username FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT 15`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Recent activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/teacher-stats
router.get('/teacher-stats', authenticate, authorize('teacher'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teacherResult = await pool.query('SELECT id FROM teachers WHERE user_id = $1', [req.user!.id]);
    if (teacherResult.rows.length === 0) {
      res.json({ assignedClasses: 0, totalStudents: 0 });
      return;
    }

    const teacherId = teacherResult.rows[0].id;

    const assignedClasses = await pool.query(
      `SELECT COUNT(DISTINCT tc.class_id) FROM teacher_classes tc
       JOIN academic_years ay ON tc.academic_year_id = ay.id
       WHERE tc.teacher_id = $1 AND ay.is_active = true`,
      [teacherId]
    );

    const classIds = await pool.query(
      `SELECT tc.class_id FROM teacher_classes tc
       JOIN academic_years ay ON tc.academic_year_id = ay.id
       WHERE tc.teacher_id = $1 AND ay.is_active = true`,
      [teacherId]
    );

    let totalStudents = 0;
    if (classIds.rows.length > 0) {
      const ids = classIds.rows.map((r: { class_id: number }) => r.class_id);
      const students = await pool.query(
        'SELECT COUNT(*) FROM students WHERE class_id = ANY($1::int[]) AND is_active = true',
        [ids]
      );
      totalStudents = parseInt(students.rows[0].count);
    }

    res.json({
      assignedClasses: parseInt(assignedClasses.rows[0].count),
      totalStudents,
    });
  } catch (err) {
    console.error('Teacher stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

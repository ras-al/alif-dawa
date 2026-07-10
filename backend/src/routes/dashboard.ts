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

// GET /api/dashboard/class-stats - Stats for class login
router.get('/class-stats', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'class' || !req.user!.classId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const classId = req.user!.classId;

  try {
    const students = await pool.query(
      'SELECT COUNT(*) FROM students WHERE class_id = $1 AND is_active = true',
      [classId]
    );

    const className = await pool.query('SELECT name FROM classes WHERE id = $1', [classId]);

    // Get subjects for this class
    const subjects = await pool.query(
      `SELECT s.id, s.name FROM class_subjects cs
       JOIN subjects s ON cs.subject_id = s.id
       WHERE cs.class_id = $1 ORDER BY cs.display_order`,
      [classId]
    );

    // Get teacher-subject assignments for this class
    const teacherSubjects = await pool.query(
      `SELECT cts.subject_id, t.id as teacher_id, t.name as teacher_name, s.name as subject_name
       FROM class_teacher_subjects cts
       JOIN teachers t ON cts.teacher_id = t.id
       JOIN subjects s ON cts.subject_id = s.id
       JOIN academic_years ay ON cts.academic_year_id = ay.id
       WHERE cts.class_id = $1 AND ay.is_active = true AND t.is_active = true
       ORDER BY s.name, t.name`,
      [classId]
    );

    // Today's attendance summary
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await pool.query(
      `SELECT status, COUNT(*) as count FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE s.class_id = $1 AND a.date = $2
       GROUP BY status`,
      [classId, today]
    );
    const attendanceSummary: Record<string, number> = { present: 0, absent: 0, leave: 0 };
    todayAttendance.rows.forEach((row: { status: string; count: string }) => {
      attendanceSummary[row.status] = parseInt(row.count);
    });

    const pendingLeaves = await pool.query(
      `SELECT COUNT(*) FROM leave_requests lr
       JOIN students s ON lr.student_id = s.id
       WHERE s.class_id = $1 AND lr.status = 'pending'`,
      [classId]
    );

    res.json({
      className: className.rows[0]?.name || '',
      totalStudents: parseInt(students.rows[0].count),
      subjects: subjects.rows,
      teacherSubjects: teacherSubjects.rows,
      todayAttendance: attendanceSummary,
      pendingLeaves: parseInt(pendingLeaves.rows[0].count),
    });
  } catch (err) {
    console.error('Class stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

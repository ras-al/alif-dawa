import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog, getClientIp } from '../middleware/audit';

const router = Router();

// GET /api/marks?month_id=&class_id=
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { month_id, class_id, student_id } = req.query as Record<string, string>;

  if (!month_id) {
    res.status(400).json({ error: 'month_id is required' });
    return;
  }

  try {
    let classFilter = '';
    const params: (string | number)[] = [];
    let paramIndex = 1;

    // Class login: force filter to their own class
    if (req.user!.role === 'class' && req.user!.classId) {
      classFilter = ` AND s.class_id = $${paramIndex}`;
      params.push(req.user!.classId);
      paramIndex++;
    } else if (class_id) {
      classFilter = ` AND s.class_id = $${paramIndex}`;
      params.push(parseInt(class_id));
      paramIndex++;
    }

    // Teachers can only see their assigned classes
    if (req.user!.role === 'teacher') {
      const teacherResult = await pool.query('SELECT id FROM teachers WHERE user_id = $1', [req.user!.id]);
      if (teacherResult.rows.length === 0) {
        res.json([]);
        return;
      }
      const assignedClasses = await pool.query(
        `SELECT class_id FROM class_teacher_subjects cts
         JOIN academic_years ay ON cts.academic_year_id = ay.id
         WHERE cts.teacher_id = $1 AND ay.is_active = true
         UNION
         SELECT id as class_id FROM classes WHERE charge_teacher_id = $1`,
        [teacherResult.rows[0].id]
      );
      const classIds = assignedClasses.rows.map((r: { class_id: number }) => r.class_id);
      if (classIds.length === 0) {
        res.json([]);
        return;
      }
      classFilter += ` AND s.class_id = ANY($${paramIndex}::int[])`;
      params.push(classIds as unknown as number);
      paramIndex++;
    }

    if (student_id) {
      classFilter += ` AND s.id = $${paramIndex}`;
      params.push(parseInt(student_id));
    }

    // Get students with their marks for this month
    const students = await pool.query(
      `SELECT s.id, s.name, s.admission_number, c.name as class_name, s.class_id
       FROM students s
       JOIN classes c ON s.class_id = c.id
       WHERE s.is_active = true ${classFilter}
       ORDER BY s.name`,
      params
    );

    // Get marks for all these students
    const studentIds = students.rows.map((s: { id: number }) => s.id);
    let marks: any[] = [];
    if (studentIds.length > 0) {
      const marksResult = await pool.query(
        `SELECT em.*, sub.name as subject_name
         FROM exam_marks em
         JOIN subjects sub ON em.subject_id = sub.id
         WHERE em.academic_month_id = $1 AND em.student_id = ANY($2::int[])`,
        [parseInt(month_id), studentIds]
      );
      marks = marksResult.rows;
    }

    // Build response: each student with their marks
    const response = students.rows.map((student: any) => {
      const studentMarks = marks.filter((m: any) => m.student_id === student.id);
      return { ...student, marks: studentMarks };
    });

    res.json(response);
  } catch (err) {
    console.error('Get marks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/marks - Save marks for a student
router.post('/', authenticate, authorize('admin', 'teacher'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { student_id, academic_month_id, marks } = req.body;

  if (!student_id || !academic_month_id || !Array.isArray(marks)) {
    res.status(400).json({ error: 'student_id, academic_month_id, and marks array are required' });
    return;
  }

  // Verify the month is not locked
  const monthResult = await pool.query('SELECT status FROM academic_months WHERE id = $1', [academic_month_id]);
  if (monthResult.rows.length === 0) {
    res.status(404).json({ error: 'Academic month not found' });
    return;
  }
  if (monthResult.rows[0].status === 'locked') {
    res.status(403).json({ error: 'This month is locked. Marks cannot be edited.' });
    return;
  }

  // Class login: verify student belongs to their class
  if (req.user!.role === 'class' && req.user!.classId) {
    const studentClass = await pool.query('SELECT class_id FROM students WHERE id = $1', [student_id]);
    if (studentClass.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    if (studentClass.rows[0].class_id !== req.user!.classId) {
      res.status(403).json({ error: 'Access denied: student not in your class' });
      return;
    }
  }
  // If teacher, verify access to the student's class
  else if (req.user!.role === 'teacher') {
    const teacherResult = await pool.query('SELECT id FROM teachers WHERE user_id = $1', [req.user!.id]);
    if (teacherResult.rows.length === 0) {
      res.status(403).json({ error: 'Teacher profile not found' });
      return;
    }

    const studentClass = await pool.query('SELECT class_id FROM students WHERE id = $1', [student_id]);
    if (studentClass.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    const hasAccess = await pool.query(
      `SELECT 1 FROM class_teacher_subjects cts
       JOIN academic_years ay ON cts.academic_year_id = ay.id
       WHERE cts.teacher_id = $1 AND cts.class_id = $2 AND ay.is_active = true
       UNION
       SELECT 1 FROM classes WHERE id = $2 AND charge_teacher_id = $1`,
      [teacherResult.rows[0].id, studentClass.rows[0].class_id]
    );

    if (hasAccess.rows.length === 0) {
      res.status(403).json({ error: 'You do not have access to this student\'s class' });
      return;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const mark of marks) {
      if (mark.subject_id === undefined) continue;

      await client.query(
        `INSERT INTO exam_marks (student_id, subject_id, academic_month_id, marks, remarks, entered_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (student_id, subject_id, academic_month_id)
         DO UPDATE SET marks = $4, remarks = $5, entered_by = $6, updated_at = CURRENT_TIMESTAMP`,
        [student_id, mark.subject_id, academic_month_id, mark.marks ?? null, mark.remarks || null, req.user!.id]
      );
    }

    await client.query('COMMIT');
    await auditLog(req.user!.id, 'SAVE_MARKS', 'exam_marks', student_id, { academic_month_id, count: marks.length }, getClientIp(req));

    res.json({ message: 'Marks saved successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Save marks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/marks/progress-card/:studentId/:monthId
router.get('/progress-card/:studentId/:monthId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student = await pool.query(
      `SELECT s.*, c.name as class_name FROM students s
       LEFT JOIN classes c ON s.class_id = c.id WHERE s.id = $1`,
      [req.params.studentId]
    );

    if (student.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    // Class login: verify student belongs to their class
    if (req.user!.role === 'class' && req.user!.classId) {
      if (student.rows[0].class_id !== req.user!.classId) {
        res.status(403).json({ error: 'Access denied: student not in your class' });
        return;
      }
    } else if (req.user!.role === 'teacher') {
      const teacherResult = await pool.query('SELECT id FROM teachers WHERE user_id = $1', [req.user!.id]);
      if (teacherResult.rows.length === 0) {
        res.status(403).json({ error: 'Teacher profile not found' });
        return;
      }
      const hasAccess = await pool.query(
        `SELECT 1 FROM class_teacher_subjects cts
         JOIN academic_years ay ON cts.academic_year_id = ay.id
         WHERE cts.teacher_id = $1 AND cts.class_id = $2 AND ay.is_active = true
         UNION
         SELECT 1 FROM classes WHERE id = $2 AND charge_teacher_id = $1`,
        [teacherResult.rows[0].id, student.rows[0].class_id]
      );
      if (hasAccess.rows.length === 0) {
        res.status(403).json({ error: 'Access denied: student not in your assigned classes' });
        return;
      }
    }

    const month = await pool.query(
      `SELECT am.*, ay.name as year_name FROM academic_months am
       JOIN academic_years ay ON am.academic_year_id = ay.id WHERE am.id = $1`,
      [req.params.monthId]
    );

    if (month.rows.length === 0) {
      res.status(404).json({ error: 'Academic month not found' });
      return;
    }

    const marks = await pool.query(
      `SELECT em.marks, em.remarks, sub.name as subject_name
       FROM exam_marks em
       JOIN subjects sub ON em.subject_id = sub.id
       WHERE em.student_id = $1 AND em.academic_month_id = $2
       ORDER BY sub.name`,
      [req.params.studentId, req.params.monthId]
    );

    // Get monthly attendance for this student
    const attendanceResult = await pool.query(
      `SELECT total_days, present_days FROM monthly_attendance
       WHERE student_id = $1 AND academic_month_id = $2`,
      [req.params.studentId, req.params.monthId]
    );

    let totalDays = 0;
    let presentDays = 0;

    if (attendanceResult.rows.length > 0) {
      totalDays = attendanceResult.rows[0].total_days;
      presentDays = attendanceResult.rows[0].present_days;
    }

    const attendanceSummary = {
      present: presentDays,
      absent: totalDays - presentDays,
      leave: 0,
      class_total_days: totalDays
    };

    const settings = await pool.query("SELECT key, value FROM settings");
    const settingsMap: Record<string, string> = {};
    settings.rows.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    res.json({
      institution: settingsMap,
      student: student.rows[0],
      month: month.rows[0],
      marks: marks.rows,
      attendance: attendanceSummary,
    });
  } catch (err) {
    console.error('Get progress card error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/marks/progress-card/class/:classId/:monthId
router.get('/progress-card/class/:classId/:monthId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Class login: verify student belongs to their class
    if (req.user!.role === 'class' && req.user!.classId) {
      if (parseInt(req.params.classId) !== req.user!.classId) {
        res.status(403).json({ error: 'Access denied: cannot view other class progress cards' });
        return;
      }
    } else if (req.user!.role === 'teacher') {
      const teacherResult = await pool.query('SELECT id FROM teachers WHERE user_id = $1', [req.user!.id]);
      if (teacherResult.rows.length === 0) {
        res.status(403).json({ error: 'Teacher profile not found' });
        return;
      }
      const hasAccess = await pool.query(
        `SELECT 1 FROM class_teacher_subjects cts
         JOIN academic_years ay ON cts.academic_year_id = ay.id
         WHERE cts.teacher_id = $1 AND cts.class_id = $2 AND ay.is_active = true
         UNION
         SELECT 1 FROM classes WHERE id = $2 AND charge_teacher_id = $1`,
        [teacherResult.rows[0].id, req.params.classId]
      );
      if (hasAccess.rows.length === 0) {
        res.status(403).json({ error: 'Access denied: you do not have access to this class' });
        return;
      }
    }

    const month = await pool.query(
      `SELECT am.*, ay.name as year_name FROM academic_months am
       JOIN academic_years ay ON am.academic_year_id = ay.id WHERE am.id = $1`,
      [req.params.monthId]
    );

    if (month.rows.length === 0) {
      res.status(404).json({ error: 'Academic month not found' });
      return;
    }

    const students = await pool.query(
      `SELECT s.*, c.name as class_name FROM students s
       JOIN classes c ON s.class_id = c.id
       WHERE s.class_id = $1 AND s.is_active = true
       ORDER BY s.name`,
      [req.params.classId]
    );

    const classSubjects = await pool.query(
      `SELECT s.id, s.name FROM class_subjects cs
       JOIN subjects s ON cs.subject_id = s.id
       WHERE cs.class_id = $1 ORDER BY cs.display_order`,
      [req.params.classId]
    );

    const settings = await pool.query("SELECT key, value FROM settings");
    const settingsMap: Record<string, string> = {};
    settings.rows.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    const studentIds = students.rows.map((s: any) => s.id);
    let marks: any[] = [];
    
    // Students structure to be mapped
    const studentsMap = students.rows.map((s: any) => ({
      ...s,
      attendance: { present: 0, absent: 0, leave: 0, class_total_days: 0 },
      attendancePercentage: 0
    }));

    if (studentIds.length > 0) {
      const marksResult = await pool.query(
        `SELECT em.student_id, em.marks, em.remarks, sub.name as subject_name
         FROM exam_marks em
         JOIN subjects sub ON em.subject_id = sub.id
         WHERE em.academic_month_id = $1 AND em.student_id = ANY($2::int[])
         ORDER BY sub.name`,
        [req.params.monthId, studentIds]
      );
      marks = marksResult.rows;

      // Get monthly attendance for all students in the class
      const attendanceResult = await pool.query(
        `SELECT student_id, total_days, present_days 
         FROM monthly_attendance 
         WHERE student_id = ANY($1::int[]) AND academic_month_id = $2`,
        [studentIds, req.params.monthId]
      );

      attendanceResult.rows.forEach((row: any) => {
        const student = studentsMap.find((s: any) => s.id === row.student_id);
        if (student) {
          student.attendance = {
            present: row.present_days,
            absent: row.total_days - row.present_days,
            leave: 0,
            class_total_days: row.total_days
          };
          student.attendancePercentage = row.total_days > 0 
            ? Math.round((row.present_days / row.total_days) * 100) 
            : 0;
        }
      });
    }

    const studentsData = studentsMap.map((student: any) => {
      const studentMarks = marks.filter(m => m.student_id === student.id);
      return {
        student,
        marks: studentMarks,
        attendance: student.attendance
      };
    });

    res.json({
      institution: settingsMap,
      month: month.rows[0],
      subjects: classSubjects.rows,
      students: studentsData
    });
  } catch (err) {
    console.error('Get class progress card error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

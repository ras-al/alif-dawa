import re

with open('/home/rasal/Documents/MyWorks/alif/backend/src/routes/marks.ts', 'r') as f:
    content = f.read()

# Patch 1: individual student
old_attendance = """    const attendanceSummary: Record<string, number> = { present: 0, absent: 0, leave: 0 };
    attendance.rows.forEach((row: { status: string; count: string }) => {
      attendanceSummary[row.status] = parseInt(row.count);
    });"""

new_attendance = """    const attendanceSummary: Record<string, number> = { present: 0, absent: 0, leave: 0 };
    attendance.rows.forEach((row: { status: string; count: string }) => {
      attendanceSummary[row.status] = parseInt(row.count);
    });
    
    const classTotalDaysResult = await pool.query(
      `SELECT COUNT(DISTINCT a.date) as class_total_days 
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE s.class_id = $1`,
      [student.rows[0].class_id]
    );
    attendanceSummary['class_total_days'] = parseInt(classTotalDaysResult.rows[0].class_total_days || '0');"""

content = content.replace(old_attendance, new_attendance)

# Patch 2: class wide
old_class_attendance = """    const studentsData = students.rows.map((student: any) => {
      const studentMarks = marks.filter(m => m.student_id === student.id);
      const studentAttendance = attendance.filter(a => a.student_id === student.id);
      const attendanceSummary: Record<string, number> = { present: 0, absent: 0, leave: 0 };"""

new_class_attendance = """    const classTotalDaysResult = await pool.query(
      `SELECT COUNT(DISTINCT a.date) as class_total_days 
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE s.class_id = $1`,
      [req.params.classId]
    );
    const classTotalDays = parseInt(classTotalDaysResult.rows[0].class_total_days || '0');

    const studentsData = students.rows.map((student: any) => {
      const studentMarks = marks.filter(m => m.student_id === student.id);
      const studentAttendance = attendance.filter(a => a.student_id === student.id);
      const attendanceSummary: Record<string, number> = { present: 0, absent: 0, leave: 0, class_total_days: classTotalDays };"""

content = content.replace(old_class_attendance, new_class_attendance)

with open('/home/rasal/Documents/MyWorks/alif/backend/src/routes/marks.ts', 'w') as f:
    f.write(content)

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'teacher' | 'student' | 'class';
  roleId: number;
  profile?: TeacherProfile | StudentProfile | ClassProfile | null;
  classId?: number;
  className?: string;
}

export interface TeacherProfile {
  id: number;
  name: string;
}

export interface StudentProfile {
  id: number;
  name: string;
  admission_number: string;
  class_name: string;
}

export interface ClassProfile {
  id: number;
  name: string;
}

export interface Student {
  id: number;
  user_id: number | null;
  admission_number: string;
  name: string;
  father_name: string | null;
  class_id: number | null;
  class_name?: string;
  phone: string | null;
  address: string | null;
  date_of_admission: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Teacher {
  id: number;
  user_id: number | null;
  name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  username?: string;
  assigned_classes?: string[];
  classes?: { class_id: number; class_name: string; year_name: string }[];
}

export interface ClassRecord {
  id: number;
  name: string;
  display_order: number;
  user_id?: number | null;
  login_username?: string;
  login_active?: boolean;
  subjects?: Subject[];
}

export interface Subject {
  id: number;
  name: string;
  display_order?: number;
}

export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface AcademicMonth {
  id: number;
  academic_year_id: number;
  name: string;
  month_number: number;
  status: 'open' | 'locked';
}

export interface ExamMark {
  id?: number;
  student_id: number;
  subject_id: number;
  academic_month_id: number;
  marks: number | null;
  remarks: string | null;
  subject_name?: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  target_role: string | null;
  created_by_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface LeaveRequest {
  id: number;
  student_id: number;
  student_name?: string;
  admission_number?: string;
  class_name?: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  review_remarks: string | null;
  created_at: string;
}

export interface AttendanceRecord {
  student_id: number;
  name: string;
  admission_number: string;
  status: 'present' | 'absent' | 'leave' | null;
  attendance_id: number | null;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  username?: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalReports: number;
  pendingLeaves: number;
}

export interface ClassDashboardStats {
  className: string;
  totalStudents: number;
  subjects: Subject[];
  teacherSubjects: { subject_id: number; teacher_id: number; teacher_name: string; subject_name: string }[];
  todayAttendance: { present: number; absent: number; leave: number };
  pendingLeaves: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ProgressCardData {
  institution: Record<string, string>;
  student: Student;
  month: AcademicMonth & { year_name: string };
  marks: { marks: number | null; remarks: string | null; subject_name: string }[];
  attendance?: { present: number; absent: number; leave: number; class_total_days?: number };
}

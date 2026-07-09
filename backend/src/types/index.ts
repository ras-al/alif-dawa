import { Request } from 'express';

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  roleId: number;
}

export interface AuthRequest extends Request<Record<string, string>> {
  user?: AuthUser;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface Student {
  id: number;
  user_id: number | null;
  admission_number: string;
  name: string;
  father_name: string | null;
  class_id: number | null;
  phone: string | null;
  address: string | null;
  date_of_admission: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  class_name?: string;
}

export interface Teacher {
  id: number;
  user_id: number | null;
  name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  username?: string;
  assigned_classes?: string[];
}

export interface ClassRecord {
  id: number;
  name: string;
  display_order: number;
  subjects?: Subject[];
}

export interface Subject {
  id: number;
  name: string;
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
  id: number;
  student_id: number;
  subject_id: number;
  academic_month_id: number;
  marks: number | null;
  remarks: string | null;
  entered_by: number | null;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  target_role: string | null;
  created_by: number | null;
  is_active: boolean;
  created_at: string;
}

export interface LeaveRequest {
  id: number;
  student_id: number;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: number | null;
  review_remarks: string | null;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  student_id: number;
  date: string;
  status: 'present' | 'absent' | 'leave';
  marked_by: number | null;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

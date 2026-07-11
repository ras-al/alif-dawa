import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { auditLog, getClientIp } from '../middleware/audit';
import multer from 'multer';
import * as XLSX from 'xlsx';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/students
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', search = '', class_id, status } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let whereClause = 'WHERE 1=1';
    const params: (string | number | boolean)[] = [];
    let paramIndex = 1;

    // Class login: only see students in their class
    if (req.user!.role === 'class' && req.user!.classId) {
      whereClause += ` AND s.class_id = $${paramIndex}`;
      params.push(req.user!.classId);
      paramIndex++;
    }
    // Teachers can only see their assigned classes
    else if (req.user!.role === 'teacher') {
      const teacherResult = await pool.query('SELECT id FROM teachers WHERE user_id = $1', [req.user!.id]);
      if (teacherResult.rows.length === 0) {
        res.json({ data: [], total: 0, page: parseInt(page), limit: parseInt(limit) });
        return;
      }
      const teacherId = teacherResult.rows[0].id;
      const assignedClasses = await pool.query(
        `SELECT class_id FROM class_teacher_subjects cts
         JOIN academic_years ay ON cts.academic_year_id = ay.id
         WHERE cts.teacher_id = $1 AND ay.is_active = true
         UNION
         SELECT id as class_id FROM classes WHERE charge_teacher_id = $1`,
        [teacherId]
      );
      const classIds = assignedClasses.rows.map((r: { class_id: number }) => r.class_id);
      if (classIds.length === 0) {
        res.json({ data: [], total: 0, page: parseInt(page), limit: parseInt(limit) });
        return;
      }
      whereClause += ` AND s.class_id = ANY($${paramIndex}::int[])`;
      params.push(classIds as unknown as string);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (s.name ILIKE $${paramIndex} OR s.admission_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (class_id) {
      // For class login, ignore external class_id filter to prevent cross-class access
      if (req.user!.role !== 'class') {
        whereClause += ` AND s.class_id = $${paramIndex}`;
        params.push(parseInt(class_id));
        paramIndex++;
      }
    }

    if (status === 'active') {
      whereClause += ` AND s.is_active = true`;
    } else if (status === 'inactive') {
      whereClause += ` AND s.is_active = false`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM students s ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, parseInt(limit), offset];
    const result = await pool.query(
      `SELECT s.*, c.name as class_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       ${whereClause}
       ORDER BY s.name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      dataParams
    );

    res.json({
      data: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/students/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT s.*, c.name as class_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    // Class login: verify student belongs to this class
    if (req.user!.role === 'class' && req.user!.classId) {
      if (result.rows[0].class_id !== req.user!.classId) {
        res.status(403).json({ error: 'Access denied: student not in your class' });
        return;
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get student error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/students
router.post('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { admission_number, name, father_name, class_id, phone, address, date_of_admission, create_account, password } = req.body;

  if (!admission_number || !name) {
    res.status(400).json({ error: 'Admission number and name are required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let userId = null;
    if (create_account && password) {
      const hash = await bcrypt.hash(password, 10);
      const roleResult = await client.query("SELECT id FROM roles WHERE name = 'student'");
      const userResult = await client.query(
        `INSERT INTO users (username, password_hash, role_id)
         VALUES ($1, $2, $3) RETURNING id`,
        [admission_number, hash, roleResult.rows[0].id]
      );
      userId = userResult.rows[0].id;
    }

    const result = await client.query(
      `INSERT INTO students (user_id, admission_number, name, father_name, class_id, phone, address, date_of_admission)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, admission_number, name, father_name || null, class_id || null, phone || null, address || null, date_of_admission || null]
    );

    await client.query('COMMIT');

    await auditLog(req.user!.id, 'CREATE', 'student', result.rows[0].id, { name, admission_number }, getClientIp(req));

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      res.status(409).json({ error: 'Admission number already exists' });
      return;
    }
    console.error('Create student error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PUT /api/students/:id
router.put('/:id', authenticate, authorize('admin', 'class'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { admission_number, name, father_name, class_id, phone, address, date_of_admission, is_active } = req.body;

  try {
    const updates = [];
    const params = [];
    let paramIdx = 1;

    if (admission_number !== undefined) {
      updates.push(`admission_number = $${paramIdx++}`);
      params.push(admission_number);
    }
    if (name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      params.push(name);
    }
    if (father_name !== undefined) {
      updates.push(`father_name = $${paramIdx++}`);
      params.push(father_name);
    }
    if (class_id !== undefined) {
      updates.push(`class_id = $${paramIdx++}`);
      params.push(class_id);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIdx++}`);
      params.push(phone);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIdx++}`);
      params.push(address);
    }
    if (date_of_admission !== undefined) {
      updates.push(`date_of_admission = $${paramIdx++}`);
      params.push(date_of_admission);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIdx++}`);
      params.push(is_active);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(req.params.id);

    const query = `UPDATE students SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`;
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    await auditLog(req.user!.id, 'UPDATE', 'student', parseInt(req.params.id), req.body, getClientIp(req));

    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Admission number already exists' });
      return;
    }
    console.error('Update student error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/students/:id
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING id, name', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    await auditLog(req.user!.id, 'DELETE', 'student', parseInt(req.params.id), { name: result.rows[0].name }, getClientIp(req));
    res.json({ message: 'Student deleted' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/students/import
router.post('/import', authenticate, authorize('admin'), upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

    if (data.length === 0) {
      res.status(400).json({ error: 'No data found in file' });
      return;
    }

    // Fetch class name-to-id map
    const classResult = await pool.query('SELECT id, name FROM classes');
    const classMap: Record<string, number> = {};
    classResult.rows.forEach((c: { id: number; name: string }) => {
      classMap[c.name.toLowerCase()] = c.id;
    });

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of data) {
      const admNo = String(row['Admission Number'] || row['admission_number'] || '').trim();
      const name = String(row['Name'] || row['name'] || '').trim();
      const fatherName = String(row['Father Name'] || row['father_name'] || '').trim();
      const className = String(row['Class'] || row['class'] || '').trim();
      const phone = String(row['Phone'] || row['phone'] || '').trim();
      const address = String(row['Address'] || row['address'] || '').trim();

      if (!admNo || !name) {
        skipped++;
        errors.push(`Row skipped: missing admission number or name`);
        continue;
      }

      const classId = classMap[className.toLowerCase()] || null;

      try {
        await pool.query(
          `INSERT INTO students (admission_number, name, father_name, class_id, phone, address)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (admission_number) DO NOTHING`,
          [admNo, name, fatherName || null, classId, phone || null, address || null]
        );
        imported++;
      } catch (err) {
        skipped++;
        errors.push(`Failed to import ${admNo}: ${err}`);
      }
    }

    await auditLog(req.user!.id, 'IMPORT', 'student', null, { imported, skipped, totalRows: data.length }, getClientIp(req));

    res.json({ imported, skipped, errors: errors.slice(0, 10) });
  } catch (err) {
    console.error('Import students error:', err);
    res.status(500).json({ error: 'Failed to parse file' });
  }
});

export default router;

import re

with open('/home/rasal/Documents/MyWorks/alif/backend/src/routes/students.ts', 'r') as f:
    content = f.read()

old_put = """// PUT /api/students/:id
router.put('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, father_name, class_id, phone, address, date_of_admission, is_active } = req.body;

  try {
    const result = await pool.query(
      `UPDATE students SET name = COALESCE($1, name), father_name = $2, class_id = $3,
       phone = $4, address = $5, date_of_admission = $6, is_active = COALESCE($7, is_active),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [name, father_name, class_id, phone, address, date_of_admission, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    await auditLog(req.user!.id, 'UPDATE', 'student', parseInt(req.params.id), req.body, getClientIp(req));

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});"""

new_put = """// PUT /api/students/:id
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
});"""

if old_put in content:
    content = content.replace(old_put, new_put)
    with open('/home/rasal/Documents/MyWorks/alif/backend/src/routes/students.ts', 'w') as f:
        f.write(content)
    print("Backend patched successfully")
else:
    print("Could not find old_put in backend/src/routes/students.ts")


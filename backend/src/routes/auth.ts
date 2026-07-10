import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import pool from '../db';
import { AuthRequest } from '../types';
import { authenticate } from '../middleware/auth';
import { auditLog, getClientIp } from '../middleware/audit';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.password_hash, u.is_active, r.id as role_id, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];

    if (!user.is_active) {
      res.status(403).json({ error: 'Account is disabled' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Build JWT payload
    const tokenPayload: Record<string, unknown> = {
      id: user.id,
      username: user.username,
      role: user.role,
      roleId: user.role_id,
    };

    // If this is a class login, attach the class id
    let classInfo = null;
    if (user.role === 'class') {
      const classResult = await pool.query(
        'SELECT id, name FROM classes WHERE user_id = $1',
        [user.id]
      );
      if (classResult.rows.length > 0) {
        classInfo = classResult.rows[0];
        tokenPayload.classId = classInfo.id;
      }
    }

    const accessToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRY || '15m' } as SignOptions
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' } as SignOptions
    );

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    await auditLog(user.id, 'LOGIN', 'user', user.id, null, getClientIp(req));

    // Get associated profile info
    let profile = null;
    if (user.role === 'teacher') {
      const teacherResult = await pool.query('SELECT id, name FROM teachers WHERE user_id = $1', [user.id]);
      if (teacherResult.rows.length > 0) profile = teacherResult.rows[0];
    } else if (user.role === 'student') {
      const studentResult = await pool.query(
        `SELECT s.id, s.name, s.admission_number, c.name as class_name
         FROM students s LEFT JOIN classes c ON s.class_id = c.id
         WHERE s.user_id = $1`,
        [user.id]
      );
      if (studentResult.rows.length > 0) profile = studentResult.rows[0];
    } else if (user.role === 'class' && classInfo) {
      profile = { id: classInfo.id, name: classInfo.name };
    }

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        roleId: user.role_id,
        profile,
        ...(user.role === 'class' && classInfo ? { classId: classInfo.id, className: classInfo.name } : {}),
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: AuthRequest, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token is required' });
    return;
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret'
    ) as { id: number };

    const tokenResult = await pool.query(
      'SELECT * FROM refresh_tokens WHERE user_id = $1 AND token = $2 AND expires_at > NOW()',
      [decoded.id, refreshToken]
    );

    if (tokenResult.rows.length === 0) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const userResult = await pool.query(
      `SELECT u.id, u.username, u.is_active, r.id as role_id, r.name as role
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      res.status(401).json({ error: 'User not found or disabled' });
      return;
    }

    const user = userResult.rows[0];
    const tokenPayload: Record<string, unknown> = {
      id: user.id,
      username: user.username,
      role: user.role,
      roleId: user.role_id,
    };

    // Re-attach classId for class role
    if (user.role === 'class') {
      const classResult = await pool.query('SELECT id FROM classes WHERE user_id = $1', [user.id]);
      if (classResult.rows.length > 0) {
        tokenPayload.classId = classResult.rows[0].id;
      }
    }

    const newAccessToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRY || '15m' } as SignOptions
    );

    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user!.id]);
    await auditLog(req.user!.id, 'LOGOUT', 'user', req.user!.id, null, getClientIp(req));
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, r.name as role, r.id as role_id
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    let profile = null;
    let classId: number | undefined;
    let className: string | undefined;

    if (user.role === 'teacher') {
      const t = await pool.query('SELECT id, name FROM teachers WHERE user_id = $1', [user.id]);
      if (t.rows.length > 0) profile = t.rows[0];
    } else if (user.role === 'student') {
      const s = await pool.query(
        `SELECT s.id, s.name, s.admission_number, c.name as class_name
         FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.user_id = $1`,
        [user.id]
      );
      if (s.rows.length > 0) profile = s.rows[0];
    } else if (user.role === 'class') {
      const c = await pool.query('SELECT id, name FROM classes WHERE user_id = $1', [user.id]);
      if (c.rows.length > 0) {
        profile = { id: c.rows[0].id, name: c.rows[0].name };
        classId = c.rows[0].id;
        className = c.rows[0].name;
      }
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      roleId: user.role_id,
      profile,
      ...(classId ? { classId, className } : {}),
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current and new passwords are required' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' });
    return;
  }

  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user!.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, req.user!.id]);

    await auditLog(req.user!.id, 'CHANGE_PASSWORD', 'user', req.user!.id, null, getClientIp(req));

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

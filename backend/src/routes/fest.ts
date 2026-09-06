import express, { Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../db';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import { AuthRequest } from '../types';

const router = express.Router();

// Setup multer for template upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    if (file.fieldname === 'card_template') {
      cb(null, `participant-card-template${ext}`);
    } else {
      cb(null, `poster-template-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    }
  }
});
const upload = multer({ storage });

// ==========================================
// SSE NOTIFICATION SYSTEM FOR LEADERS
// ==========================================

interface SSEClient {
  id: number;
  userId: number;
  teamId: number;
  res: Response;
}

const sseClients: SSEClient[] = [];
let sseClientId = 0;

function sendToTeamLeaders(teamId: number, data: object) {
  sseClients.forEach(client => {
    if (client.teamId === teamId) {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  });
}

// ==========================================
// PUBLIC ROUTES
// ==========================================

router.get('/public/programs', async (req, res) => {
  try {
    const eventType = req.query.event_type || 'MAIN';
    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.category, p.type, p.status, p.is_called, p.is_group, p.team_limit, p.judging_locked,
              COUNT(r.id)::int as registered_count
       FROM fest_programs p
       LEFT JOIN fest_registrations r ON r.fest_program_id = p.id
       WHERE p.event_type = $1
       GROUP BY p.id
       ORDER BY p.id ASC`,
      [eventType]
    );
    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/public/results', async (req, res) => {
  try {
    const eventType = req.query.event_type || 'MAIN';
    const { rows } = await pool.query(
      `SELECT MAX(r.id) as id, r.position, MAX(r.points) as points, MAX(r.grade) as grade, p.title as program_title, p.category, p.type, p.is_group,
              t.name as team_name, string_agg(s.name, ', ') as student_name, p.sequence_number
       FROM fest_results r
       JOIN fest_programs p ON r.fest_program_id = p.id
       JOIN fest_registrations reg ON r.fest_registration_id = reg.id
       JOIN fest_participants part ON reg.fest_participant_id = part.id
       JOIN students s ON part.student_id = s.id
       JOIN fest_teams t ON part.fest_team_id = t.id
       WHERE r.published_at IS NOT NULL AND p.event_type = $1
       GROUP BY p.id, r.position, p.title, p.category, p.type, p.is_group, t.name, p.sequence_number
       ORDER BY p.sequence_number ASC NULLS LAST, p.id ASC, r.position ASC`,
      [eventType]
    );
    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/public/leaderboard', async (req, res) => {
  try {
    const eventType = req.query.event_type || 'MAIN';
    const { rows } = await pool.query(
      `SELECT t.id, t.name as team_name, COALESCE(SUM(r.points), 0)::int as total_points
       FROM fest_teams t
       LEFT JOIN fest_participants part ON t.id = part.fest_team_id
       LEFT JOIN fest_registrations reg ON part.id = reg.fest_participant_id
       LEFT JOIN fest_results r ON reg.id = r.fest_registration_id AND r.published_at IS NOT NULL
       WHERE t.event_type = $1
       GROUP BY t.id, t.name
       ORDER BY total_points DESC`,
      [eventType]
    );
    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Participant picks code letter. The participant needs a way to verify identity. 
// For now, they can just provide their chest_number and the program_id.
router.post('/public/pick-code', async (req, res) => {
  const { chest_number, program_id } = req.body;
  if (!chest_number || !program_id) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const participant = await pool.query(`SELECT id FROM fest_participants WHERE chest_number = $1`, [chest_number]);
    if (participant.rows.length === 0) return res.status(404).json({ error: 'Participant not found' });
    const participantId = participant.rows[0].id;

    // Check if registration exists
    const reg = await pool.query(`SELECT id, code_letter FROM fest_registrations WHERE fest_participant_id = $1 AND fest_program_id = $2`, [participantId, program_id]);
    if (reg.rows.length === 0) return res.status(404).json({ error: 'Not registered for this program' });

    if (reg.rows[0].code_letter) {
      return res.json({ code_letter: reg.rows[0].code_letter });
    }

    // Generate a random code letter from available pool (constrained to first N letters for N participants)
    const countRes = await pool.query(`SELECT COUNT(*)::int as total FROM fest_registrations WHERE fest_program_id = $1`, [program_id]);
    const totalCount = countRes.rows[0].total || 1;

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const validLetters = totalCount <= 26 ? letters.slice(0, Math.max(totalCount, 1)) : letters;

    const usedCodes = await pool.query(`SELECT code_letter FROM fest_registrations WHERE fest_program_id = $1 AND code_letter IS NOT NULL`, [program_id]);
    const used = new Set(usedCodes.rows.map(r => r.code_letter));
    
    const available = validLetters.filter(l => !used.has(l));
    
    let newCode = null;
    if (available.length > 0) {
      const randomIndex = Math.floor(Math.random() * available.length);
      newCode = available[randomIndex];
    } else {
      const fallbackAvailable = letters.filter(l => !used.has(l));
      if (fallbackAvailable.length > 0) {
        newCode = fallbackAvailable[Math.floor(Math.random() * fallbackAvailable.length)];
      }
    }
    if (!newCode) return res.status(500).json({ error: 'Ran out of code letters' });

    await pool.query(`UPDATE fest_registrations SET code_letter = $1 WHERE id = $2`, [newCode, reg.rows[0].id]);
    res.json({ code_letter: newCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// SSE NOTIFICATIONS (Custom Auth)
// ==========================================

// SSE stream for real-time leader notifications
// Supports token via query parameter since EventSource doesn't support custom headers
router.get('/leader/notifications/stream', async (req: AuthRequest, res) => {
  // Extract token from query parameter or Authorization header
  const token = (req.query.token as string) || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  let userId: number;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    if (decoded.role !== 'leader') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    userId = decoded.id;
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // Find which team this leader belongs to
  const teamRes = await pool.query(
    `SELECT fest_team_id FROM fest_team_leaders WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  if (teamRes.rows.length === 0) {
    res.status(403).json({ error: 'You are not assigned to any team' });
    return;
  }
  const teamId = teamRes.rows[0].fest_team_id;

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Leader notification stream connected' })}\n\n`);

  const clientId = ++sseClientId;
  sseClients.push({ id: clientId, userId, teamId, res });

  // Keep alive every 20s
  const keepAlive = setInterval(() => {
    res.write(`: keepalive\n\n`);
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    const idx = sseClients.findIndex(c => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// Public GET all poster templates
router.get('/public/poster-templates', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, version, image_url, config, updated_at FROM fest_poster_templates ORDER BY version ASC`
    );
    const templates: Record<string, any> = {};
    rows.forEach(r => {
      const v = r.version || 'v1';
      templates[v] = {
        configured: Boolean(r.image_url),
        id: r.id,
        version: v,
        image_url: r.image_url,
        config: r.config,
        updated_at: r.updated_at
      };
    });
    res.json({
      templates,
      available_versions: Object.keys(templates).filter(v => templates[v].configured),
      all_versions: ['v1', 'v2', 'v3']
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Public GET single poster template (supports ?version=v1)
router.get('/public/poster-template', async (req, res) => {
  try {
    const version = (req.query.version as string) || 'v1';
    let { rows } = await pool.query(
      `SELECT id, version, image_url, config FROM fest_poster_templates WHERE version = $1 LIMIT 1`,
      [version]
    );
    if (rows.length === 0) {
      const fallback = await pool.query(`SELECT id, version, image_url, config FROM fest_poster_templates ORDER BY id ASC LIMIT 1`);
      rows = fallback.rows;
    }
    if (rows.length === 0) {
      return res.json({ configured: false, version, image_url: null, config: null });
    }
    res.json({ configured: true, ...rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Public GET participant card template
router.get('/public/participant-card-template', async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT image_url, config FROM fest_participant_card_templates ORDER BY id DESC LIMIT 1`);
    if (rows.length === 0) {
      return res.json({ configured: false, image_url: null, config: null });
    }
    res.json({ configured: true, ...rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ==========================================
// AUTHENTICATED ROUTES
// ==========================================

router.use(authenticate);

// Admin Routes
router.get('/admin/teams', authorize('admin'), async (req, res) => {
  try {
    const eventType = req.query.event_type || 'MAIN';
    const { rows } = await pool.query(`SELECT * FROM fest_teams WHERE event_type = $1 ORDER BY id ASC`, [eventType]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/teams', authorize('admin'), async (req: AuthRequest, res) => {
  const { name, chest_number_start, event_type } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO fest_teams (name, chest_number_start, event_type) VALUES ($1, $2, $3) RETURNING *`,
      [name, chest_number_start, event_type || 'MAIN']
    );
    res.json(rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.delete('/admin/teams/:id', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    await pool.query(`DELETE FROM fest_teams WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.post('/admin/programs', authorize('admin'), async (req: AuthRequest, res) => {
  const { title, category, type, max_judges, event_type } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO fest_programs (title, category, type, max_judges, event_type) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, category, type, max_judges, event_type || 'MAIN']
    );
    res.json(rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.put('/admin/programs/:id/status', authorize('admin', 'stage_admin'), async (req: AuthRequest, res) => {
  const { status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE fest_programs SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    res.json(rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.put('/admin/programs/:id', authorize('admin'), async (req: AuthRequest, res) => {
  const { title, category, type, team_limit, is_group } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE fest_programs 
       SET title = $1, category = $2, type = $3, team_limit = $4, is_group = $5 
       WHERE id = $6 RETURNING *`,
      [title, category, type, team_limit, is_group, req.params.id]
    );
    res.json(rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.put('/admin/programs/:id/unlock', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    await pool.query('UPDATE fest_programs SET judging_locked = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/admin/programs/:id', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    await pool.query(`DELETE FROM fest_programs WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Judge assignments
router.post('/admin/assign-judge', authorize('admin'), async (req: AuthRequest, res) => {
  const { fest_program_id, judge_names } = req.body;
  try {
    if (!Array.isArray(judge_names)) {
      return res.status(400).json({ error: 'judge_names must be an array' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM fest_program_judges WHERE fest_program_id = $1`, [fest_program_id]);
      for (const name of judge_names) {
        await client.query(
          `INSERT INTO fest_program_judges (fest_program_id, judge_name) VALUES ($1, $2)`,
          [fest_program_id, name]
        );
      }
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message || 'Server error' });
    } finally {
      client.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/admin/judges', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const { rows } = await pool.query(`SELECT id, username FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'judge')`);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Get all judge assignments
router.get('/admin/judge-assignments', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pj.id, pj.fest_program_id, pj.judge_name, 
             p.title as program_title, p.category as program_category
      FROM fest_program_judges pj
      JOIN fest_programs p ON pj.fest_program_id = p.id
      ORDER BY p.title, pj.judge_name
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Delete a judge assignment
router.delete('/admin/judge-assignments/:id', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    await pool.query(`DELETE FROM fest_program_judges WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Fest Settings (leader edit lock, etc.)
router.get('/admin/fest-settings', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT key, value FROM settings WHERE key LIKE 'fest_%'`
    );
    const settings: Record<string, string> = {};
    rows.forEach((r: any) => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.put('/admin/fest-settings', authorize('admin'), async (req: AuthRequest, res) => {
  const settings = req.body;
  try {
    for (const [key, value] of Object.entries(settings)) {
      if (!key.startsWith('fest_')) continue;
      await pool.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value as string]
      );
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});



router.get('/admin/individual-points', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const eventType = req.query.event_type || 'MAIN';
    const { rows } = await pool.query(
      `WITH student_group_points AS (
         SELECT 
           reg.fest_participant_id,
           ROUND(SUM(fr.points::decimal / GREATEST(cnt.member_count, 1)), 1) as group_points
         FROM fest_results fr
         JOIN fest_registrations winner_reg ON fr.fest_registration_id = winner_reg.id
         JOIN fest_participants winner_part ON winner_reg.fest_participant_id = winner_part.id
         JOIN fest_programs fp ON fr.fest_program_id = fp.id
         JOIN (
           SELECT r2.fest_program_id, p2.fest_team_id, COUNT(*) as member_count
           FROM fest_registrations r2
           JOIN fest_participants p2 ON r2.fest_participant_id = p2.id
           GROUP BY r2.fest_program_id, p2.fest_team_id
         ) cnt ON cnt.fest_program_id = fr.fest_program_id AND cnt.fest_team_id = winner_part.fest_team_id
         JOIN fest_registrations reg ON reg.fest_program_id = fr.fest_program_id
         JOIN fest_participants p ON reg.fest_participant_id = p.id AND p.fest_team_id = winner_part.fest_team_id
         WHERE fp.is_group = true AND fr.published_at IS NOT NULL
         GROUP BY reg.fest_participant_id
       )
       SELECT 
          part.id, 
          s.name as student_name, 
          part.chest_number,
          t.name as team_name,
          COALESCE(SUM(CASE WHEN p.type = 'stage' AND p.is_group = false THEN r.points ELSE 0 END), 0)::numeric(10,1) as stage_points,
          COALESCE(SUM(CASE WHEN p.type = 'off-stage' AND p.is_group = false THEN r.points ELSE 0 END), 0)::numeric(10,1) as off_stage_points,
          (COALESCE(SUM(CASE WHEN p.type = 'stage' AND p.is_group = false THEN r.points ELSE 0 END), 0) + 
           COALESCE(SUM(CASE WHEN p.type = 'off-stage' AND p.is_group = false THEN r.points ELSE 0 END), 0))::numeric(10,1) as individual_points,
          COALESCE(sgp.group_points, 0)::numeric(10,1) as group_points,
          (COALESCE(SUM(CASE WHEN p.is_group = false THEN r.points ELSE 0 END), 0) + COALESCE(sgp.group_points, 0))::numeric(10,1) as total_points
       FROM fest_participants part
       JOIN students s ON part.student_id = s.id
       LEFT JOIN fest_teams t ON part.fest_team_id = t.id
       LEFT JOIN fest_registrations reg ON part.id = reg.fest_participant_id
       LEFT JOIN fest_results r ON reg.id = r.fest_registration_id AND r.published_at IS NOT NULL
       LEFT JOIN fest_programs p ON reg.fest_program_id = p.id
       LEFT JOIN student_group_points sgp ON part.id = sgp.fest_participant_id
       WHERE t.event_type = $1
       GROUP BY part.id, s.name, part.chest_number, t.name, sgp.group_points
       ORDER BY total_points DESC`, [eventType]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/admin/users', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.username, r.name as role,
             ftl.fest_team_id, ft.name as team_name, ftl.is_first_leader
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      LEFT JOIN fest_team_leaders ftl ON u.id = ftl.user_id
      LEFT JOIN fest_teams ft ON ftl.fest_team_id = ft.id
      WHERE r.name IN ('judge', 'stage_admin', 'green_room', 'announcer', 'leader', 'media', 'award_point')
      ORDER BY r.name, u.username
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.delete('/admin/users/:id', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const userId = req.params.id;
    if (req.user?.id === parseInt(userId)) {
      return res.status(400).json({ error: "Cannot delete your own account." });
    }
    // Clean up dependent records safely across all tables referencing users(id)
    await pool.query(`DELETE FROM audit_logs WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM fest_team_leaders WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM fest_program_judges WHERE judge_id = $1`, [userId]);
    await pool.query(`DELETE FROM fest_marks WHERE judge_id = $1`, [userId]);
    await pool.query(`UPDATE fest_results SET published_by = NULL WHERE published_by = $1`, [userId]);
    await pool.query(`UPDATE classes SET user_id = NULL WHERE user_id = $1`, [userId]);
    await pool.query(`UPDATE teachers SET user_id = NULL WHERE user_id = $1`, [userId]);
    await pool.query(`UPDATE students SET user_id = NULL WHERE user_id = $1`, [userId]);
    await pool.query(`UPDATE attendance SET marked_by = NULL WHERE marked_by = $1`, [userId]);
    await pool.query(`UPDATE exam_marks SET entered_by = NULL WHERE entered_by = $1`, [userId]);
    await pool.query(`UPDATE leave_requests SET reviewed_by = NULL WHERE reviewed_by = $1`, [userId]);
    await pool.query(`UPDATE announcements SET created_by = NULL WHERE created_by = $1`, [userId]);
    await pool.query(`UPDATE events SET created_by = NULL WHERE created_by = $1`, [userId]);
    
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Assign leader to a team
router.post('/admin/assign-leader', authorize('admin'), async (req: AuthRequest, res) => {
  const { user_id, fest_team_id, is_first_leader } = req.body;
  try {
    await pool.query(
      `INSERT INTO fest_team_leaders (user_id, fest_team_id, is_first_leader) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, fest_team_id) DO UPDATE SET is_first_leader = EXCLUDED.is_first_leader`,
      [user_id, fest_team_id, is_first_leader || false]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.delete('/admin/leader-assignment/:userId', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    await pool.query(`DELETE FROM fest_team_leaders WHERE user_id = $1`, [req.params.userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Participants
router.get('/admin/participants', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const eventType = req.query.event_type || 'MAIN';
    const { rows } = await pool.query(`
      SELECT p.id, p.chest_number, p.category, s.name as student_name, s.admission_number, t.name as team_name, t.id as team_id
      FROM fest_participants p
      JOIN students s ON p.student_id = s.id
      JOIN fest_teams t ON p.fest_team_id = t.id
      WHERE t.event_type = $1
      ORDER BY p.chest_number ASC
    `, [eventType]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.post('/admin/participants', authorize('admin'), async (req: AuthRequest, res) => {
  const { student_id, fest_team_id } = req.body;
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get next chest number and event_type
      const teamRes = await client.query(`SELECT chest_number_start, event_type FROM fest_teams WHERE id = $1`, [fest_team_id]);
      if (teamRes.rows.length === 0) throw new Error('Team not found');
      const start = teamRes.rows[0].chest_number_start;
      const eventType = teamRes.rows[0].event_type || 'MAIN';
      
      // Check if student is already a participant in this event
      const exist = await client.query(`SELECT id FROM fest_participants WHERE student_id = $1 AND event_type = $2`, [student_id, eventType]);
      if (exist.rows.length > 0) {
        throw new Error('Student is already registered as a participant in this event.');
      }
      
      const maxRes = await client.query(`SELECT MAX(chest_number) as max_cn FROM fest_participants WHERE fest_team_id = $1`, [fest_team_id]);
      let nextCn = start;
      if (maxRes.rows[0].max_cn && maxRes.rows[0].max_cn >= start) {
        nextCn = maxRes.rows[0].max_cn + 1;
      }
      
      const { rows } = await client.query(
        `INSERT INTO fest_participants (student_id, fest_team_id, chest_number, event_type) VALUES ($1, $2, $3, $4) RETURNING *`,
        [student_id, fest_team_id, nextCn, eventType]
      );
      await client.query('COMMIT');
      res.json(rows[0]);
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: err.message || 'Server error' });
    } finally {
      client.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.delete('/admin/participants/:id', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    await pool.query(`DELETE FROM fest_participants WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Registrations
router.get('/admin/registrations', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const eventType = req.query.event_type || 'MAIN';
    const { rows } = await pool.query(`
      SELECT r.id, r.code_letter, p.chest_number, s.name as student_name, pr.title as program_title, pr.id as program_id
      FROM fest_registrations r
      JOIN fest_participants p ON r.fest_participant_id = p.id
      JOIN students s ON p.student_id = s.id
      JOIN fest_programs pr ON r.fest_program_id = pr.id
      WHERE pr.event_type = $1
      ORDER BY r.id DESC
    `, [eventType]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.post('/admin/registrations', authorize('admin'), async (req: AuthRequest, res) => {
  const { fest_participant_id, fest_program_id } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO fest_registrations (fest_participant_id, fest_program_id) VALUES ($1, $2) RETURNING *`,
      [fest_participant_id, fest_program_id]
    );
    res.json(rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(400).json({ error: 'Participant is already registered for this program.' });
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.delete('/admin/registrations/:id', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    await pool.query(`DELETE FROM fest_registrations WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});
// Judge Routes
router.get('/judge/programs', authorize('judge', 'admin'), async (req: AuthRequest, res) => {
  try {
    const eventType = req.query.event_type || 'MAIN';
    let query = `SELECT id, title, category, type, status, is_called, is_group, judging_locked FROM fest_programs WHERE event_type = $1 ORDER BY title`;
    let params: any[] = [eventType];
    
    if (req.user?.role === 'judge') {
        // Return only programs that have at least one judge assigned to them
        query = `SELECT DISTINCT p.id, p.title, p.category, p.type, p.status, p.is_called, p.is_group, p.judging_locked 
                 FROM fest_programs p
                 JOIN fest_program_judges pj ON p.id = pj.fest_program_id
                 WHERE p.event_type = $1
                 ORDER BY p.title`;
    }
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/judge/programs/:programId/judges', authorize('judge', 'admin', 'stage_admin', 'green_room'), async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT id, judge_name FROM fest_program_judges WHERE fest_program_id = $1 ORDER BY id`, [req.params.programId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get judge's own marks for a program
router.get('/judge/programs/:programId/my-marks', authorize('judge'), async (req: AuthRequest, res) => {
  const { programId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT m.fest_registration_id as registration_id, m.mark, m.judge_name
       FROM fest_marks m
       JOIN fest_registrations r ON m.fest_registration_id = r.id
       WHERE r.fest_program_id = $1`,
      [programId]
    );
    const marksByReg: any = {};
    rows.forEach((r: any) => { 
      if (!marksByReg[r.registration_id]) {
        marksByReg[r.registration_id] = {};
      }
      marksByReg[r.registration_id][r.judge_name] = parseFloat(r.mark); 
    });
    res.json(marksByReg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/judge/programs/:programId/participants', authorize('judge', 'admin'), async (req, res) => {
  const { programId } = req.params;
  try {
    // Return only code_letters for judging, not names or chest numbers
    const { rows } = await pool.query(
      `SELECT MIN(id) as registration_id, code_letter 
       FROM fest_registrations 
       WHERE fest_program_id = $1 AND code_letter IS NOT NULL
       GROUP BY code_letter`, 
      [programId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/judge/mark', authorize('judge'), async (req: AuthRequest, res) => {
  const { registration_id, judge_name, mark } = req.body;
  if (!judge_name) return res.status(400).json({ error: 'Judge name is required' });
  try {
    const progRes = await pool.query(
      `SELECT p.status, p.judging_locked 
       FROM fest_programs p 
       JOIN fest_registrations r ON p.id = r.fest_program_id 
       WHERE r.id = $1`, [registration_id]
    );
    if (progRes.rows.length === 0) return res.status(404).json({ error: 'Program not found' });
    if (progRes.rows[0].status === 'scheduled') {
      return res.status(400).json({ error: 'Program has not started yet' });
    }
    if (progRes.rows[0].judging_locked) {
      return res.status(400).json({ error: 'Marks submission is locked for this program' });
    }

    await pool.query(
      `INSERT INTO fest_marks (fest_registration_id, judge_name, mark) 
       VALUES ($1, $2, $3)
       ON CONFLICT (fest_registration_id, judge_name) DO UPDATE SET mark = EXCLUDED.mark`,
      [registration_id, judge_name, mark]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/judge/programs/:programId/lock', authorize('judge'), async (req: AuthRequest, res) => {
  try {
    await pool.query(`UPDATE fest_programs SET judging_locked = true WHERE id = $1`, [req.params.programId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Green Room Routes
router.get('/green-room/pending', authorize('green_room', 'admin'), async (req, res) => {
  // Programs with marks but no results yet
  try {
    const eventType = req.query.event_type || 'MAIN';
    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.category, p.is_group 
       FROM fest_programs p
       WHERE p.event_type = $1 AND p.judging_locked = true AND EXISTS (
         SELECT 1 FROM fest_registrations reg
         JOIN fest_marks m ON reg.id = m.fest_registration_id
         WHERE reg.fest_program_id = p.id
       ) AND NOT EXISTS (
         SELECT 1 FROM fest_results r WHERE r.fest_program_id = p.id
       )`, [eventType]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/green-room/verified', authorize('green_room', 'admin'), async (req, res) => {
  try {
    const eventType = req.query.event_type || 'MAIN';
    const { rows } = await pool.query(
      `SELECT DISTINCT p.id, p.title, p.category, p.is_group, p.sequence_number,
        (SELECT MAX(published_at) FROM fest_results r WHERE r.fest_program_id = p.id) as published_at
       FROM fest_programs p
       JOIN fest_results r ON p.id = r.fest_program_id
       WHERE p.event_type = $1
       ORDER BY p.sequence_number ASC NULLS LAST, p.title`, [eventType]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/green-room/unmarked', authorize('green_room', 'admin'), async (req, res) => {
  try {
    const eventType = req.query.event_type || 'MAIN';
    const { rows } = await pool.query(`
      SELECT p.id, p.title, p.category, p.status, p.judging_locked,
        (SELECT json_agg(judge_name) FROM fest_program_judges pj WHERE pj.fest_program_id = p.id) as judges,
        COUNT(DISTINCT reg.id) as reg_count
      FROM fest_programs p
      JOIN fest_registrations reg ON p.id = reg.fest_program_id
      WHERE p.event_type = $1 
      AND (p.status IN ('completed', 'judging') OR p.judging_locked = true)
      AND NOT EXISTS (
        SELECT 1 FROM fest_marks m JOIN fest_registrations r2 ON m.fest_registration_id = r2.id WHERE r2.fest_program_id = p.id
      )
      GROUP BY p.id, p.title, p.category, p.status, p.judging_locked
      ORDER BY p.title
    `, [eventType]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.post('/green-room/programs/:id/unlock', authorize('green_room', 'admin'), async (req, res) => {
  try {
    await pool.query(`UPDATE fest_programs SET judging_locked = false, status = 'judging' WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/green-room/program/:programId', authorize('green_room', 'admin'), async (req, res) => {
    // Get all marks for a program
    const { programId } = req.params;
    try {
        const { rows } = await pool.query(
            `WITH RankedRegs AS (
               SELECT reg.id as registration_id, reg.code_letter, part.chest_number, t.name as team_name,
                      ROW_NUMBER() OVER(PARTITION BY reg.code_letter ORDER BY reg.id ASC) as rn
               FROM fest_registrations reg
               JOIN fest_participants part ON reg.fest_participant_id = part.id
               JOIN fest_teams t ON part.fest_team_id = t.id
               WHERE reg.fest_program_id = $1 AND reg.code_letter IS NOT NULL
             )
             SELECT rr.registration_id, rr.code_letter, rr.chest_number, rr.team_name,
                    m.mark, m.judge_name
             FROM RankedRegs rr
             LEFT JOIN fest_marks m ON rr.registration_id = m.fest_registration_id
             WHERE rr.rn = 1`,
            [programId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Helper: Calculate fest grade from average mark
// Grade Level:
// 90/100 -> A+
// 70/89  -> A
// 60/69  -> B
// 50/59  -> C
// <50    -> No Grade
export function calculateFestGrade(avg: number | null | undefined): string {
  if (avg === null || avg === undefined) return 'No Grade';
  const mark = Number(avg);
  if (isNaN(mark)) return 'No Grade';
  if (mark >= 90) return 'A+';
  if (mark >= 70) return 'A';
  if (mark >= 60) return 'B';
  if (mark >= 50) return 'C';
  return 'No Grade';
}

// Helper: Calculate fest points from grade, position, and group status
// Individual competitions (is_group = false): A+=5, A=3, B=2, C=1
// Group competitions (is_group = true): A+=15, A=13, B=11, C=9
// Position points (in addition to grade): 1st=3, 2nd=2, 3rd=1
export function calculateFestPoints(grade: string | null, position: number, isGroup: boolean | string): number {
  const isGroupBool = typeof isGroup === 'boolean' ? isGroup : Boolean(isGroup && String(isGroup).trim().toLowerCase().includes('general'));
  let gradePoints = 0;
  if (isGroupBool) {
    if (grade === 'A+') gradePoints = 15;
    else if (grade === 'A') gradePoints = 13;
    else if (grade === 'B') gradePoints = 11;
    else if (grade === 'C') gradePoints = 9;
  } else {
    if (grade === 'A+') gradePoints = 5;
    else if (grade === 'A') gradePoints = 3;
    else if (grade === 'B') gradePoints = 2;
    else if (grade === 'C') gradePoints = 1;
  }

  let posPoints = 0;
  if (position === 1) posPoints = 3;
  else if (position === 2) posPoints = 2;
  else if (position === 3) posPoints = 1;

  return gradePoints + posPoints;
}

router.post('/green-room/verify', authorize('green_room', 'admin'), async (req, res) => {
  const { program_id, results } = req.body;
  // results should be array of { registration_id, position, points, grade }
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM fest_results WHERE fest_program_id = $1`, [program_id]);
      
      const colCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='fest_results' AND column_name='grade'
      `);
      const hasGrade = colCheck.rows.length > 0;

      const progRes = await client.query(`SELECT is_group FROM fest_programs WHERE id = $1`, [program_id]);
      const isGroup = Boolean(progRes.rows[0]?.is_group);

      for (const r of results) {
          const finalGrade = r.grade || 'No Grade';
          const expectedPts = calculateFestPoints(finalGrade, r.position, isGroup);
          const finalPoints = expectedPts > 0 || r.points === undefined ? expectedPts : r.points;
          if (hasGrade) {
              await client.query(
                  `INSERT INTO fest_results (fest_program_id, fest_registration_id, position, points, grade, published_at)
                   VALUES ($1, $2, $3, $4, $5, NULL)`,
                  [program_id, r.registration_id, r.position, finalPoints, finalGrade]
              );
          } else {
              await client.query(
                  `INSERT INTO fest_results (fest_program_id, fest_registration_id, position, points, published_at)
                   VALUES ($1, $2, $3, $4, NULL)`,
                  [program_id, r.registration_id, r.position, finalPoints]
              );
          }
      }
      await client.query(`UPDATE fest_programs SET status = 'completed' WHERE id = $1`, [program_id]);
      
      // Assign sequence number (per event_type)
      const seqRes = await client.query(
        `SELECT COALESCE(MAX(fp2.sequence_number), 0) + 1 as next_seq
         FROM fest_programs fp2
         WHERE fp2.event_type = (SELECT event_type FROM fest_programs WHERE id = $1)`,
        [program_id]
      );
      const nextSeq = seqRes.rows[0].next_seq;
      await client.query(
        `UPDATE fest_programs SET sequence_number = $1 WHERE id = $2 AND sequence_number IS NULL`,
        [nextSeq, program_id]
      );
      
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/green-room/programs/:programId/undo-verify', authorize('green_room', 'admin'), async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM fest_results WHERE fest_program_id = $1`, [req.params.programId]);
      await client.query(`UPDATE fest_programs SET status = 'live' WHERE id = $1`, [req.params.programId]);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Recalculate and synchronize all results points and grades based on marks and is_group
router.post('/admin/recalculate-all-results', authorize('admin'), async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        r.id as result_id,
        r.position,
        r.grade as current_grade,
        p.is_group,
        ROUND(AVG(m.mark::numeric), 2) as avg_mark
      FROM fest_results r
      JOIN fest_programs p ON r.fest_program_id = p.id
      JOIN fest_registrations reg ON r.fest_registration_id = reg.id
      LEFT JOIN fest_marks m ON reg.id = m.fest_registration_id
      GROUP BY r.id, r.position, r.grade, p.is_group
    `);

    let updated = 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of rows) {
        const grade = row.avg_mark !== null && row.avg_mark !== undefined
          ? calculateFestGrade(row.avg_mark)
          : row.current_grade;
        const points = calculateFestPoints(grade, row.position, Boolean(row.is_group));
        await client.query(
          `UPDATE fest_results SET points = $1, grade = $2 WHERE id = $3`,
          [points, grade, row.result_id]
        );
        updated++;
      }
      await client.query('COMMIT');
    } finally {
      client.release();
    }

    res.json({ success: true, updatedCount: updated });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Announcer Routes
router.get('/announcer/pending', authorize('announcer', 'admin'), async (req, res) => {
  try {
    const eventType = req.query.event_type || 'MAIN';
    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.category, p.sequence_number, p.is_group,
        (
          SELECT json_agg(json_build_object(
            'position', g.position,
            'points', g.points,
            'student_name', g.student_name,
            'team_name', g.team_name,
            'grade', g.grade,
            'code_letter', g.code_letter
          ) ORDER BY g.position ASC)
          FROM (
            SELECT r.position, MAX(r.points) as points, string_agg(s.name, ', ') as student_name, t.name as team_name, MAX(r.grade) as grade, reg.code_letter
            FROM fest_results r
            JOIN fest_registrations reg ON r.fest_registration_id = reg.id
            JOIN fest_participants part ON reg.fest_participant_id = part.id
            JOIN students s ON part.student_id = s.id
            LEFT JOIN classes c ON s.class_id = c.id
            JOIN fest_teams t ON part.fest_team_id = t.id
            WHERE r.fest_program_id = p.id
            GROUP BY r.position, t.name, reg.code_letter
          ) g
        ) as winners
       FROM fest_programs p 
       WHERE p.status = 'completed' AND p.event_type = $1 
       AND EXISTS (SELECT 1 FROM fest_results WHERE fest_program_id = p.id)
       AND NOT EXISTS (
         SELECT 1 FROM fest_results WHERE fest_program_id = p.id AND published_at IS NOT NULL
       )
       ORDER BY p.sequence_number ASC NULLS LAST, p.id ASC`, [eventType]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/announcer/publish', authorize('announcer', 'admin', 'green_room'), async (req: AuthRequest, res) => {
  const { program_id } = req.body;
  const userId = req.user?.id;
  try {
    // If sequence_number is null on the program, assign the next sequence number for its event_type
    const progRes = await pool.query(`SELECT sequence_number, event_type FROM fest_programs WHERE id = $1`, [program_id]);
    if (progRes.rows.length > 0 && progRes.rows[0].sequence_number == null) {
      const seqRes = await pool.query(
        `SELECT COALESCE(MAX(fp2.sequence_number), 0) + 1 as next_seq
         FROM fest_programs fp2
         WHERE fp2.event_type = $1`,
        [progRes.rows[0].event_type]
      );
      await pool.query(`UPDATE fest_programs SET sequence_number = $1 WHERE id = $2`, [seqRes.rows[0].next_seq, program_id]);
    }

    await pool.query(
      `UPDATE fest_results SET published_at = CURRENT_TIMESTAMP, published_by = $1 WHERE fest_program_id = $2`,
      [userId, program_id]
    );
    // TODO: Trigger Poster Generation here or as an async background job.
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/announcer/published', authorize('announcer', 'admin'), async (req, res) => {
  try {
    const eventType = req.query.event_type || 'MAIN';
    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.category, p.sequence_number, p.is_group,
        (SELECT MAX(published_at) FROM fest_results r WHERE r.fest_program_id = p.id) as published_at,
        (
          SELECT json_agg(json_build_object(
            'position', g.position,
            'points', g.points,
            'student_name', g.student_name,
            'team_name', g.team_name,
            'grade', g.grade,
            'code_letter', g.code_letter
          ) ORDER BY g.position ASC)
          FROM (
            SELECT r.position, MAX(r.points) as points, string_agg(s.name, ', ') as student_name, t.name as team_name, MAX(r.grade) as grade, reg.code_letter
            FROM fest_results r
            JOIN fest_registrations reg ON r.fest_registration_id = reg.id
            JOIN fest_participants part ON reg.fest_participant_id = part.id
            JOIN students s ON part.student_id = s.id
            JOIN fest_teams t ON part.fest_team_id = t.id
            WHERE r.fest_program_id = p.id
            GROUP BY r.position, t.name, reg.code_letter
          ) g
        ) as winners
       FROM fest_programs p
       JOIN fest_results r ON p.id = r.fest_program_id
       WHERE r.published_at IS NOT NULL AND p.event_type = $1
       GROUP BY p.id, p.title, p.category, p.sequence_number, p.is_group
       ORDER BY published_at DESC`, [eventType]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/announcer/undo-publish', authorize('announcer', 'admin'), async (req: AuthRequest, res) => {
  const { program_id } = req.body;
  try {
    await pool.query(
      `UPDATE fest_results SET published_at = NULL, published_by = NULL WHERE fest_program_id = $1`,
      [program_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Stage Admin Routes
router.get('/stage-admin/programs/:id/participants', authorize('stage_admin', 'admin'), async (req: AuthRequest, res) => {
  try {
    // Also return program info (is_group, status) for the frontend
    const progRes = await pool.query(`SELECT is_group, status FROM fest_programs WHERE id = $1`, [req.params.id]);
    const isGroup = progRes.rows.length > 0 ? progRes.rows[0].is_group : false;
    const status = progRes.rows.length > 0 ? progRes.rows[0].status : 'scheduled';

    const { rows } = await pool.query(`
      SELECT r.id as registration_id, r.code_letter, r.is_present, p.chest_number, s.name as student_name, t.name as team_name, t.id as team_id
      FROM fest_registrations r
      JOIN fest_participants p ON r.fest_participant_id = p.id
      JOIN students s ON p.student_id = s.id
      JOIN fest_teams t ON p.fest_team_id = t.id
      WHERE r.fest_program_id = $1
      ORDER BY t.name ASC, p.chest_number ASC
    `, [req.params.id]);
    res.json({ participants: rows, is_group: isGroup, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Mark attendance for participants (bulk update)
router.post('/stage-admin/programs/:id/mark-attendance', authorize('stage_admin', 'admin'), async (req: AuthRequest, res) => {
  const { present_ids } = req.body; // array of registration_ids that are present
  const programId = req.params.id;
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Reset all to absent first
      await client.query(`UPDATE fest_registrations SET is_present = false WHERE fest_program_id = $1`, [programId]);
      // Mark provided ones as present
      if (present_ids && present_ids.length > 0) {
        await client.query(`UPDATE fest_registrations SET is_present = true WHERE fest_program_id = $1 AND id = ANY($2::int[])`, [programId, present_ids]);
      }
      await client.query('COMMIT');
      res.json({ success: true, present_count: present_ids?.length || 0 });
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message || 'Server error' });
    } finally {
      client.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Finish stage - transition program to judging phase
router.post('/stage-admin/programs/:id/finish-stage', authorize('stage_admin', 'admin'), async (req: AuthRequest, res) => {
  const programId = req.params.id;
  try {
    const progRes = await pool.query(`SELECT status FROM fest_programs WHERE id = $1`, [programId]);
    if (progRes.rows.length === 0) return res.status(404).json({ error: 'Program not found' });
    if (progRes.rows[0].status !== 'live') {
      return res.status(400).json({ error: 'Program must be live to finish stage' });
    }
    // Transition to judging phase
    await pool.query(`UPDATE fest_programs SET status = 'judging' WHERE id = $1`, [programId]);
    res.json({ success: true, status: 'judging' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.post('/stage-admin/generate-code', authorize('stage_admin', 'admin'), async (req: AuthRequest, res) => {
  const { registration_id } = req.body;
  try {
    const regRes = await pool.query(`SELECT fest_program_id, code_letter, fest_participant_id FROM fest_registrations WHERE id = $1`, [registration_id]);
    if (regRes.rows.length === 0) return res.status(404).json({ error: 'Registration not found' });
    if (regRes.rows[0].code_letter) return res.status(400).json({ error: 'Code letter already generated', code_letter: regRes.rows[0].code_letter });
    
    const programId = regRes.rows[0].fest_program_id;
    const participantId = regRes.rows[0].fest_participant_id;
    
    const progRes = await pool.query(`SELECT is_group FROM fest_programs WHERE id = $1`, [programId]);
    const isGroup = progRes.rows[0]?.is_group || false;

    // Query total registered count (teams for group events, individuals for solo) to constrain code pool
    let totalCount = 1;
    if (isGroup) {
      const countRes = await pool.query(`
        SELECT COUNT(DISTINCT p.fest_team_id)::int as total 
        FROM fest_registrations r
        JOIN fest_participants p ON r.fest_participant_id = p.id
        WHERE r.fest_program_id = $1
      `, [programId]);
      totalCount = countRes.rows[0].total || 1;
    } else {
      const countRes = await pool.query(`SELECT COUNT(*)::int as total FROM fest_registrations WHERE fest_program_id = $1`, [programId]);
      totalCount = countRes.rows[0].total || 1;
    }

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const validLetters = totalCount <= 26 ? letters.slice(0, Math.max(totalCount, 1)) : letters;

    // Get assigned letters
    const assignedRes = await pool.query(
      `SELECT code_letter FROM fest_registrations WHERE fest_program_id = $1 AND code_letter IS NOT NULL`,
      [programId]
    );
    const assigned = new Set(assignedRes.rows.map(r => r.code_letter));
    
    const available = validLetters.filter(l => !assigned.has(l));
    
    let code_letter = '';
    if (available.length > 0) {
      const randomIndex = Math.floor(Math.random() * available.length);
      code_letter = available[randomIndex];
    } else {
      const fallbackAvailable = letters.filter(l => !assigned.has(l));
      if (fallbackAvailable.length > 0) {
        code_letter = fallbackAvailable[Math.floor(Math.random() * fallbackAvailable.length)];
      }
    }

    if (!code_letter) return res.status(500).json({ error: 'Ran out of code letters' });
    
    await pool.query(`UPDATE fest_registrations SET code_letter = $1 WHERE id = $2`, [code_letter, registration_id]);

    try {
      const partInfo = await pool.query(
        `SELECT p.chest_number, p.fest_team_id, s.name as student_name, pr.title as program_title, pr.is_group, t.name as team_name
         FROM fest_participants p
         JOIN students s ON p.student_id = s.id
         JOIN fest_teams t ON p.fest_team_id = t.id
         JOIN fest_registrations reg ON reg.fest_participant_id = p.id
         JOIN fest_programs pr ON reg.fest_program_id = pr.id
         WHERE p.id = $1 AND reg.id = $2`,
        [participantId, registration_id]
      );
      if (partInfo.rows.length > 0) {
        const info = partInfo.rows[0];

        // If it's a group event, assign the same code to all team members registered for this program
        if (info.is_group) {
          await pool.query(
            `UPDATE fest_registrations 
             SET code_letter = $1 
             WHERE fest_program_id = $2 
             AND fest_participant_id IN (
               SELECT id FROM fest_participants WHERE fest_team_id = $3
             )`,
            [code_letter, programId, info.fest_team_id]
          );
        }

        const displayName = info.is_group ? `Team ${info.team_name}` : info.student_name;
        const displayChest = info.is_group ? 'Group' : info.chest_number;

        // Store in DB
        await pool.query(
          `INSERT INTO fest_notifications (type, program_id, title, data) VALUES ($1, $2, $3, $4)`,
          ['PARTICIPANT_REPORTED', programId, info.program_title, JSON.stringify({
            student_name: displayName,
            chest_number: displayChest,
            program_title: info.program_title,
            code_letter,
          })]
        );

        sendToTeamLeaders(info.fest_team_id, {
          type: 'PARTICIPANT_REPORTED',
          timestamp: new Date().toISOString(),
          data: {
            student_name: displayName,
            chest_number: displayChest,
            program_title: info.program_title,
            code_letter,
          }
        });
      }
    } catch (sseErr) {
      console.error('SSE notification error (non-fatal):', sseErr);
    }

    res.json({ code_letter });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Reset single participant's code letter
router.post('/stage-admin/reset-code', authorize('stage_admin', 'admin'), async (req: AuthRequest, res) => {
  const { registration_id } = req.body;
  try {
    await pool.query(`UPDATE fest_registrations SET code_letter = NULL WHERE id = $1`, [registration_id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Reset all participant code letters for a program
router.post('/stage-admin/reset-program-codes', authorize('stage_admin', 'admin'), async (req: AuthRequest, res) => {
  const { program_id } = req.body;
  try {
    await pool.query(`UPDATE fest_registrations SET code_letter = NULL WHERE fest_program_id = $1`, [program_id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Randomly assign code letters to all registered participants in a program
router.post('/stage-admin/randomize-program-codes', authorize('stage_admin', 'admin'), async (req: AuthRequest, res) => {
  const { program_id } = req.body;
  try {
    // Check if program is group event
    const progRes = await pool.query(`SELECT is_group FROM fest_programs WHERE id = $1`, [program_id]);
    const isGroup = progRes.rows.length > 0 ? progRes.rows[0].is_group : false;

    // Clear all existing codes for this program
    await pool.query(`UPDATE fest_registrations SET code_letter = NULL WHERE fest_program_id = $1`, [program_id]);
    
    let targetCount = 0;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    if (isGroup) {
      // Group event: fetch distinct teams
      const teamRes = await pool.query(`
        SELECT DISTINCT p.fest_team_id 
        FROM fest_registrations reg
        JOIN fest_participants p ON reg.fest_participant_id = p.id
        WHERE reg.fest_program_id = $1
      `, [program_id]);
      const teams = teamRes.rows;
      targetCount = teams.length;

      let poolLetters = targetCount <= 26 ? letters.slice(0, Math.max(targetCount, 1)) : [...letters];
      if (targetCount > letters.length) {
        for (let i = 0; i < letters.length && poolLetters.length < targetCount; i++) {
          for (let j = 0; j < letters.length && poolLetters.length < targetCount; j++) {
            poolLetters.push(letters[i] + letters[j]);
          }
        }
      }

      for (let i = poolLetters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [poolLetters[i], poolLetters[j]] = [poolLetters[j], poolLetters[i]];
      }

      for (let i = 0; i < teams.length; i++) {
        await pool.query(`
          UPDATE fest_registrations 
          SET code_letter = $1 
          WHERE fest_program_id = $2 AND fest_participant_id IN (
            SELECT id FROM fest_participants WHERE fest_team_id = $3
          )
        `, [poolLetters[i], program_id, teams[i].fest_team_id]);
      }
    } else {
      // Solo event: fetch all registrations
      const regRes = await pool.query(`SELECT id FROM fest_registrations WHERE fest_program_id = $1 ORDER BY id`, [program_id]);
      const regs = regRes.rows;
      targetCount = regs.length;

      let poolLetters = targetCount <= 26 ? letters.slice(0, Math.max(targetCount, 1)) : [...letters];
      if (targetCount > letters.length) {
        for (let i = 0; i < letters.length && poolLetters.length < targetCount; i++) {
          for (let j = 0; j < letters.length && poolLetters.length < targetCount; j++) {
            poolLetters.push(letters[i] + letters[j]);
          }
        }
      }

      for (let i = poolLetters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [poolLetters[i], poolLetters[j]] = [poolLetters[j], poolLetters[i]];
      }

      for (let i = 0; i < regs.length; i++) {
        await pool.query(`UPDATE fest_registrations SET code_letter = $1 WHERE id = $2`, [poolLetters[i], regs[i].id]);
      }
    }

    res.json({ success: true, count: targetCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ==========================================
// LEADER ROUTES
// ==========================================

// Leader dashboard data: team info, participants, points
router.get('/leader/dashboard', authenticate, authorize('leader'), async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    // Get leader's team
    const teamRes = await pool.query(
      `SELECT ftl.fest_team_id, ftl.is_first_leader, ft.name as team_name, ft.event_type
       FROM fest_team_leaders ftl
       JOIN fest_teams ft ON ftl.fest_team_id = ft.id
       WHERE ftl.user_id = $1 LIMIT 1`,
      [userId]
    );
    if (teamRes.rows.length === 0) {
      return res.status(403).json({ error: 'You are not assigned to any team' });
    }
    const team = teamRes.rows[0];

    // Get team points
    const pointsRes = await pool.query(
      `SELECT COALESCE(SUM(r.points), 0)::int as total_points
       FROM fest_results r
       JOIN fest_registrations reg ON r.fest_registration_id = reg.id
       JOIN fest_participants part ON reg.fest_participant_id = part.id
       WHERE part.fest_team_id = $1 AND r.published_at IS NOT NULL`,
      [team.fest_team_id]
    );

    // Get team participants
    const participantsRes = await pool.query(
      `SELECT p.id, p.chest_number, p.category, s.name as student_name
       FROM fest_participants p
       JOIN students s ON p.student_id = s.id
       WHERE p.fest_team_id = $1
       ORDER BY p.chest_number ASC`,
      [team.fest_team_id]
    );

    // Get team results
    const resultsRes = await pool.query(
      `SELECT r.position, r.points, pr.title as program_title, pr.category, pr.is_group, s.name as student_name, p.chest_number
       FROM fest_results r
       JOIN fest_registrations reg ON r.fest_registration_id = reg.id
       JOIN fest_participants p ON reg.fest_participant_id = p.id
       JOIN students s ON p.student_id = s.id
       JOIN fest_programs pr ON r.fest_program_id = pr.id
       WHERE p.fest_team_id = $1 AND r.published_at IS NOT NULL
       ORDER BY r.points DESC`,
      [team.fest_team_id]
    );

    // Get global live/scheduled programs (limit 5 to keep dashboard clean)
    const liveRes = await pool.query(
      `SELECT id, title, category, status, is_called
       FROM fest_programs
       WHERE status IN ('live', 'scheduled') AND event_type = $1
       ORDER BY 
         CASE WHEN status = 'live' THEN 1 ELSE 2 END ASC, 
         title ASC
       LIMIT 5`, [team.event_type]
    );

    // Get leaderboard for context
    const leaderboardRes = await pool.query(
      `SELECT t.id, t.name as team_name, COALESCE(SUM(r.points), 0)::int as total_points
       FROM fest_teams t
       LEFT JOIN fest_participants part ON t.id = part.fest_team_id
       LEFT JOIN fest_registrations reg ON part.id = reg.fest_participant_id
       LEFT JOIN fest_results r ON reg.id = r.fest_registration_id AND r.published_at IS NOT NULL
       WHERE t.event_type = $1
       GROUP BY t.id, t.name
       ORDER BY total_points DESC`, [team.event_type]
    );

    // Get stored notifications from DB (limit 50)
    const notifsRes = await pool.query(
      `SELECT id, type, program_id, title, category, data, created_at as timestamp
       FROM fest_notifications
       ORDER BY id DESC
       LIMIT 50`
    );

    // Get active calls from DB (programs currently called)
    const activeCallsRes = await pool.query(
      `SELECT id, title, category
       FROM fest_programs
       WHERE is_called = true AND status = 'scheduled'
       ORDER BY title ASC`
    );

    // Check leader edit lock status
    const lockRes = await pool.query(`SELECT value FROM settings WHERE key = 'fest_leader_edit_locked'`);
    const leaderEditLocked = lockRes.rows.length > 0 && lockRes.rows[0].value === 'true';

    res.json({
      team: {
        id: team.fest_team_id,
        name: team.team_name,
        is_first_leader: team.is_first_leader,
        total_points: pointsRes.rows[0].total_points,
        event_type: team.event_type,
      },
      participants: participantsRes.rows,
      results: resultsRes.rows,
      live_programs: liveRes.rows,
      leaderboard: leaderboardRes.rows,
      notifications: notifsRes.rows,
      active_calls: activeCallsRes.rows,
      leader_edit_locked: leaderEditLocked,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Also push SSE when program status changes to live
router.put('/admin/programs/:id/status-notify', authenticate, authorize('stage_admin', 'admin'), async (req: AuthRequest, res) => {
  const { status } = req.body;
  const programId = req.params.id;
  try {
    const { rows } = await pool.query(
      `UPDATE fest_programs SET status = $1 WHERE id = $2 RETURNING *`,
      [status, programId]
    );

    // If going live, notify ALL connected leaders and store in DB
    if (status === 'live') {
      await pool.query(
        `UPDATE fest_programs SET is_called = false WHERE id = $1`,
        [programId]
      );
      await pool.query(
        `DELETE FROM fest_notifications WHERE program_id = $1`,
        [programId]
      );
      await pool.query(
        `INSERT INTO fest_notifications (type, program_id, title, category, data) VALUES ($1, $2, $3, $4, $5)`,
        ['PROGRAM_LIVE', rows[0].id, rows[0].title, rows[0].category, JSON.stringify({
          program_id: rows[0].id,
          program_title: rows[0].title,
          category: rows[0].category,
        })]
      );

      sseClients.forEach(client => {
        client.res.write(`data: ${JSON.stringify({
          type: 'PROGRAM_LIVE',
          timestamp: new Date().toISOString(),
          data: {
            program_id: rows[0].id,
            program_title: rows[0].title,
            category: rows[0].category,
          }
        })}\n\n`);
      });
    } else {
      // If completed or scheduled, delete active notifications for this program from DB
      await pool.query(
        `DELETE FROM fest_notifications WHERE program_id = $1`,
        [programId]
      );
    }

    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Push SSE to call for participants
router.put('/admin/programs/:id/call-participants', authenticate, authorize('stage_admin', 'admin'), async (req: AuthRequest, res) => {
  const programId = req.params.id;
  try {
    const { rows } = await pool.query(
      `UPDATE fest_programs SET is_called = true WHERE id = $1 RETURNING title, category`,
      [programId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Program not found' });
    
    const program = rows[0];

    // Insert notification into DB
    await pool.query(
      `INSERT INTO fest_notifications (type, program_id, title, category, data) VALUES ($1, $2, $3, $4, $5)`,
      ['PROGRAM_CALL', programId, program.title, program.category, JSON.stringify({
        program_id: programId,
        program_title: program.title,
        category: program.category,
      })]
    );

    // Notify ALL connected leaders
    sseClients.forEach(client => {
      client.res.write(`data: ${JSON.stringify({
        type: 'PROGRAM_CALL',
        timestamp: new Date().toISOString(),
        data: {
          program_id: programId,
          program_title: program.title,
          category: program.category,
        }
      })}\n\n`);
    });

    res.json({ success: true, message: 'Reporting call sent' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Revoke SSE call for participants
router.put('/admin/programs/:id/revoke-call', authenticate, authorize('stage_admin', 'admin'), async (req: AuthRequest, res) => {
  const programId = req.params.id;
  try {
    const { rows } = await pool.query(
      `UPDATE fest_programs SET is_called = false WHERE id = $1 RETURNING title, category`,
      [programId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Program not found' });
    
    const program = rows[0];

    // Remove active call notification from DB when revoked
    await pool.query(`DELETE FROM fest_notifications WHERE program_id = $1 AND type = 'PROGRAM_CALL'`, [programId]);

    // Notify ALL connected leaders
    sseClients.forEach(client => {
      client.res.write(`data: ${JSON.stringify({
        type: 'PROGRAM_CALL_REVOKED',
        timestamp: new Date().toISOString(),
        data: {
          program_id: programId,
          program_title: program.title,
          category: program.category,
        }
      })}\n\n`);
    });

    res.json({ success: true, message: 'Reporting call revoked' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /leader/programs
// Returns all programs with registered participant counts for the current leader's team
router.get('/leader/programs', authenticate, authorize('leader'), async (req: AuthRequest, res) => {
  try {
    // Determine the teamId from the token's teamId or DB
    const userId = req.user!.id;
    const teamRes = await pool.query(`SELECT fest_team_id, event_type FROM fest_team_leaders fl JOIN fest_teams t ON fl.fest_team_id = t.id WHERE fl.user_id = $1 LIMIT 1`, [userId]);
    if (teamRes.rows.length === 0) return res.status(403).json({ error: 'No team assigned' });
    const teamId = teamRes.rows[0].fest_team_id;
    const eventType = teamRes.rows[0].event_type || 'MAIN';

    const { rows } = await pool.query(`
      SELECT p.*,
             COALESCE(
               (SELECT json_agg(json_build_object('id', p2.id, 'name', s.name, 'chest_number', p2.chest_number))
                FROM fest_registrations r
                JOIN fest_participants p2 ON r.fest_participant_id = p2.id
                JOIN students s ON p2.student_id = s.id
                WHERE r.fest_program_id = p.id AND p2.fest_team_id = $1),
               '[]'::json
             ) as registered_participants
      FROM fest_programs p
      WHERE p.event_type = $2
      ORDER BY p.category, p.type, p.title
    `, [teamId, eventType]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// POST /leader/programs/:id/register
router.post('/leader/programs/:id/register', authenticate, authorize('leader'), async (req: AuthRequest, res) => {
  const programId = req.params.id;
  const { participantIds } = req.body;
  try {
    // Check leader edit lock
    const lockRes = await pool.query(`SELECT value FROM settings WHERE key = 'fest_leader_edit_locked'`);
    if (lockRes.rows.length > 0 && lockRes.rows[0].value === 'true') {
      return res.status(403).json({ error: 'Registration editing is currently disabled by the admin.' });
    }

    const userId = req.user!.id;
    const teamRes = await pool.query(`SELECT fest_team_id FROM fest_team_leaders WHERE user_id = $1 LIMIT 1`, [userId]);
    if (teamRes.rows.length === 0) return res.status(403).json({ error: 'No team assigned' });
    const teamId = teamRes.rows[0].fest_team_id;

    // Get program limits
    const progRes = await pool.query(`SELECT team_limit, is_group, category FROM fest_programs WHERE id = $1`, [programId]);
    if (progRes.rows.length === 0) return res.status(404).json({ error: 'Program not found' });
    const { team_limit, category } = progRes.rows[0];

    // Verify participants exist in this team and are valid
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ error: 'No participants provided' });
    }

    // Existing registrations for this program from this team
    const regRes = await pool.query(`
      SELECT r.fest_participant_id 
      FROM fest_registrations r
      JOIN fest_participants p ON r.fest_participant_id = p.id
      WHERE r.fest_program_id = $1 AND p.fest_team_id = $2
    `, [programId, teamId]);
    const existingIds = regRes.rows.map(r => r.fest_participant_id);
    
    // Find ones to add and remove
    const toAdd = participantIds.filter((id: number) => !existingIds.includes(id));
    const toRemove = existingIds.filter((id: number) => !participantIds.includes(id));

    if (team_limit !== null && participantIds.length > team_limit) {
      return res.status(400).json({ error: `Registration exceeds the team limit of ${team_limit} for this program.` });
    }

    // Remove unchecked
    if (toRemove.length > 0) {
      await pool.query(`DELETE FROM fest_registrations WHERE fest_program_id = $1 AND fest_participant_id = ANY($2::int[])`, [programId, toRemove]);
    }

    // Add new checked
    if (toAdd.length > 0) {
      const validParticipants = await pool.query(
        `SELECT id FROM fest_participants WHERE id = ANY($1::int[]) AND fest_team_id = $2`,
        [toAdd, teamId]
      );
      if (validParticipants.rows.length !== toAdd.length) {
        return res.status(400).json({ error: 'One or more selected participants do not belong to your team' });
      }

      await pool.query(
        `INSERT INTO fest_registrations (fest_participant_id, fest_program_id)
         SELECT unnest($1::int[]), $2
         ON CONFLICT (fest_participant_id, fest_program_id) DO NOTHING`,
        [toAdd, programId]
      );
    }

    res.json({ success: true, added: toAdd.length, removed: toRemove.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// DELETE /leader/programs/:id/register
router.delete('/leader/programs/:id/register', authenticate, authorize('leader'), async (req: AuthRequest, res) => {
  const programId = req.params.id;
  const { participantId } = req.body;
  
  try {
    // Check leader edit lock
    const lockRes = await pool.query(`SELECT value FROM settings WHERE key = 'fest_leader_edit_locked'`);
    if (lockRes.rows.length > 0 && lockRes.rows[0].value === 'true') {
      return res.status(403).json({ error: 'Registration editing is currently disabled by the admin.' });
    }

    const userId = req.user!.id;
    const teamRes = await pool.query(`SELECT fest_team_id FROM fest_team_leaders WHERE user_id = $1 LIMIT 1`, [userId]);
    if (teamRes.rows.length === 0) return res.status(403).json({ error: 'No team assigned' });
    const teamId = teamRes.rows[0].fest_team_id;

    // Ensure the participant belongs to the team
    const pRes = await pool.query(`SELECT id FROM fest_participants WHERE id = $1 AND fest_team_id = $2`, [participantId, teamId]);
    if (pRes.rows.length === 0) return res.status(403).json({ error: 'Unauthorized to remove this participant' });

    await pool.query(`DELETE FROM fest_registrations WHERE fest_program_id = $1 AND fest_participant_id = $2`, [programId, participantId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Admin get all results (published and unpublished)
router.get('/admin/results', authenticate, authorize('admin'), async (req, res) => {
  try {
    const eventType = req.query.event_type || 'MAIN';
    const { rows } = await pool.query(`
      SELECT r.id, r.position, r.points, r.published_at,
             reg.code_letter,
             p.title as program_title, p.category, p.type,
             part.chest_number,
             s.name as student_name,
             t.name as team_name
      FROM fest_results r
      JOIN fest_registrations reg ON r.fest_registration_id = reg.id
      JOIN fest_programs p ON reg.fest_program_id = p.id
      JOIN fest_participants part ON reg.fest_participant_id = part.id
      JOIN students s ON part.student_id = s.id
      JOIN fest_teams t ON part.fest_team_id = t.id
      WHERE p.event_type = $1
      ORDER BY r.published_at DESC NULLS FIRST, p.title, r.position
    `, [eventType]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Admin upload poster template and save config for a specific version (v1, v2, v3)
router.post('/admin/poster-template', authenticate, authorize('admin'), upload.single('template'), async (req: AuthRequest, res) => {
  try {
    const config = req.body.config || '{}';
    const version = (req.body.version as string) || 'v1';
    
    // Check if there is an existing template for this version
    const existing = await pool.query(`SELECT id, image_url FROM fest_poster_templates WHERE version = $1 LIMIT 1`, [version]);
    
    let imageUrl = existing.rows.length > 0 ? existing.rows[0].image_url : '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    if (!imageUrl && !req.file) {
      return res.status(400).json({ error: `Image file is required for template ${version}.` });
    }

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE fest_poster_templates SET image_url = $1, config = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [imageUrl, config, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO fest_poster_templates (version, image_url, config) VALUES ($1, $2, $3)`,
        [version, imageUrl, config]
      );
    }

    res.json({ success: true, version, image_url: imageUrl, config: JSON.parse(config) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ==========================================
// PARTICIPANT CARD TEMPLATE
// ==========================================

// Admin upload participant card template and save config
router.post('/admin/participant-card-template', authenticate, authorize('admin'), upload.single('card_template'), async (req: AuthRequest, res) => {
  try {
    const config = req.body.config || '{}';
    
    const existing = await pool.query(`SELECT id, image_url FROM fest_participant_card_templates ORDER BY id DESC LIMIT 1`);
    
    let imageUrl = existing.rows.length > 0 ? existing.rows[0].image_url : '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    if (!imageUrl && !req.file) {
      return res.status(400).json({ error: 'Image file is required for the first template.' });
    }

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE fest_participant_card_templates SET image_url = $1, config = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [imageUrl, config, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO fest_participant_card_templates (image_url, config) VALUES ($1, $2)`,
        [imageUrl, config]
      );
    }

    res.json({ success: true, image_url: imageUrl, config: JSON.parse(config) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ==========================================
// AWARD POINT ROUTES
// ==========================================

// Helper: Compute all students' award points from published results
const AWARD_POINTS_QUERY = `
  WITH individual_points AS (
    SELECT 
      part.student_id,
      COALESCE(SUM(fr.points), 0) as points
    FROM fest_results fr
    JOIN fest_registrations reg ON fr.fest_registration_id = reg.id
    JOIN fest_participants part ON reg.fest_participant_id = part.id
    JOIN fest_programs fp ON fr.fest_program_id = fp.id
    WHERE fr.published_at IS NOT NULL
    AND fp.is_group = false
    GROUP BY part.student_id
  ),
  group_points AS (
    SELECT 
      p3.student_id,
      SUM(
        fr.points::decimal / GREATEST(team_members.cnt, 1)
      ) as points
    FROM fest_results fr
    JOIN fest_registrations winner_reg ON fr.fest_registration_id = winner_reg.id
    JOIN fest_participants winner_part ON winner_reg.fest_participant_id = winner_part.id
    JOIN fest_programs fp ON fr.fest_program_id = fp.id
    CROSS JOIN LATERAL (
      SELECT COUNT(*) as cnt
      FROM fest_registrations r2
      JOIN fest_participants p2 ON r2.fest_participant_id = p2.id
      WHERE r2.fest_program_id = fr.fest_program_id
      AND p2.fest_team_id = winner_part.fest_team_id
    ) team_members
    JOIN fest_registrations r3 ON r3.fest_program_id = fr.fest_program_id
    JOIN fest_participants p3 ON r3.fest_participant_id = p3.id 
      AND p3.fest_team_id = winner_part.fest_team_id
    WHERE fp.is_group = true
    AND fr.published_at IS NOT NULL
    GROUP BY p3.student_id
  ),
  redeemed AS (
    SELECT 
      student_id,
      COALESCE(SUM(amount), 0) as total_redeemed
    FROM fest_award_redemptions
    GROUP BY student_id
  )
  SELECT 
    s.id as student_id,
    s.name as student_name,
    s.admission_number,
    c.name as class_name,
    part.chest_number,
    t.name as team_name,
    COALESCE(ip.points, 0)::decimal as individual_points,
    COALESCE(gp.points, 0)::decimal as general_points,
    (COALESCE(ip.points, 0) + COALESCE(gp.points, 0))::decimal as total_points,
    ((COALESCE(ip.points, 0) + COALESCE(gp.points, 0)) * 10)::decimal as total_award_amount,
    COALESCE(r.total_redeemed, 0)::decimal as total_redeemed,
    ((COALESCE(ip.points, 0) + COALESCE(gp.points, 0)) * 10 - COALESCE(r.total_redeemed, 0))::decimal as remaining_balance
  FROM students s
  JOIN fest_participants part ON s.id = part.student_id
  JOIN fest_teams t ON part.fest_team_id = t.id
  LEFT JOIN classes c ON s.class_id = c.id
  LEFT JOIN individual_points ip ON s.id = ip.student_id
  LEFT JOIN group_points gp ON s.id = gp.student_id
  LEFT JOIN redeemed r ON s.id = r.student_id
  WHERE (COALESCE(ip.points, 0) + COALESCE(gp.points, 0)) > 0
  ORDER BY total_points DESC
`;

// GET all students with award points
router.get('/award-point/students', authenticate, authorize('award_point', 'admin'), async (_req, res) => {
  try {
    const { rows } = await pool.query(AWARD_POINTS_QUERY);
    res.json(rows);
  } catch (err: any) {
    console.error('Award point students error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET single student award details
router.get('/award-point/students/:studentId', authenticate, authorize('award_point', 'admin'), async (req, res) => {
  try {
    // Get student summary
    const { rows: summaryRows } = await pool.query(
      AWARD_POINTS_QUERY + ` -- dummy end`
    );
    const student = summaryRows.find((r: any) => r.student_id === parseInt(req.params.studentId));
    if (!student) {
      return res.status(404).json({ error: 'Student not found or has no points' });
    }

    // Get competition breakdown
    const { rows: competitions } = await pool.query(`
      SELECT 
        fp.title as program_title,
        fp.category,
        fp.is_group,
        fr.position,
        fr.points,
        fr.grade,
        fp.sequence_number,
        CASE 
          WHEN fp.is_group = true THEN 
            fr.points::decimal / GREATEST(
              (SELECT COUNT(*) FROM fest_registrations r2 
               JOIN fest_participants p2 ON r2.fest_participant_id = p2.id 
               WHERE r2.fest_program_id = fp.id 
               AND p2.fest_team_id = part.fest_team_id), 1
            )
          ELSE fr.points::decimal
        END as effective_points,
        CASE 
          WHEN fp.is_group = true THEN 
            (SELECT COUNT(*) FROM fest_registrations r2 
             JOIN fest_participants p2 ON r2.fest_participant_id = p2.id 
             WHERE r2.fest_program_id = fp.id 
             AND p2.fest_team_id = part.fest_team_id)::int
          ELSE 1
        END as team_member_count
      FROM fest_results fr
      JOIN fest_registrations reg ON fr.fest_registration_id = reg.id
      JOIN fest_participants part ON reg.fest_participant_id = part.id
      JOIN fest_programs fp ON fr.fest_program_id = fp.id
      WHERE part.student_id = $1 AND fr.published_at IS NOT NULL
      
      UNION ALL
      
      -- Group competitions where teammate has the result record
      SELECT 
        fp.title as program_title,
        fp.category,
        fp.is_group,
        fr.position,
        fr.points,
        fr.grade,
        fp.sequence_number,
        fr.points::decimal / GREATEST(team_members.cnt, 1) as effective_points,
        team_members.cnt::int as team_member_count
      FROM fest_results fr
      JOIN fest_registrations winner_reg ON fr.fest_registration_id = winner_reg.id
      JOIN fest_participants winner_part ON winner_reg.fest_participant_id = winner_part.id
      JOIN fest_programs fp ON fr.fest_program_id = fp.id
      CROSS JOIN LATERAL (
        SELECT COUNT(*) as cnt
        FROM fest_registrations r2
        JOIN fest_participants p2 ON r2.fest_participant_id = p2.id
        WHERE r2.fest_program_id = fr.fest_program_id
        AND p2.fest_team_id = winner_part.fest_team_id
      ) team_members
      WHERE fp.is_group = true
      AND fr.published_at IS NOT NULL
      AND winner_part.student_id != $1
      AND winner_part.fest_team_id = (SELECT fest_team_id FROM fest_participants WHERE student_id = $1)
      AND EXISTS (
        SELECT 1 FROM fest_registrations r3
        JOIN fest_participants p3 ON r3.fest_participant_id = p3.id
        WHERE r3.fest_program_id = fr.fest_program_id AND p3.student_id = $1
      )
      ORDER BY program_title
    `, [req.params.studentId]);

    // Get redemption history
    const { rows: transactions } = await pool.query(`
      SELECT r.id, r.description, r.amount, r.note, r.created_at,
             u.username as redeemed_by_name
      FROM fest_award_redemptions r
      LEFT JOIN users u ON r.redeemed_by = u.id
      WHERE r.student_id = $1
      ORDER BY r.created_at DESC
    `, [req.params.studentId]);

    res.json({ ...student, competitions, transactions });
  } catch (err: any) {
    console.error('Award point student detail error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// POST redeem a reward / book prize
router.post('/award-point/redeem', authenticate, authorize('award_point', 'admin'), async (req: AuthRequest, res) => {
  const { student_id, description, amount, note } = req.body;
  const userId = req.user?.id;

  if (!student_id || !description || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Student ID, description, and a positive amount are required' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Calculate current balance inside the transaction to prevent race conditions
      const { rows: balanceRows } = await client.query(`
        WITH individual_points AS (
          SELECT COALESCE(SUM(fr.points), 0) as points
          FROM fest_results fr
          JOIN fest_registrations reg ON fr.fest_registration_id = reg.id
          JOIN fest_participants part ON reg.fest_participant_id = part.id
          JOIN fest_programs fp ON fr.fest_program_id = fp.id
          WHERE part.student_id = $1 AND fr.published_at IS NOT NULL
          AND fp.category NOT ILIKE '%general%'
        ),
        general_points AS (
          SELECT COALESCE(SUM(
            fr.points::decimal / GREATEST(team_members.cnt, 1)
          ), 0) as points
          FROM fest_results fr
          JOIN fest_registrations winner_reg ON fr.fest_registration_id = winner_reg.id
          JOIN fest_participants winner_part ON winner_reg.fest_participant_id = winner_part.id
          JOIN fest_programs fp ON fr.fest_program_id = fp.id
          CROSS JOIN LATERAL (
            SELECT COUNT(*) as cnt
            FROM fest_registrations r2
            JOIN fest_participants p2 ON r2.fest_participant_id = p2.id
            WHERE r2.fest_program_id = fr.fest_program_id
            AND p2.fest_team_id = winner_part.fest_team_id
          ) team_members
          JOIN fest_registrations r3 ON r3.fest_program_id = fr.fest_program_id
          JOIN fest_participants p3 ON r3.fest_participant_id = p3.id 
            AND p3.fest_team_id = winner_part.fest_team_id
          WHERE fp.category ILIKE '%general%'
          AND fr.published_at IS NOT NULL
          AND p3.student_id = $1
        ),
        redeemed AS (
          SELECT COALESCE(SUM(amount), 0) as total_redeemed
          FROM fest_award_redemptions
          WHERE student_id = $1
        )
        SELECT 
          ((SELECT points FROM individual_points) + (SELECT points FROM general_points)) * 10 
          - (SELECT total_redeemed FROM redeemed) as remaining_balance
      `, [student_id]);

      const remainingBalance = parseFloat(balanceRows[0]?.remaining_balance || '0');

      if (amount > remainingBalance) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Insufficient balance. Available: ₹${remainingBalance.toFixed(2)}, Requested: ₹${parseFloat(amount).toFixed(2)}` 
        });
      }

      const { rows } = await client.query(
        `INSERT INTO fest_award_redemptions (student_id, description, amount, note, redeemed_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, description, amount, note, created_at`,
        [student_id, description, amount, note || null, userId]
      );

      await client.query('COMMIT');
      res.json({ success: true, transaction: rows[0], new_balance: remainingBalance - parseFloat(amount) });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Award redeem error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// DELETE undo a redemption
router.delete('/award-point/redeem/:id', authenticate, authorize('award_point', 'admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM fest_award_redemptions WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Award undo error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ==========================================
// MEDIA ROUTES (Read-only view of verified results)
// ==========================================

router.get('/media/results', authenticate, authorize('media', 'admin'), async (req, res) => {
  try {
    const eventType = req.query.event_type || 'MAIN';
    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.category, p.sequence_number, p.is_group,
        CASE WHEN EXISTS (SELECT 1 FROM fest_results r WHERE r.fest_program_id = p.id AND r.published_at IS NOT NULL) 
          THEN true ELSE false END as is_published,
        (
          SELECT json_agg(json_build_object(
            'position', g.position,
            'points', g.points,
            'student_name', g.student_name,
            'team_name', g.team_name,
            'grade', g.grade,
            'chest_number', g.chest_number
          ) ORDER BY g.position ASC)
          FROM (
            SELECT r.position, MAX(r.points) as points, string_agg(s.name, ', ') as student_name, 
                   t.name as team_name, MAX(r.grade) as grade, string_agg(part.chest_number, ', ') as chest_number
            FROM fest_results r
            JOIN fest_registrations reg ON r.fest_registration_id = reg.id
            JOIN fest_participants part ON reg.fest_participant_id = part.id
            JOIN students s ON part.student_id = s.id
            JOIN fest_teams t ON part.fest_team_id = t.id
            WHERE r.fest_program_id = p.id
            GROUP BY r.position, t.name
          ) g
        ) as winners
       FROM fest_programs p 
       WHERE p.event_type = $1 
       AND EXISTS (SELECT 1 FROM fest_results WHERE fest_program_id = p.id)
       ORDER BY p.sequence_number ASC NULLS LAST, p.id ASC`, [eventType]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Media results error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

export default router;


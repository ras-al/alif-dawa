import express, { Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../db';
import crypto from 'crypto';
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
    cb(null, 'poster-template.png');
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
    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.category, p.type, p.status, p.is_called,
              COUNT(r.id)::int as registered_count
       FROM fest_programs p
       LEFT JOIN fest_registrations r ON r.fest_program_id = p.id
       GROUP BY p.id
       ORDER BY p.id ASC`
    );
    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/public/results', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.position, r.points, p.title as program_title, p.category, 
              t.name as team_name, s.name as student_name
       FROM fest_results r
       JOIN fest_programs p ON r.fest_program_id = p.id
       JOIN fest_registrations reg ON r.fest_registration_id = reg.id
       JOIN fest_participants part ON reg.fest_participant_id = part.id
       JOIN students s ON part.student_id = s.id
       JOIN fest_teams t ON part.fest_team_id = t.id
       WHERE r.published_at IS NOT NULL
       ORDER BY p.id ASC, r.position ASC`
    );
    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.get('/public/leaderboard', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.name as team_name, COALESCE(SUM(r.points), 0)::int as total_points
       FROM fest_teams t
       LEFT JOIN fest_participants part ON t.id = part.fest_team_id
       LEFT JOIN fest_registrations reg ON part.id = reg.fest_participant_id
       LEFT JOIN fest_results r ON reg.id = r.fest_registration_id AND r.published_at IS NOT NULL
       GROUP BY t.id, t.name
       ORDER BY total_points DESC`
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
// AUTHENTICATED ROUTES
// ==========================================

router.use(authenticate);

// Admin Routes
router.get('/admin/teams', authorize('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM fest_teams ORDER BY id ASC`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/teams', authorize('admin'), async (req: AuthRequest, res) => {
  const { name, chest_number_start } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO fest_teams (name, chest_number_start) VALUES ($1, $2) RETURNING *`,
      [name, chest_number_start]
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
  const { title, category, type, max_judges } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO fest_programs (title, category, type, max_judges) VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, category, type, max_judges]
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
  const { fest_program_id, judge_id } = req.body;
  try {
    await pool.query(
      `INSERT INTO fest_program_judges (fest_program_id, judge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [fest_program_id, judge_id]
    );
    res.json({ success: true });
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

router.get('/admin/users', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.username, r.name as role,
             ftl.fest_team_id, ft.name as team_name, ftl.is_first_leader
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      LEFT JOIN fest_team_leaders ftl ON u.id = ftl.user_id
      LEFT JOIN fest_teams ft ON ftl.fest_team_id = ft.id
      WHERE r.name IN ('judge', 'stage_admin', 'green_room', 'announcer', 'leader')
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
    const { rows } = await pool.query(`
      SELECT p.id, p.chest_number, p.category, s.name as student_name, s.admission_number, t.name as team_name, t.id as team_id
      FROM fest_participants p
      JOIN students s ON p.student_id = s.id
      JOIN fest_teams t ON p.fest_team_id = t.id
      ORDER BY p.chest_number ASC
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.post('/admin/participants', authorize('admin'), async (req: AuthRequest, res) => {
  const { student_id, fest_team_id } = req.body;
  try {
    await pool.query('BEGIN');
    
    // Check if student is already a participant
    const exist = await pool.query(`SELECT id FROM fest_participants WHERE student_id = $1`, [student_id]);
    if (exist.rows.length > 0) {
      throw new Error('Student is already registered as a participant.');
    }
    
    // Get next chest number
    const teamRes = await pool.query(`SELECT chest_number_start FROM fest_teams WHERE id = $1`, [fest_team_id]);
    if (teamRes.rows.length === 0) throw new Error('Team not found');
    const start = teamRes.rows[0].chest_number_start;
    
    const maxRes = await pool.query(`SELECT MAX(chest_number) as max_cn FROM fest_participants WHERE fest_team_id = $1`, [fest_team_id]);
    let nextCn = start;
    if (maxRes.rows[0].max_cn && maxRes.rows[0].max_cn >= start) {
      nextCn = maxRes.rows[0].max_cn + 1;
    }
    
    const { rows } = await pool.query(
      `INSERT INTO fest_participants (student_id, fest_team_id, chest_number) VALUES ($1, $2, $3) RETURNING *`,
      [student_id, fest_team_id, nextCn]
    );
    await pool.query('COMMIT');
    res.json(rows[0]);
  } catch (err: any) {
    await pool.query('ROLLBACK');
    res.status(400).json({ error: err.message || 'Server error' });
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
    const { rows } = await pool.query(`
      SELECT r.id, r.code_letter, p.chest_number, s.name as student_name, pr.title as program_title, pr.id as program_id
      FROM fest_registrations r
      JOIN fest_participants p ON r.fest_participant_id = p.id
      JOIN students s ON p.student_id = s.id
      JOIN fest_programs pr ON r.fest_program_id = pr.id
      ORDER BY r.id DESC
    `);
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
    // If admin, they see all programs
    // If judge, they see only their assigned programs
    const userId = req.user?.id;
    let query = `SELECT id, title, category, type, status, is_called FROM fest_programs`;
    let params: any[] = [];
    
    if (req.user?.role === 'judge') {
        query = `SELECT p.id, p.title, p.category, p.type, p.status, p.is_called 
                 FROM fest_programs p
                 JOIN fest_program_judges pj ON p.id = pj.fest_program_id
                 WHERE pj.judge_id = $1`;
        params = [userId];
    }
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
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
      `SELECT id as registration_id, code_letter 
       FROM fest_registrations 
       WHERE fest_program_id = $1 AND code_letter IS NOT NULL`, 
      [programId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/judge/mark', authorize('judge'), async (req: AuthRequest, res) => {
  const { registration_id, mark } = req.body;
  const judgeId = req.user?.id;
  try {
    await pool.query(
      `INSERT INTO fest_marks (fest_registration_id, judge_id, mark) 
       VALUES ($1, $2, $3)
       ON CONFLICT (fest_registration_id, judge_id) DO UPDATE SET mark = EXCLUDED.mark`,
      [registration_id, judgeId, mark]
    );
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
    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.category 
       FROM fest_programs p
       WHERE EXISTS (
         SELECT 1 FROM fest_registrations reg
         JOIN fest_marks m ON reg.id = m.fest_registration_id
         WHERE reg.fest_program_id = p.id
       ) AND NOT EXISTS (
         SELECT 1 FROM fest_results r WHERE r.fest_program_id = p.id
       )`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/green-room/program/:programId', authorize('green_room', 'admin'), async (req, res) => {
    // Get all marks for a program
    const { programId } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT reg.id as registration_id, reg.code_letter, part.chest_number, t.name as team_name,
                    m.mark, m.judge_id, u.username as judge_name
             FROM fest_registrations reg
             JOIN fest_participants part ON reg.fest_participant_id = part.id
             JOIN fest_teams t ON part.fest_team_id = t.id
             LEFT JOIN fest_marks m ON reg.id = m.fest_registration_id
             LEFT JOIN users u ON m.judge_id = u.id
             WHERE reg.fest_program_id = $1`,
            [programId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/green-room/verify', authorize('green_room', 'admin'), async (req, res) => {
  const { program_id, results } = req.body;
  // results should be array of { registration_id, position, points }
  try {
    await pool.query('BEGIN');
    for (const r of results) {
        await pool.query(
            `INSERT INTO fest_results (fest_program_id, fest_registration_id, position, points)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (fest_program_id, fest_registration_id) DO UPDATE SET position = EXCLUDED.position, points = EXCLUDED.points`,
            [program_id, r.registration_id, r.position, r.points]
        );
    }
    await pool.query(`UPDATE fest_programs SET status = 'completed' WHERE id = $1`, [program_id]);
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Announcer Routes
router.get('/announcer/pending', authorize('announcer', 'admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT p.id, p.title, p.category 
       FROM fest_programs p
       JOIN fest_results r ON p.id = r.fest_program_id
       WHERE r.published_at IS NULL`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/announcer/publish', authorize('announcer', 'admin'), async (req: AuthRequest, res) => {
  const { program_id } = req.body;
  const userId = req.user?.id;
  try {
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

// Stage Admin Routes
router.get('/stage-admin/programs/:id/participants', authorize('stage_admin', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.id as registration_id, r.code_letter, p.chest_number, s.name as student_name, t.name as team_name
      FROM fest_registrations r
      JOIN fest_participants p ON r.fest_participant_id = p.id
      JOIN students s ON p.student_id = s.id
      JOIN fest_teams t ON p.fest_team_id = t.id
      WHERE r.fest_program_id = $1
      ORDER BY p.chest_number ASC
    `, [req.params.id]);
    res.json(rows);
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
    
    // Query total registered count for this program to constrain code pool to first N letters
    const countRes = await pool.query(`SELECT COUNT(*)::int as total FROM fest_registrations WHERE fest_program_id = $1`, [programId]);
    const totalCount = countRes.rows[0].total || 1;

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
        `SELECT p.chest_number, p.fest_team_id, s.name as student_name, pr.title as program_title
         FROM fest_participants p
         JOIN students s ON p.student_id = s.id
         JOIN fest_registrations reg ON reg.fest_participant_id = p.id
         JOIN fest_programs pr ON reg.fest_program_id = pr.id
         WHERE p.id = $1 AND reg.id = $2`,
        [participantId, registration_id]
      );
      if (partInfo.rows.length > 0) {
        const info = partInfo.rows[0];
        // Store in DB
        await pool.query(
          `INSERT INTO fest_notifications (type, program_id, title, data) VALUES ($1, $2, $3, $4)`,
          ['PARTICIPANT_REPORTED', programId, info.program_title, JSON.stringify({
            student_name: info.student_name,
            chest_number: info.chest_number,
            program_title: info.program_title,
            code_letter,
          })]
        );

        sendToTeamLeaders(info.fest_team_id, {
          type: 'PARTICIPANT_REPORTED',
          timestamp: new Date().toISOString(),
          data: {
            student_name: info.student_name,
            chest_number: info.chest_number,
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
    // Clear all existing codes for this program
    await pool.query(`UPDATE fest_registrations SET code_letter = NULL WHERE fest_program_id = $1`, [program_id]);
    
    // Fetch all registrations for this program
    const regRes = await pool.query(`SELECT id FROM fest_registrations WHERE fest_program_id = $1 ORDER BY id`, [program_id]);
    const regs = regRes.rows;

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let poolLetters = regs.length <= 26 ? letters.slice(0, Math.max(regs.length, 1)) : [...letters];
    if (regs.length > letters.length) {
      for (let i = 0; i < letters.length && poolLetters.length < regs.length; i++) {
        for (let j = 0; j < letters.length && poolLetters.length < regs.length; j++) {
          poolLetters.push(letters[i] + letters[j]);
        }
      }
    }

    // Shuffle poolLetters (Fisher-Yates)
    for (let i = poolLetters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [poolLetters[i], poolLetters[j]] = [poolLetters[j], poolLetters[i]];
    }

    // Assign shuffled code letters to each registration
    for (let i = 0; i < regs.length; i++) {
      await pool.query(`UPDATE fest_registrations SET code_letter = $1 WHERE id = $2`, [poolLetters[i], regs[i].id]);
    }

    res.json({ success: true, count: regs.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ==========================================
// LEADER ROUTES
// ==========================================

// SSE stream for real-time leader notifications
router.get('/leader/notifications/stream', authenticate, authorize('leader'), async (req: AuthRequest, res) => {
  const userId = req.user!.id;

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

  // Keep alive every 30s
  const keepAlive = setInterval(() => {
    res.write(`: keepalive\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
    const idx = sseClients.findIndex(c => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// Leader dashboard data: team info, participants, points
router.get('/leader/dashboard', authenticate, authorize('leader'), async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    // Get leader's team
    const teamRes = await pool.query(
      `SELECT ftl.fest_team_id, ftl.is_first_leader, ft.name as team_name
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
      `SELECT r.position, r.points, pr.title as program_title, pr.category, s.name as student_name, p.chest_number
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
       WHERE status IN ('live', 'scheduled')
       ORDER BY 
         CASE WHEN status = 'live' THEN 1 ELSE 2 END ASC, 
         title ASC
       LIMIT 5`
    );

    // Get leaderboard for context
    const leaderboardRes = await pool.query(
      `SELECT t.id, t.name as team_name, COALESCE(SUM(r.points), 0)::int as total_points
       FROM fest_teams t
       LEFT JOIN fest_participants part ON t.id = part.fest_team_id
       LEFT JOIN fest_registrations reg ON part.id = reg.fest_participant_id
       LEFT JOIN fest_results r ON reg.id = r.fest_registration_id AND r.published_at IS NOT NULL
       GROUP BY t.id, t.name
       ORDER BY total_points DESC`
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

    res.json({
      team: {
        id: team.fest_team_id,
        name: team.team_name,
        is_first_leader: team.is_first_leader,
        total_points: pointsRes.rows[0].total_points,
      },
      participants: participantsRes.rows,
      results: resultsRes.rows,
      live_programs: liveRes.rows,
      leaderboard: leaderboardRes.rows,
      notifications: notifsRes.rows,
      active_calls: activeCallsRes.rows,
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
    const teamRes = await pool.query(`SELECT fest_team_id FROM fest_team_leaders WHERE user_id = $1 LIMIT 1`, [userId]);
    if (teamRes.rows.length === 0) return res.status(403).json({ error: 'No team assigned' });
    const teamId = teamRes.rows[0].fest_team_id;

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
      ORDER BY p.category, p.type, p.title
    `, [teamId]);
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
router.get('/admin/results', authenticate, authorize('admin'), async (_req, res) => {
  try {
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
      ORDER BY r.published_at DESC NULLS FIRST, p.title, r.position
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Admin upload poster template and save config
router.post('/admin/poster-template', authenticate, authorize('admin'), upload.single('template'), async (req: AuthRequest, res) => {
  try {
    const config = req.body.config || '{}';
    
    // Check if there is an existing template to update or insert new
    const existing = await pool.query(`SELECT id, image_url FROM fest_poster_templates ORDER BY id DESC LIMIT 1`);
    
    let imageUrl = existing.rows.length > 0 ? existing.rows[0].image_url : '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    if (!imageUrl && !req.file) {
      return res.status(400).json({ error: 'Image file is required for the first template.' });
    }

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE fest_poster_templates SET image_url = $1, config = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [imageUrl, config, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO fest_poster_templates (image_url, config) VALUES ($1, $2)`,
        [imageUrl, config]
      );
    }

    res.json({ success: true, image_url: imageUrl, config: JSON.parse(config) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Public GET poster template
router.get('/public/poster-template', async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT image_url, config FROM fest_poster_templates ORDER BY id DESC LIMIT 1`);
    if (rows.length === 0) {
      return res.json({ configured: false, image_url: null, config: null });
    }
    res.json({ configured: true, ...rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

export default router;

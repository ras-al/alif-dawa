import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import pool from '../db';
import crypto from 'crypto';
import { AuthRequest } from '../types';

const router = express.Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================

router.get('/public/programs', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, category, type, status FROM fest_programs ORDER BY id ASC`
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

    // Generate a code letter A, B, C, D...
    const usedCodes = await pool.query(`SELECT code_letter FROM fest_registrations WHERE fest_program_id = $1 AND code_letter IS NOT NULL`, [program_id]);
    const used = new Set(usedCodes.rows.map(r => r.code_letter));
    
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let newCode = null;
    for (let i = 0; i < letters.length; i++) {
      if (!used.has(letters[i])) {
        newCode = letters[i];
        break;
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
      SELECT u.id, u.username, r.name as role 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE r.name IN ('judge', 'stage_admin', 'green_room', 'announcer')
      ORDER BY r.name, u.username
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.delete('/admin/users/:id', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    await pool.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});
// Participants
router.get('/admin/participants', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.chest_number, s.name as student_name, s.admission_number, t.name as team_name, t.id as team_id
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
    let query = `SELECT id, title, category, type, status FROM fest_programs`;
    let params: any[] = [];
    
    if (req.user?.role === 'judge') {
        query = `SELECT p.id, p.title, p.category, p.type, p.status 
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
    const regRes = await pool.query(`SELECT fest_program_id, code_letter FROM fest_registrations WHERE id = $1`, [registration_id]);
    if (regRes.rows.length === 0) return res.status(404).json({ error: 'Registration not found' });
    if (regRes.rows[0].code_letter) return res.status(400).json({ error: 'Code letter already generated', code_letter: regRes.rows[0].code_letter });
    
    const programId = regRes.rows[0].fest_program_id;
    
    // Get assigned letters
    const assignedRes = await pool.query(
      `SELECT code_letter FROM fest_registrations WHERE fest_program_id = $1 AND code_letter IS NOT NULL`,
      [programId]
    );
    const assigned = assignedRes.rows.map(r => r.code_letter);
    
    // Generate new letter (A-Z, AA-ZZ)
    let code_letter = '';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < letters.length; i++) {
      if (!assigned.includes(letters[i])) { code_letter = letters[i]; break; }
    }
    if (!code_letter) {
      for (let i = 0; i < letters.length; i++) {
        for (let j = 0; j < letters.length; j++) {
          const combo = letters[i] + letters[j];
          if (!assigned.includes(combo)) { code_letter = combo; break; }
        }
        if (code_letter) break;
      }
    }
    
    await pool.query(`UPDATE fest_registrations SET code_letter = $1 WHERE id = $2`, [code_letter, registration_id]);
    res.json({ code_letter });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

export default router;

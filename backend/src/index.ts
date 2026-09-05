import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import pool from './db';

import authRoutes from './routes/auth';
import studentRoutes from './routes/students';
import teacherRoutes from './routes/teachers';
import classRoutes from './routes/classes';
import academicYearRoutes from './routes/academicYears';
import markRoutes from './routes/marks';
import attendanceRoutes from './routes/attendance';
import announcementRoutes from './routes/announcements';
import leaveRoutes from './routes/leave';
import dashboardRoutes from './routes/dashboard';
import settingsRoutes from './routes/settings';
import userRoutes from './routes/users';
import feedbackRoutes from './routes/feedback';
import festRoutes from './routes/fest';

dotenv.config();

// Auto-migrate missing columns
pool.query('ALTER TABLE fest_results ADD COLUMN IF NOT EXISTS grade VARCHAR(5);').catch(console.error);
pool.query('ALTER TABLE fest_programs ADD COLUMN IF NOT EXISTS sequence_number INTEGER;').catch(console.error);
pool.query(`CREATE TABLE IF NOT EXISTS fest_award_redemptions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  redeemed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`).catch(console.error);
pool.query(`CREATE INDEX IF NOT EXISTS idx_award_redemptions_student ON fest_award_redemptions(student_id);`).catch(console.error);
pool.query(`INSERT INTO roles (name) VALUES ('media') ON CONFLICT (name) DO NOTHING;`).catch(console.error);
pool.query(`INSERT INTO roles (name) VALUES ('award_point') ON CONFLICT (name) DO NOTHING;`).catch(console.error);

// Ensure any completed fest programs with results have sequence numbers assigned per event_type
async function ensureResultSequenceNumbers() {
  try {
    for (const eventType of ['MAIN', 'HIFZ']) {
      const unassigned = await pool.query(`
        SELECT p.id
        FROM fest_programs p
        JOIN fest_results r ON p.id = r.fest_program_id
        WHERE p.event_type = $1 AND p.sequence_number IS NULL
        GROUP BY p.id
        ORDER BY MIN(r.published_at) ASC NULLS LAST, p.id ASC
      `, [eventType]);

      if (unassigned.rows.length === 0) continue;

      const maxRes = await pool.query(`
        SELECT COALESCE(MAX(sequence_number), 0) as max_seq
        FROM fest_programs
        WHERE event_type = $1
      `, [eventType]);
      let currentSeq = parseInt(maxRes.rows[0].max_seq, 10);

      for (const prog of unassigned.rows) {
        currentSeq++;
        await pool.query('UPDATE fest_programs SET sequence_number = $1 WHERE id = $2', [currentSeq, prog.id]);
      }
    }
  } catch (err) {
    console.error('Error ensuring result sequence numbers:', err);
  }
}
ensureResultSequenceNumbers();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/marks', markRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/fest', festRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port as number, '0.0.0.0', () => {
  console.log(`Alif Dawa College API running on port ${port}`);
});

export default app;

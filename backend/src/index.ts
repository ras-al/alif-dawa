import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

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

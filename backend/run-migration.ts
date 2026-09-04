import 'dotenv/config';
import pool from './src/db';

async function migrate() {
  try {
    await pool.query('ALTER TABLE fest_results ADD COLUMN grade VARCHAR(5);');
    console.log('Migration successful: added grade column');
  } catch (e: any) {
    if (e.code === '42701') {
      console.log('Column already exists, ignoring');
    } else {
      console.error('Migration error:', e);
    }
  }
  process.exit(0);
}
migrate();

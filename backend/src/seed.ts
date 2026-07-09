import bcrypt from 'bcrypt';
import pool from './db';

/**
 * Seeds the database with the initial admin user.
 * Run this after executing schema.sql:
 *   npx ts-node src/seed.ts
 */
async function seed() {
  const adminUsername = 'admin';
  const adminPassword = 'admin123'; // Change this immediately after first login

  try {
    // Check if admin already exists
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [adminUsername]);
    if (existing.rows.length > 0) {
      console.log('Admin user already exists. Skipping seed.');
      process.exit(0);
    }

    const hash = await bcrypt.hash(adminPassword, 10);
    const roleResult = await pool.query("SELECT id FROM roles WHERE name = 'admin'");

    if (roleResult.rows.length === 0) {
      console.error('Admin role not found. Run schema.sql first.');
      process.exit(1);
    }

    await pool.query(
      'INSERT INTO users (username, password_hash, role_id) VALUES ($1, $2, $3)',
      [adminUsername, hash, roleResult.rows[0].id]
    );

    console.log('Admin user created successfully.');
    console.log(`  Username: ${adminUsername}`);
    console.log(`  Password: ${adminPassword}`);
    console.log('  IMPORTANT: Change this password after first login.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();

import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const teamsData = [
  {
    name: 'Vanguard',
    startChest: 100,
    premier: ['Aswim Thaha', 'Salim KP', 'Shamveel', 'muhammed NK', 'Nabeed', 'Abdhul Bari'],
    junior: ['Habeeb', 'Shihad', 'Afraz', 'Ameen', 'Razi VK', 'Muhammed M', 'Muhammed PP', 'Rabeeb PK', 'Nizam'],
    senior: ['Anas', 'Sahal kc', 'Vadood', 'Sajad M', 'Shammas', 'Thufail', 'Shahad', 'Irfan', 'Afnas']
  },
  {
    name: 'Renegades',
    startChest: 200,
    premier: ['Aswim PP', 'Abdulla DK', 'Swalih PK', 'Muhammed KP', 'Swalih VK'],
    junior: ['Basheer', 'Simak', 'Rizwan', 'Sajad', 'Asif Ali', 'Ameer', 'Sinan k', 'Vasil', 'Rabeeb AP', 'Shamil', 'Shabeeb'],
    senior: ['Favas', 'Adnan', 'Asbullah', 'Muhammed EP', 'Shadil', 'Adil roshan', 'Labeeb']
  },
  {
    name: 'Divergent',
    startChest: 300,
    premier: ['Swalih PP', 'Razan', 'Rayyan', 'Yaseen', 'Mukthar'],
    junior: ['Hafiz Rasi', 'Shazin', 'Sabah', 'Fajid', 'Fathih', 'Swalih PP', 'Nabeel', 'Thufail UK', 'Ajmal', 'Jalal'],
    senior: ['Sajad N', 'Rizwan', 'Ameen T', 'Afnan', 'mishab', 'Shifan', 'Mifthah']
  },
  {
    name: 'ABC',
    startChest: 400,
    premier: ['Test Premier 1', 'Test Premier 2'],
    junior: ['Test Junior 1', 'Test Junior 2'],
    senior: ['Test Senior 1', 'Test Senior 2']
  }
];

async function seed() {
  try {
    console.log('Starting seed process...');

    // 1. Run migration 008 manually here just in case
    console.log('Ensuring leader role and tables exist...');
    await pool.query(`INSERT INTO roles (name) VALUES ('leader') ON CONFLICT (name) DO NOTHING;`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fest_team_leaders (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          fest_team_id INTEGER NOT NULL REFERENCES fest_teams(id) ON DELETE CASCADE,
          is_first_leader BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, fest_team_id)
      );
    `);

    console.log('Running schema migrations for program limits...');
    try {
      await pool.query(`ALTER TABLE fest_programs ADD COLUMN team_limit INTEGER;`);
    } catch (e) { /* ignores if exists */ }
    try {
      await pool.query(`ALTER TABLE fest_programs ADD COLUMN is_group BOOLEAN DEFAULT false;`);
    } catch (e) { /* ignores if exists */ }
    try {
      await pool.query(`ALTER TABLE fest_participants ADD COLUMN category VARCHAR(50);`);
    } catch (e) { /* ignores if exists */ }

    // 2. Clear previous fest data and related test students/users
    console.log('Clearing old fest teams and participants...');
    await pool.query('DELETE FROM fest_participants');
    await pool.query('DELETE FROM fest_teams'); // Cascades to leaders
    await pool.query("DELETE FROM students WHERE admission_number LIKE 'ADM-%'");

    // Get role IDs
    const roleRes = await pool.query(`SELECT id FROM roles WHERE name = 'leader'`);
    const leaderRoleId = roleRes.rows[0].id;
    const defaultPassword = await bcrypt.hash('123456', 10);

    // Create staff roles & accounts if they don't exist
    const staffRoles = ['stage_admin', 'judge', 'green_room', 'announcer'];
    for (const rName of staffRoles) {
      await pool.query(`INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING;`, [rName]);
      const sRoleRes = await pool.query(`SELECT id FROM roles WHERE name = $1`, [rName]);
      const sRoleId = sRoleRes.rows[0].id;

      const staffUsernames = rName === 'judge' ? ['judge1', 'judge2'] : [rName];
      for (const sUsername of staffUsernames) {
        const uCheck = await pool.query('SELECT id FROM users WHERE username = $1', [sUsername]);
        if (uCheck.rows.length === 0) {
          await pool.query(
            `INSERT INTO users (username, password_hash, role_id) VALUES ($1, $2, $3)`,
            [sUsername, defaultPassword, sRoleId]
          );
          console.log(`  - Created Staff Account: ${sUsername} (Password: 123456)`);
        }
      }
    }

    let admCounter = 1000;

    for (const team of teamsData) {
      console.log(`Processing Team: ${team.name}`);
      
      // Insert Team
      const teamRes = await pool.query(
        `INSERT INTO fest_teams (name, chest_number_start) VALUES ($1, $2) RETURNING id`,
        [team.name, team.startChest]
      );
      const teamId = teamRes.rows[0].id;

      // Create primary Team account (e.g., 'vanguard' and 'team_vanguard')
      const teamUsernames = [
        team.name.toLowerCase().replace(/\s+/g, ''),
        `team_${team.name.toLowerCase().replace(/\s+/g, '')}`
      ];

      for (const tUsername of teamUsernames) {
        let teamUserId;
        const uCheck = await pool.query('SELECT id FROM users WHERE username = $1', [tUsername]);
        if (uCheck.rows.length > 0) {
          teamUserId = uCheck.rows[0].id;
        } else {
          const uRes = await pool.query(
            `INSERT INTO users (username, password_hash, role_id) VALUES ($1, $2, $3) RETURNING id`,
            [tUsername, defaultPassword, leaderRoleId]
          );
          teamUserId = uRes.rows[0].id;
        }
        await pool.query(
          `INSERT INTO fest_team_leaders (user_id, fest_team_id, is_first_leader) VALUES ($1, $2, true) ON CONFLICT DO NOTHING`,
          [teamUserId, teamId]
        );
        console.log(`  - Created Team Login: ${tUsername} (Password: 123456)`);
      }
      


      let chestNum = team.startChest;

      const categories = [
        { name: 'Premier', participants: team.premier },
        { name: 'Junior', participants: team.junior },
        { name: 'Senior', participants: team.senior }
      ];

      for (const cat of categories) {
        for (const studentName of cat.participants) {
          const adm = `ADM-${admCounter++}`;
          const studRes = await pool.query(
            `INSERT INTO students (admission_number, name) VALUES ($1, $2) RETURNING id`,
            [adm, studentName]
          );
          const studentId = studRes.rows[0].id;

          await pool.query(
            `INSERT INTO fest_participants (student_id, fest_team_id, category, chest_number) VALUES ($1, $2, $3, $4)`,
            [studentId, teamId, cat.name, chestNum.toString()]
          );
          chestNum++;
        }
      }
      console.log(`  - Added ${team.premier.length + team.junior.length + team.senior.length} participants`);
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();

import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const hifzPrograms = [
  // Stage
  { category: 'Stage', type: 'stage', title: 'Speech malayalam', team_limit: 3, is_group: false },
  { category: 'Stage', type: 'stage', title: 'Madh song', team_limit: 3, is_group: false },
  { category: 'Stage', type: 'stage', title: 'Poem recitation malayalam', team_limit: 2, is_group: false },
  { category: 'Stage', type: 'stage', title: "Qira'th", team_limit: 5, is_group: false },
  { category: 'Stage', type: 'stage', title: 'Hifz', team_limit: 5, is_group: false },
  { category: 'Stage', type: 'stage', title: 'Story telling', team_limit: 3, is_group: false },
  { category: 'Stage', type: 'stage', title: 'Story telling english', team_limit: 2, is_group: false },
  { category: 'Stage', type: 'stage', title: 'Mappilappattu', team_limit: 3, is_group: false },

  // General (Stage)
  { category: 'General Stage', type: 'stage', title: 'Group song A', team_limit: 4, is_group: true },
  { category: 'General Stage', type: 'stage', title: 'Group song B', team_limit: 4, is_group: true },
  { category: 'General Stage', type: 'stage', title: "Group qira'th", team_limit: 3, is_group: true },
  { category: 'General Stage', type: 'stage', title: 'Burda recitation', team_limit: 5, is_group: true },
  { category: 'General Stage', type: 'stage', title: 'Nasheeda', team_limit: 4, is_group: true },
  { category: 'General Stage', type: 'stage', title: 'Qawwali', team_limit: 5, is_group: true },
  { category: 'General Stage', type: 'stage', title: 'Tajweed teaching', team_limit: 2, is_group: false },
  { category: 'General Stage', type: 'stage', title: 'Q-TALK', team_limit: 2, is_group: true },
  { category: 'General Stage', type: 'stage', title: 'Moulid recitation', team_limit: 4, is_group: true },

  // Off-Stage
  { category: 'Off-Stage', type: 'off-stage', title: 'Hand writing malayalam', team_limit: null, is_group: false },
  { category: 'Off-Stage', type: 'off-stage', title: 'Reading malayalam UP', team_limit: 3, is_group: false },
  { category: 'Off-Stage', type: 'off-stage', title: 'Reading english UP, HS', team_limit: 3, is_group: false },
  { category: 'Off-Stage', type: 'off-stage', title: 'Reading arabic HS', team_limit: 3, is_group: false },
  { category: 'Off-Stage', type: 'off-stage', title: 'Poem writing malayalam', team_limit: null, is_group: false },
  { category: 'Off-Stage', type: 'off-stage', title: 'Story writing malayalam', team_limit: null, is_group: false },
  { category: 'Off-Stage', type: 'off-stage', title: 'Drawing', team_limit: 5, is_group: false },
  { category: 'Off-Stage', type: 'off-stage', title: 'Book test', team_limit: 2, is_group: false },
  { category: 'Off-Stage', type: 'off-stage', title: 'Ganithakeli', team_limit: 5, is_group: false },
  { category: 'Off-Stage', type: 'off-stage', title: 'Memory test', team_limit: 5, is_group: false },
  { category: 'Off-Stage', type: 'off-stage', title: 'Quiz', team_limit: 7, is_group: true },
  { category: 'Off-Stage', type: 'off-stage', title: 'Essay malayalam', team_limit: null, is_group: false },
  { category: 'Off-Stage', type: 'off-stage', title: 'Story writing english', team_limit: 3, is_group: false },
  { category: 'Off-Stage', type: 'off-stage', title: 'Poem writing english', team_limit: 3, is_group: false },
  { category: 'Off-Stage', type: 'off-stage', title: 'News reading', team_limit: 4, is_group: false },
  { category: 'Off-Stage', type: 'off-stage', title: 'Translation english to malayalam', team_limit: 3, is_group: false },
  { category: 'Off-Stage', type: 'off-stage', title: 'Water colour', team_limit: 5, is_group: false },

  // General (Off-Stage)
  { category: 'General Off-Stage', type: 'off-stage', title: 'Poster designing', team_limit: 2, is_group: false },
  { category: 'General Off-Stage', type: 'off-stage', title: 'Team magazine', team_limit: null, is_group: true },
  { category: 'General Off-Stage', type: 'off-stage', title: 'Calligraphy', team_limit: 2, is_group: false },
  { category: 'General Off-Stage', type: 'off-stage', title: 'Slogan writing', team_limit: 3, is_group: false },
  { category: 'General Off-Stage', type: 'off-stage', title: 'Madh song writing', team_limit: 3, is_group: false },
  { category: 'General Off-Stage', type: 'off-stage', title: 'Ahqaf combo', team_limit: 5, is_group: true },
  { category: 'General Off-Stage', type: 'off-stage', title: 'Amma combo', team_limit: null, is_group: true },
  { category: 'General Off-Stage', type: 'off-stage', title: 'Ismuljalala', team_limit: 5, is_group: false },
  { category: 'General Off-Stage', type: 'off-stage', title: 'Find the verse', team_limit: 3, is_group: true },
  { category: 'General Off-Stage', type: 'off-stage', title: 'Tajweed debate', team_limit: 4, is_group: true },
  { category: 'General Off-Stage', type: 'off-stage', title: 'Quran quiz', team_limit: 3, is_group: true },
  { category: 'General Off-Stage', type: 'off-stage', title: 'News reporting', team_limit: 3, is_group: false },
];

const hifzTeamsData = [
  {
    name: 'Furqan',
    startChest: 500,
    participants: ['Aouf', 'Sahal Vk', 'Hadi', 'Mujthaba hafiz', 'Bashaar Ahmed', 'Shazin', 'Ahmed Mujthaba', 'Ameen k', 'Zain .N', 'Shajin', 'Thameem', 'Shibli', 'Savad', 'Thwaha']
  },
  {
    name: 'Burhan',
    startChest: 600,
    participants: ['Ahmed Raza', 'Al Miran', 'Swalih Pk', 'Masshoor', 'Muhammed pv', 'Thasneem', 'Muhammed e', 'Sayyid Muhammed Ali', 'Ameen T', 'Bujair', 'Rabeeh', 'Yasir', 'Aseel', 'Hidash Ahmed']
  }
];

async function seed() {
  try {
    console.log('Starting seed process for Hifz Fest...');

    // Clear old hifz data
    await pool.query(`DELETE FROM fest_participants WHERE event_type = 'HIFZ'`);
    await pool.query(`DELETE FROM fest_programs WHERE event_type = 'HIFZ'`);
    await pool.query(`DELETE FROM fest_teams WHERE event_type = 'HIFZ'`);
    // Delete hifz students created previously
    await pool.query("DELETE FROM students WHERE admission_number LIKE 'HIFZ-%'");

    // 1. Seed Programs
    console.log('Seeding Hifz programs...');
    for (const p of hifzPrograms) {
      await pool.query(
        `INSERT INTO fest_programs (title, category, type, team_limit, is_group, event_type) VALUES ($1, $2, $3, $4, $5, $6)`,
        [p.title, p.category, p.type, p.team_limit, p.is_group, 'HIFZ']
      );
    }

    const roleRes = await pool.query(`SELECT id FROM roles WHERE name = 'leader'`);
    const leaderRoleId = roleRes.rows[0].id;
    const defaultPassword = await bcrypt.hash('123456', 10);

    let admCounter = 1000;

    for (const team of hifzTeamsData) {
      console.log(`Processing Team: ${team.name}`);
      
      const teamRes = await pool.query(
        `INSERT INTO fest_teams (name, chest_number_start, event_type) VALUES ($1, $2, $3) RETURNING id`,
        [team.name, team.startChest, 'HIFZ']
      );
      const teamId = teamRes.rows[0].id;

      const tUsername = team.name.toLowerCase();
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

      let chestNum = team.startChest;

      for (const studentName of team.participants) {
        const adm = `HIFZ-${admCounter++}`;
        const studRes = await pool.query(
          `INSERT INTO students (admission_number, name) VALUES ($1, $2) RETURNING id`,
          [adm, studentName]
        );
        const studentId = studRes.rows[0].id;

        await pool.query(
          `INSERT INTO fest_participants (student_id, fest_team_id, chest_number, event_type) VALUES ($1, $2, $3, $4)`,
          [studentId, teamId, chestNum.toString(), 'HIFZ']
        );
        chestNum++;
      }
      console.log(`  - Added ${team.participants.length} participants`);
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();

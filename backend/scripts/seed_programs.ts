import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const programs = [
  // Premier Stage
  { category: 'Premier', type: 'stage', title: 'Speech malayalam', team_limit: 3, is_group: false },
  { category: 'Premier', type: 'stage', title: 'Madh song', team_limit: 3, is_group: false },
  { category: 'Premier', type: 'stage', title: 'poem recitation malayalam', team_limit: 2, is_group: false },
  { category: 'Premier', type: 'stage', title: "Qira'th", team_limit: 3, is_group: false },
  { category: 'Premier', type: 'stage', title: 'Hifz', team_limit: 3, is_group: false },
  { category: 'Premier', type: 'stage', title: 'Story telling', team_limit: 3, is_group: false },
  { category: 'Premier', type: 'stage', title: 'Moulid recitation', team_limit: 4, is_group: true },

  // Premier Off-stage
  { category: 'Premier', type: 'off-stage', title: 'Hand writing malayalam', team_limit: 3, is_group: false },
  { category: 'Premier', type: 'off-stage', title: 'Reading malayalam', team_limit: 3, is_group: false },
  { category: 'Premier', type: 'off-stage', title: 'Reading english', team_limit: 3, is_group: false },
  { category: 'Premier', type: 'off-stage', title: 'Reading Arabic', team_limit: 3, is_group: false },
  { category: 'Premier', type: 'off-stage', title: 'Drawing pencil', team_limit: 3, is_group: false },
  { category: 'Premier', type: 'off-stage', title: 'Book test', team_limit: 3, is_group: false },
  { category: 'Premier', type: 'off-stage', title: 'Ganitha keli', team_limit: 2, is_group: false },
  { category: 'Premier', type: 'off-stage', title: 'Memmory test', team_limit: 3, is_group: false },
  { category: 'Premier', type: 'off-stage', title: 'Drawing Water colour', team_limit: 3, is_group: false },

  // Junior Stage
  { category: 'Junior', type: 'stage', title: 'Speech malayalam', team_limit: 4, is_group: false },
  { category: 'Junior', type: 'stage', title: 'Speech english', team_limit: 3, is_group: false },
  { category: 'Junior', type: 'stage', title: 'Speech Arabic', team_limit: 2, is_group: false },
  { category: 'Junior', type: 'stage', title: 'Madh song', team_limit: 3, is_group: false },
  { category: 'Junior', type: 'stage', title: "Qira'th", team_limit: 3, is_group: false },
  { category: 'Junior', type: 'stage', title: 'poem recitation malayalam', team_limit: 2, is_group: false },
  { category: 'Junior', type: 'stage', title: 'spot dawa', team_limit: 1, is_group: false },
  { category: 'Junior', type: 'stage', title: "Va'al", team_limit: 3, is_group: false },
  { category: 'Junior', type: 'stage', title: 'Maalappattu', team_limit: 3, is_group: true },

  // Junior Off-stage
  { category: 'Junior', type: 'off-stage', title: 'Essay writing malayalam', team_limit: null, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'Essay english', team_limit: 3, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'Story writing malayalam', team_limit: null, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'Story writing english', team_limit: 3, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'Poem writing malayalam', team_limit: null, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'Poem writing english', team_limit: 3, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'News reading', team_limit: 2, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'Swarf test', team_limit: 3, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'Nahv test', team_limit: 2, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'Hifz', team_limit: 3, is_group: false },
  { category: 'Junior', type: 'off-stage', title: "Ma'ashara", team_limit: 2, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'Ibarath idal', team_limit: 3, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'Translation english to malayalam', team_limit: 3, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'Drawing pencil', team_limit: 3, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'Drawing water colour', team_limit: 3, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'Memmory test', team_limit: 3, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'Book test', team_limit: 3, is_group: false },
  { category: 'Junior', type: 'off-stage', title: 'Quiz', team_limit: 3, is_group: false },
  { category: 'Junior', type: 'off-stage', title: "Imlaa'h", team_limit: 2, is_group: false },

  // Senior Stage
  { category: 'Senior', type: 'stage', title: 'Speech malayalam', team_limit: 3, is_group: false },
  { category: 'Senior', type: 'stage', title: 'Speech english', team_limit: 3, is_group: false },
  { category: 'Senior', type: 'stage', title: 'Speech Arabic', team_limit: 2, is_group: false },
  { category: 'Senior', type: 'stage', title: 'Poem recitation english', team_limit: 2, is_group: false },
  { category: 'Senior', type: 'stage', title: "Qira'th", team_limit: 3, is_group: false },
  { category: 'Senior', type: 'stage', title: 'Hifz', team_limit: 3, is_group: false },
  { category: 'Senior', type: 'stage', title: "Va'al", team_limit: 3, is_group: false },
  { category: 'Senior', type: 'stage', title: 'Qaseeda', team_limit: 4, is_group: true },
  { category: 'Senior', type: 'stage', title: 'Mega quiz', team_limit: 2, is_group: false },
  { category: 'Senior', type: 'stage', title: 'Mappila pattu', team_limit: 3, is_group: false },

  // Senior Off-stage
  { category: 'Senior', type: 'off-stage', title: 'Essay malayalam', team_limit: null, is_group: false },
  { category: 'Senior', type: 'off-stage', title: 'Essay english', team_limit: 3, is_group: false },
  { category: 'Senior', type: 'off-stage', title: 'Essay Arabic', team_limit: 3, is_group: false },
  { category: 'Senior', type: 'off-stage', title: 'Story writing english', team_limit: 3, is_group: false },
  { category: 'Senior', type: 'off-stage', title: 'Story writing malayalam', team_limit: null, is_group: false },
  { category: 'Senior', type: 'off-stage', title: 'Poem writing malayalam', team_limit: null, is_group: false },
  { category: 'Senior', type: 'off-stage', title: 'Poem writing english', team_limit: 3, is_group: false },
  { category: 'Senior', type: 'off-stage', title: 'Memmory test english', team_limit: 3, is_group: false },
  { category: 'Senior', type: 'off-stage', title: 'Ibaarath idal', team_limit: 3, is_group: false },
  { category: 'Senior', type: 'off-stage', title: 'Book test', team_limit: 3, is_group: false },
  { category: 'Senior', type: 'off-stage', title: 'Translation malayalam to english', team_limit: 3, is_group: false },
  { category: 'Senior', type: 'off-stage', title: 'Drawing water colour', team_limit: 3, is_group: false },
  { category: 'Senior', type: 'off-stage', title: 'Nahv test', team_limit: 2, is_group: false },
  { category: 'Senior', type: 'off-stage', title: "Imlaa'h", team_limit: 2, is_group: false },

  // General Stage
  { category: 'General', type: 'stage', title: 'Group song', team_limit: 4, is_group: true },
  { category: 'General', type: 'stage', title: 'Debate', team_limit: 5, is_group: true },
  { category: 'General', type: 'stage', title: 'Thadrees', team_limit: 2, is_group: true },
  { category: 'General', type: 'stage', title: 'Nasheeda', team_limit: 4, is_group: true },
  { category: 'General', type: 'stage', title: 'Qawwali', team_limit: 5, is_group: true },
  { category: 'General', type: 'stage', title: 'Viplavaganam', team_limit: 3, is_group: true },
  { category: 'General', type: 'stage', title: 'podcast', team_limit: 3, is_group: true },
  { category: 'General', type: 'stage', title: 'Book discussion', team_limit: 3, is_group: true },
  { category: 'General', type: 'stage', title: 'Fiqh discussion', team_limit: 3, is_group: true },
  { category: 'General', type: 'stage', title: 'Language conference', team_limit: 6, is_group: true },
  { category: 'General', type: 'stage', title: 'Muhadhasa arabiyya', team_limit: 2, is_group: true },
  { category: 'General', type: 'stage', title: 'Bilingual speech', team_limit: 2, is_group: true },
  { category: 'General', type: 'stage', title: "Mas'ala test", team_limit: 2, is_group: true },
  { category: 'General', type: 'stage', title: "Qur'an prabashanam", team_limit: 1, is_group: false },
  { category: 'General', type: 'stage', title: 'Micro teaching', team_limit: 2, is_group: false },
  { category: 'General', type: 'stage', title: 'Paper presentation', team_limit: 1, is_group: false },
  { category: 'General', type: 'stage', title: 'Expo', team_limit: 5, is_group: true },

  // General Off-stage
  { category: 'General', type: 'off-stage', title: 'Poster designing', team_limit: 3, is_group: false },
  { category: 'General', type: 'off-stage', title: 'Feature writing', team_limit: 3, is_group: false },
  { category: 'General', type: 'off-stage', title: 'Book making', team_limit: 5, is_group: true },
  { category: 'General', type: 'off-stage', title: 'Social tweet', team_limit: 3, is_group: true },
  { category: 'General', type: 'off-stage', title: 'Spot magazin', team_limit: 5, is_group: true },
  { category: 'General', type: 'off-stage', title: 'Calligraphy', team_limit: 4, is_group: false },
  { category: 'General', type: 'off-stage', title: 'Supplimentry', team_limit: 5, is_group: true },
  { category: 'General', type: 'off-stage', title: 'Mudhravakya rajana', team_limit: 3, is_group: false },
  { category: 'General', type: 'off-stage', title: 'Madh song writing', team_limit: 2, is_group: false },
  { category: 'General', type: 'off-stage', title: 'News report', team_limit: 2, is_group: false },
  { category: 'General', type: 'off-stage', title: 'Digital painting', team_limit: 1, is_group: false }
];

async function seed() {
  try {
    console.log('Clearing old fest_programs (and registrations)...');
    await pool.query('DELETE FROM fest_programs');

    console.log('Seeding programs with team limits...');
    let count = 0;
    for (const p of programs) {
      await pool.query(
        `INSERT INTO fest_programs (title, category, type, team_limit, is_group) VALUES ($1, $2, $3, $4, $5)`,
        [p.title, p.category, p.type, p.team_limit, p.is_group]
      );
      count++;
    }

    console.log(`Successfully seeded ${count} programs.`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();

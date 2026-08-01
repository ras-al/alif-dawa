import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const programs = [
  // PREMIER STAGE
  { title: "Speech malayalam", category: "Premier", type: "stage", count: 3, is_group: false },
  { title: "Madh song", category: "Premier", type: "stage", count: 3, is_group: false },
  { title: "poem recitation malayalam", category: "Premier", type: "stage", count: 2, is_group: false },
  { title: "Qira'th", category: "Premier", type: "stage", count: 3, is_group: false },
  { title: "Hifz", category: "Premier", type: "stage", count: 3, is_group: false },
  { title: "Story telling", category: "Premier", type: "stage", count: 3, is_group: false },
  { title: "Moulid recitation", category: "Premier", type: "stage", count: 4, is_group: true },

  // OFF STAGE PREMIER
  { title: "Hand writing malayalam", category: "Premier", type: "off-stage", count: 3, is_group: false },
  { title: "Reading malayalam", category: "Premier", type: "off-stage", count: 3, is_group: false },
  { title: "Reading english", category: "Premier", type: "off-stage", count: 3, is_group: false },
  { title: "Reading Arabic", category: "Premier", type: "off-stage", count: 3, is_group: false },
  { title: "Drawing pencil", category: "Premier", type: "off-stage", count: 3, is_group: false },
  { title: "Book test", category: "Premier", type: "off-stage", count: 3, is_group: false },
  { title: "Ganitha keli", category: "Premier", type: "off-stage", count: 2, is_group: false },
  { title: "Memmory test", category: "Premier", type: "off-stage", count: 3, is_group: false },
  { title: "Drawing Water colour", category: "Premier", type: "off-stage", count: 3, is_group: false },

  // JUNIOR STAGE
  { title: "Speech malayalam", category: "Junior", type: "stage", count: 4, is_group: false },
  { title: "Speech english", category: "Junior", type: "stage", count: 3, is_group: false },
  { title: "Speech Arabic", category: "Junior", type: "stage", count: 2, is_group: false },
  { title: "Madh song", category: "Junior", type: "stage", count: 3, is_group: false },
  { title: "Qira'th", category: "Junior", type: "stage", count: 3, is_group: false },
  { title: "poem recitation malayalam", category: "Junior", type: "stage", count: 2, is_group: false },
  { title: "spot dawa", category: "Junior", type: "stage", count: 1, is_group: false },
  { title: "Va'al", category: "Junior", type: "stage", count: 3, is_group: false },
  { title: "Maalappattu", category: "Junior", type: "stage", count: 3, is_group: true },

  // OFF STAGE JUNIOR
  { title: "Essay writing malayalam", category: "Junior", type: "off-stage", count: 999, is_group: false },
  { title: "Essay english", category: "Junior", type: "off-stage", count: 3, is_group: false },
  { title: "Story writing malayalam", category: "Junior", type: "off-stage", count: 999, is_group: false },
  { title: "Story writing english", category: "Junior", type: "off-stage", count: 3, is_group: false },
  { title: "Poem writing malayalam", category: "Junior", type: "off-stage", count: 999, is_group: false },
  { title: "Poem writing english", category: "Junior", type: "off-stage", count: 3, is_group: false },
  { title: "News reading", category: "Junior", type: "off-stage", count: 2, is_group: false },
  { title: "Swarf test", category: "Junior", type: "off-stage", count: 3, is_group: false },
  { title: "Nahv test", category: "Junior", type: "off-stage", count: 2, is_group: false },
  { title: "Hifz", category: "Junior", type: "off-stage", count: 3, is_group: false },
  { title: "Ma'ashara", category: "Junior", type: "off-stage", count: 2, is_group: false },
  { title: "Ibarath idal", category: "Junior", type: "off-stage", count: 3, is_group: false },
  { title: "Translation english to malayalam", category: "Junior", type: "off-stage", count: 3, is_group: false },
  { title: "Drawing pencil", category: "Junior", type: "off-stage", count: 3, is_group: false },
  { title: "Drawing water colour", category: "Junior", type: "off-stage", count: 3, is_group: false },
  { title: "Memmory test", category: "Junior", type: "off-stage", count: 3, is_group: false },
  { title: "Book test", category: "Junior", type: "off-stage", count: 3, is_group: false },
  { title: "Quiz", category: "Junior", type: "off-stage", count: 3, is_group: false },
  { title: "Imlaa'h", category: "Junior", type: "off-stage", count: 2, is_group: false },

  // SENIOR STAGE
  { title: "Speech malayalam", category: "Senior", type: "stage", count: 3, is_group: false },
  { title: "Speech english", category: "Senior", type: "stage", count: 3, is_group: false },
  { title: "Speech Arabic", category: "Senior", type: "stage", count: 2, is_group: false },
  { title: "Poem recitation english", category: "Senior", type: "stage", count: 2, is_group: false },
  { title: "Qira'th", category: "Senior", type: "stage", count: 3, is_group: false },
  { title: "Hifz", category: "Senior", type: "stage", count: 3, is_group: false },
  { title: "Va'al", category: "Senior", type: "stage", count: 3, is_group: false },
  { title: "Qaseeda", category: "Senior", type: "stage", count: 4, is_group: true },
  { title: "Mega quiz", category: "Senior", type: "stage", count: 2, is_group: false },
  { title: "Mappila pattu", category: "Senior", type: "stage", count: 3, is_group: false },

  // OFF STAGE SENIOR
  { title: "Essay malayalam", category: "Senior", type: "off-stage", count: 999, is_group: false },
  { title: "Essay english", category: "Senior", type: "off-stage", count: 3, is_group: false },
  { title: "Essay Arabic", category: "Senior", type: "off-stage", count: 3, is_group: false },
  { title: "Story writing english", category: "Senior", type: "off-stage", count: 3, is_group: false },
  { title: "Story writing malayalam", category: "Senior", type: "off-stage", count: 999, is_group: false },
  { title: "Poem writing malayalam", category: "Senior", type: "off-stage", count: 999, is_group: false },
  { title: "Poem writing english", category: "Senior", type: "off-stage", count: 3, is_group: false },
  { title: "Memmory test english", category: "Senior", type: "off-stage", count: 3, is_group: false },
  { title: "Ibaarath idal", category: "Senior", type: "off-stage", count: 3, is_group: false },
  { title: "Book test", category: "Senior", type: "off-stage", count: 3, is_group: false },
  { title: "Translation malayalam to english", category: "Senior", type: "off-stage", count: 3, is_group: false },
  { title: "Drawing water colour", category: "Senior", type: "off-stage", count: 3, is_group: false },
  { title: "Nahv test", category: "Senior", type: "off-stage", count: 2, is_group: false },
  { title: "Imlaa'h", category: "Senior", type: "off-stage", count: 2, is_group: false },

  // GENERAL STAGE
  { title: "Group song", category: "General", type: "stage", count: 4, is_group: true },
  { title: "Debate", category: "General", type: "stage", count: 5, is_group: true },
  { title: "Thadrees", category: "General", type: "stage", count: 2, is_group: true },
  { title: "Nasheeda", category: "General", type: "stage", count: 4, is_group: true },
  { title: "Qawwali", category: "General", type: "stage", count: 5, is_group: true },
  { title: "Viplavaganam", category: "General", type: "stage", count: 3, is_group: true },
  { title: "podcast", category: "General", type: "stage", count: 3, is_group: true },
  { title: "Book discussion", category: "General", type: "stage", count: 3, is_group: true },
  { title: "Fiqh discussion", category: "General", type: "stage", count: 3, is_group: true },
  { title: "Language conference", category: "General", type: "stage", count: 6, is_group: true },
  { title: "Muhadhasa arabiyya", category: "General", type: "stage", count: 2, is_group: true },
  { title: "Bilingual speech", category: "General", type: "stage", count: 2, is_group: true },
  { title: "Mas'ala test", category: "General", type: "stage", count: 2, is_group: true },
  { title: "Qur'an prabashanam", category: "General", type: "stage", count: 1, is_group: false },
  { title: "Micro teaching", category: "General", type: "stage", count: 2, is_group: false },
  { title: "Paper presentation", category: "General", type: "stage", count: 1, is_group: false },
  { title: "Expo", category: "General", type: "stage", count: 5, is_group: true },

  // OFF STAGE GENERAL
  { title: "Poster designing", category: "General", type: "off-stage", count: 3, is_group: false },
  { title: "Feature writing", category: "General", type: "off-stage", count: 3, is_group: false },
  { title: "Book making", category: "General", type: "off-stage", count: 5, is_group: true },
  { title: "Social tweet", category: "General", type: "off-stage", count: 3, is_group: true },
  { title: "Spot magazin", category: "General", type: "off-stage", count: 5, is_group: true },
  { title: "Calligraphy", category: "General", type: "off-stage", count: 4, is_group: false },
  { title: "Supplimentry", category: "General", type: "off-stage", count: 5, is_group: true },
  { title: "Mudhravakya rajana", category: "General", type: "off-stage", count: 3, is_group: false },
  { title: "Madh song writing", category: "General", type: "off-stage", count: 2, is_group: false },
  { title: "News report", category: "General", type: "off-stage", count: 2, is_group: false },
  { title: "Digital painting", category: "General", type: "off-stage", count: 1, is_group: false }
];

async function seed() {
  try {
    console.log('Seeding Fest Programs...');
    let success = 0;
    for (const p of programs) {
      await pool.query(
        `INSERT INTO fest_programs (title, category, type, participant_count, is_group)
         VALUES ($1, $2, $3, $4, $5)`,
        [p.title, p.category, p.type, p.count, p.is_group]
      );
      success++;
    }
    console.log(`Successfully seeded ${success} programs.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();

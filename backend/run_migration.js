const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = fs.readFileSync('migrations/007_fest_updates.sql', 'utf8');
pool.query(sql).then(() => { console.log('Migration applied'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });

/**
 * One-shot: apply database/*.sql in order to DATABASE_URL from apps/backend/.env
 * Usage (repo root): node database/apply-migrations.cjs
 */
const { readFileSync } = require('fs');
const { join } = require('path');
const { Pool } = require('pg');

const MIGRATIONS = [
  '001_initial_schema.sql',
  '002_rls_supabase.sql',
  '003_auth_profile_sync.sql',
  '004_seed_muscle_tags.sql',
  '005_seed_exercises_catalog.sql',
  '006_backend_outbox.sql',
  '007_analytics_warehouse.sql',
];

function loadDatabaseUrl() {
  const envPath = join(__dirname, '../apps/backend/.env');
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      return trimmed.slice('DATABASE_URL='.length).trim();
    }
  }
  throw new Error('DATABASE_URL not found in apps/backend/.env');
}

function poolOptions(databaseUrl) {
  const supabaseTls =
    /\.supabase\.co|\.pooler\.supabase\.com/i.test(databaseUrl) ||
    /[?&]sslmode=require/i.test(databaseUrl);
  if (!supabaseTls) {
    return { connectionString: databaseUrl };
  }
  const connectionString = databaseUrl
    .replace(/([?&])sslmode=[^&]*/gi, (_, sep) => (sep === '?' ? '?' : ''))
    .replace(/\?&/, '?')
    .replace(/\?$/, '');
  return { connectionString, ssl: { rejectUnauthorized: false } };
}

async function main() {
  const databaseUrl = loadDatabaseUrl();
  const pool = new Pool({ ...poolOptions(databaseUrl), max: 1 });
  const client = await pool.connect();
  try {
    for (const file of MIGRATIONS) {
      const path = join(__dirname, file);
      const sql = readFileSync(path, 'utf8');
      process.stdout.write(`Applying ${file} ... `);
      await client.query(sql);
      process.stdout.write('OK\n');
    }
    const count = await client.query('select count(*)::int as c from public.exercises');
    process.stdout.write(`public.exercises rows: ${count.rows[0]?.c ?? 0}\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});

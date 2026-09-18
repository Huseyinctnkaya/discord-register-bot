const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const CA_CERT_PATH = path.join(__dirname, 'certs', 'supabase-ca.crt');

async function openDatabase(connectionString, { tableName = 'kayitlar' } = {}) {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: true, ca: fs.readFileSync(CA_CERT_PATH, 'utf8') },
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      discord_id TEXT PRIMARY KEY,
      isim TEXT NOT NULL,
      bolum TEXT NOT NULL,
      kayit_tarihi TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  return { pool, tableName };
}

async function kayitEkle(db, { discordId, isim, bolum }) {
  await db.pool.query(
    `INSERT INTO ${db.tableName} (discord_id, isim, bolum) VALUES ($1, $2, $3)`,
    [discordId, isim, bolum]
  );
}

async function kayitVarMi(db, discordId) {
  const { rows } = await db.pool.query(`SELECT 1 FROM ${db.tableName} WHERE discord_id = $1`, [discordId]);
  return rows.length > 0;
}

module.exports = { openDatabase, kayitEkle, kayitVarMi };

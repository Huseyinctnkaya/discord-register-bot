const Database = require('better-sqlite3');

function openDatabase(path) {
  const db = new Database(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS kayitlar (
      discord_id TEXT PRIMARY KEY,
      isim TEXT NOT NULL,
      bolum TEXT NOT NULL,
      kayit_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  return db;
}

function kayitEkle(db, { discordId, isim, bolum }) {
  db.prepare('INSERT INTO kayitlar (discord_id, isim, bolum) VALUES (?, ?, ?)')
    .run(discordId, isim, bolum);
}

function kayitVarMi(db, discordId) {
  const row = db.prepare('SELECT 1 FROM kayitlar WHERE discord_id = ?').get(discordId);
  return row !== undefined;
}

module.exports = { openDatabase, kayitEkle, kayitVarMi };

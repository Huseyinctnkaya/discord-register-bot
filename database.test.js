const test = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase, kayitEkle, kayitVarMi } = require('./database');

const { DATABASE_URL } = process.env;
const skip = !DATABASE_URL;
const TEST_TABLE = 'kayitlar_test';

async function withTestDb(fn) {
  const db = await openDatabase(DATABASE_URL, { tableName: TEST_TABLE });
  try {
    await fn(db);
  } finally {
    await db.pool.query(`DROP TABLE IF EXISTS ${TEST_TABLE}`);
    await db.pool.end();
  }
}

test('kayitVarMi returns false for unknown user', { skip }, async () => {
  await withTestDb(async db => {
    assert.equal(await kayitVarMi(db, '123'), false);
  });
});

test('kayitEkle inserts a row that kayitVarMi then finds', { skip }, async () => {
  await withTestDb(async db => {
    await kayitEkle(db, { discordId: '123', isim: 'Ada Lovelace', bolum: 'Bilgisayar Mühendisliği' });
    assert.equal(await kayitVarMi(db, '123'), true);
  });
});

test('kayitEkle throws when the same discordId is inserted twice', { skip }, async () => {
  await withTestDb(async db => {
    await kayitEkle(db, { discordId: '123', isim: 'Ada', bolum: 'CS' });
    await assert.rejects(() => kayitEkle(db, { discordId: '123', isim: 'Ada', bolum: 'CS' }));
  });
});

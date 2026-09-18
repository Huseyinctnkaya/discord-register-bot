const test = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase, kayitEkle, kayitVarMi } = require('./database');

test('kayitVarMi returns false for unknown user', () => {
  const db = openDatabase(':memory:');
  assert.equal(kayitVarMi(db, '123'), false);
});

test('kayitEkle inserts a row that kayitVarMi then finds', () => {
  const db = openDatabase(':memory:');
  kayitEkle(db, { discordId: '123', isim: 'Ada Lovelace', bolum: 'Bilgisayar Mühendisliği' });
  assert.equal(kayitVarMi(db, '123'), true);
});

test('kayitEkle throws when the same discordId is inserted twice', () => {
  const db = openDatabase(':memory:');
  kayitEkle(db, { discordId: '123', isim: 'Ada', bolum: 'CS' });
  assert.throws(() => kayitEkle(db, { discordId: '123', isim: 'Ada', bolum: 'CS' }));
});

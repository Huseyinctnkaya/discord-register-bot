# Discord Kayıt Botu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Discord bot that collects name + department from new members via a button + modal form, stores it in SQLite, and swaps their role from `Kayıtsız` to `Üye`.

**Architecture:** A single discord.js v14 `Client` (CommonJS) with two event handlers (`guildMemberAdd`, `interactionCreate`) and a thin SQLite data-access module (`database.js`, better-sqlite3). A standalone one-off script posts the "Kayıt Ol" button message to `#kayit`. No slash commands are needed — the only interactions are a button and a modal.

**Tech Stack:** Node.js 18+, discord.js v14, better-sqlite3, dotenv.

**Spec:** `/Users/huseyin/Downloads/discord-kayit-botu-spec.md`

## Global Constraints

- Node.js v18+.
- discord.js v14 (Interaction/Modal API).
- SQLite via better-sqlite3 — file-based, no external service.
- Required intents: `Guilds`, `GuildMembers` (privileged — must be enabled in Developer Portal), `GuildMessages` not required since we don't read message content.
- `.env` holds `DISCORD_TOKEN, CLIENT_ID, GUILD_ID, KAYITSIZ_ROLE_ID, UYE_ROLE_ID, KAYIT_KANAL_ID` — never committed; `.env.example` is committed instead.
- DB schema exactly: `kayitlar(discord_id TEXT PRIMARY KEY, isim TEXT NOT NULL, bolum TEXT NOT NULL, kayit_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP)`.
- Bot's own role must sit above `Kayıtsız`/`Üye` in the hierarchy for role edits to work (documented in README, not enforceable in code).

---

## File Structure

```
discord-register-bot/
├── .env.example
├── .gitignore
├── package.json
├── index.js                     # client bootstrap, login, event wiring
├── database.js                  # better-sqlite3 connection + kayitEkle/kayitVarMi
├── database.test.js             # TDD coverage for database.js
├── events/
│   ├── guildMemberAdd.js        # assign Kayıtsız role + DM
│   └── interactionCreate.js     # button -> modal -> submit handling
├── scripts/
│   └── setup-kayit-mesaji.js    # one-off: posts "Kayıt Ol" button message to #kayit
└── README.md
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`

**Interfaces:**
- Produces: npm scripts `start` (`node index.js`) and `test` (`node --test`), dependencies `discord.js@^14`, `better-sqlite3`, `dotenv`.

- [ ] **Step 1: Init package.json**

```bash
npm init -y
npm pkg set type="commonjs" main="index.js"
npm pkg set scripts.start="node index.js"
npm pkg set scripts.test="node --test"
npm pkg set scripts.setup-kayit="node scripts/setup-kayit-mesaji.js"
```

- [ ] **Step 2: Install dependencies**

```bash
npm install discord.js better-sqlite3 dotenv
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
.env
*.sqlite
*.db
```

- [ ] **Step 4: Create `.env.example`**

```
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
KAYITSIZ_ROLE_ID=
UYE_ROLE_ID=
KAYIT_KANAL_ID=
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example
git commit -m "chore: scaffold project"
```

---

### Task 2: `database.js` — SQLite data access (TDD)

**Files:**
- Create: `database.js`
- Test: `database.test.js`

**Interfaces:**
- Consumes: nothing (accepts a DB file path so tests can use `:memory:`).
- Produces:
  - `openDatabase(path: string): Database` — opens/creates the DB and runs the `CREATE TABLE IF NOT EXISTS kayitlar` migration.
  - `kayitEkle(db: Database, { discordId: string, isim: string, bolum: string }): void` — inserts a row.
  - `kayitVarMi(db: Database, discordId: string): boolean` — true if a row with that `discord_id` exists.

- [ ] **Step 1: Write the failing tests**

```javascript
// database.test.js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test database.test.js`
Expected: FAIL — `Cannot find module './database'`

- [ ] **Step 3: Write the implementation**

```javascript
// database.js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test database.test.js`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add database.js database.test.js
git commit -m "feat: add SQLite data access for kayitlar table"
```

---

### Task 3: `index.js` — client bootstrap

**Files:**
- Create: `index.js`

**Interfaces:**
- Consumes: `openDatabase` from `./database.js`; `require('./events/guildMemberAdd')` and `require('./events/interactionCreate')`, each exporting `{ name: string, execute: (...args, ctx) => Promise<void> }` where `ctx = { db, roleIds: { kayitsiz, uye }, kayitKanalId }`.
- Produces: a running `Client` (not directly consumed by other tasks — this is the entry point).

- [ ] **Step 1: Write `index.js`**

```javascript
// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { openDatabase } = require('./database');
const guildMemberAdd = require('./events/guildMemberAdd');
const interactionCreate = require('./events/interactionCreate');

const db = openDatabase('kayitlar.sqlite');

const ctx = {
  db,
  roleIds: {
    kayitsiz: process.env.KAYITSIZ_ROLE_ID,
    uye: process.env.UYE_ROLE_ID,
  },
  kayitKanalId: process.env.KAYIT_KANAL_ID,
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

client.once('ready', () => {
  console.log(`Giriş yapıldı: ${client.user.tag}`);
});

client.on(guildMemberAdd.name, (...args) => guildMemberAdd.execute(...args, ctx));
client.on(interactionCreate.name, (...args) => interactionCreate.execute(...args, ctx));

client.login(process.env.DISCORD_TOKEN);
```

- [ ] **Step 2: Sanity-check syntax**

Run: `node --check index.js`
Expected: no output (valid syntax). This cannot be run end-to-end without a real bot token, so full verification happens in Task 6's manual test.

- [ ] **Step 3: Commit**

```bash
git add index.js
git commit -m "feat: add bot entrypoint and client bootstrap"
```

---

### Task 4: `events/guildMemberAdd.js`

**Files:**
- Create: `events/guildMemberAdd.js`

**Interfaces:**
- Consumes: `ctx.roleIds.kayitsiz`, `ctx.kayitKanalId` (from Task 3).
- Produces: module `{ name: 'guildMemberAdd', execute(member, ctx) }`.

- [ ] **Step 1: Write `events/guildMemberAdd.js`**

```javascript
// events/guildMemberAdd.js
module.exports = {
  name: 'guildMemberAdd',
  async execute(member, ctx) {
    try {
      await member.roles.add(ctx.roleIds.kayitsiz);
    } catch (err) {
      console.error(`[guildMemberAdd] ${member.user.tag} için Kayıtsız rolü atanamadı:`, err.message);
      return;
    }

    try {
      await member.send(
        `Sunucuya hoş geldin, ${member.user.username}! Kayıt olmak için lütfen <#${ctx.kayitKanalId}> kanalına git ve "Kayıt Ol" butonuna bas.`
      );
    } catch (err) {
      console.warn(`[guildMemberAdd] ${member.user.tag} DM'leri kapalı, hoş geldin mesajı gönderilemedi.`);
    }
  },
};
```

- [ ] **Step 2: Check syntax**

Run: `node --check events/guildMemberAdd.js`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add events/guildMemberAdd.js
git commit -m "feat: assign Kayitsiz role and DM new members on join"
```

---

### Task 5: `scripts/setup-kayit-mesaji.js`

**Files:**
- Create: `scripts/setup-kayit-mesaji.js`

**Interfaces:**
- Consumes: `.env` vars `DISCORD_TOKEN, KAYIT_KANAL_ID` directly (standalone script, not part of the running client).
- Produces: posts a message with a `kayit_ol_buton` (customId) button to the configured channel, then exits. `interactionCreate.js` (Task 6) must handle a button with `customId === 'kayit_ol_buton'`.

- [ ] **Step 1: Write `scripts/setup-kayit-mesaji.js`**

```javascript
// scripts/setup-kayit-mesaji.js
require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  try {
    const channel = await client.channels.fetch(process.env.KAYIT_KANAL_ID);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('kayit_ol_buton')
        .setLabel('Kayıt Ol')
        .setStyle(ButtonStyle.Primary)
    );
    await channel.send({
      content: 'Sunucumuza hoş geldin! Kayıt olmak için aşağıdaki butona tıkla.',
      components: [row],
    });
    console.log('Kayıt mesajı gönderildi.');
  } catch (err) {
    console.error('Kayıt mesajı gönderilemedi:', err.message);
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
```

- [ ] **Step 2: Check syntax**

Run: `node --check scripts/setup-kayit-mesaji.js`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add scripts/setup-kayit-mesaji.js
git commit -m "feat: add one-off script to post the kayit ol button message"
```

---

### Task 6: `events/interactionCreate.js` — button, modal, submit

**Files:**
- Create: `events/interactionCreate.js`

**Interfaces:**
- Consumes: `ctx.db`, `kayitEkle`/`kayitVarMi` from `./database.js`, `ctx.roleIds.{kayitsiz,uye}`; button `customId 'kayit_ol_buton'` from Task 5; modal `customId 'kayit_modal'` with text inputs `customId 'isim'` and `customId 'bolum'`.
- Produces: module `{ name: 'interactionCreate', execute(interaction, ctx) }`.

- [ ] **Step 1: Write `events/interactionCreate.js`**

```javascript
// events/interactionCreate.js
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { kayitEkle, kayitVarMi } = require('../database');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, ctx) {
    if (interaction.isButton() && interaction.customId === 'kayit_ol_buton') {
      if (kayitVarMi(ctx.db, interaction.user.id)) {
        await interaction.reply({ content: 'Zaten kayıtlısın!', ephemeral: true });
        return;
      }

      const modal = new ModalBuilder().setCustomId('kayit_modal').setTitle('Kayıt Formu');

      const isimInput = new TextInputBuilder()
        .setCustomId('isim')
        .setLabel('İsim')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const bolumInput = new TextInputBuilder()
        .setCustomId('bolum')
        .setLabel('Bölüm')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(isimInput),
        new ActionRowBuilder().addComponents(bolumInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'kayit_modal') {
      const isim = interaction.fields.getTextInputValue('isim').trim();
      const bolum = interaction.fields.getTextInputValue('bolum').trim();

      if (!isim || !bolum) {
        await interaction.reply({ content: 'İsim ve bölüm alanları boş olamaz, lütfen tekrar dene.', ephemeral: true });
        return;
      }

      if (kayitVarMi(ctx.db, interaction.user.id)) {
        await interaction.reply({ content: 'Zaten kayıtlısın!', ephemeral: true });
        return;
      }

      kayitEkle(ctx.db, { discordId: interaction.user.id, isim, bolum });

      // TODO(user): nickname güncelleme + hata yönetimi burada uygulanacak.
      // Sunucu sahibinin nickname'ini bot değiştiremez (Discord kısıtı) — bu durumda
      // ne olmalı: kayıt yine de tamamlanmalı mı, kullanıcıya ayrıca haber verilmeli mi?
      await updateNickname(interaction.member, isim, bolum);

      try {
        await interaction.member.roles.remove(ctx.roleIds.kayitsiz);
        await interaction.member.roles.add(ctx.roleIds.uye);
      } catch (err) {
        console.error(`[interactionCreate] ${interaction.user.tag} için rol güncellenemedi:`, err.message);
        await interaction.reply({
          content: 'Kaydın alındı ama rol atanırken bir sorun oluştu, lütfen bir yetkiliye ulaş.',
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({ content: 'Kaydın tamamlandı, hoş geldin!', ephemeral: true });
    }
  },
};
```

- [ ] **Step 2: Check syntax**

Run: `node --check events/interactionCreate.js`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add events/interactionCreate.js
git commit -m "feat: handle kayit button, modal submit, role swap and duplicate checks"
```

> **Note:** `updateNickname` is defined in Task 7 as a learner-contribution slot — this task's code references it but Task 7 must land before this module runs without a `ReferenceError`. Land Task 7 immediately after this task, before any manual end-to-end test.

---

### Task 7: Nickname update — user-authored decision point

**Files:**
- Modify: `events/interactionCreate.js` (add `updateNickname` function + `module.exports` stays the same shape)

**Interfaces:**
- Consumes: nothing new.
- Produces: `updateNickname(member: GuildMember, isim: string, bolum: string): Promise<void>` — called from Task 6's modal-submit handler, must never throw (registration must complete even if the nickname can't be changed).

This is the one place in the spec with a real trade-off, called out explicitly in the spec's Notlar section: *"Nickname değiştirme, sunucu sahibinin nickname'ini bot değiştiremez (Discord kısıtı) — bu durum için hata yakalama eklenmeli."* Discord refuses nickname changes on the guild owner (and on members with a higher role than the bot). The design question is what the bot should do when that happens: should the whole registration fail, should it silently continue, or should the ephemeral confirmation mention that the nickname couldn't be set? There's no single right answer — it's a UX call.

- [ ] **Step 1: Implement `updateNickname` in `events/interactionCreate.js`**

Add above `module.exports`, replacing the `TODO(user)` block from Task 6:

```javascript
/**
 * @param {import('discord.js').GuildMember} member
 * @param {string} isim
 * @param {string} bolum
 * @returns {Promise<void>}
 */
async function updateNickname(member, isim, bolum) {
  // TODO: `${isim} (${bolum})` formatında nickname ayarla.
  // member.setNickname() sunucu sahibinde veya botun rolünden yüksek roldeki
  // üyelerde DiscordAPIError fırlatır — try/catch ile yut, kaydı engelleme.
}
```

Then implement the body — target behavior: attempt `member.setNickname(\`${isim} (${bolum})\`)`, catch any error, `console.warn` it, and return normally either way so the caller in Task 6 never sees an exception.

- [ ] **Step 2: Check syntax**

Run: `node --check events/interactionCreate.js`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add events/interactionCreate.js
git commit -m "feat: set member nickname on registration with owner-nick error handling"
```

---

### Task 8: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`** covering:
  - What the bot does (1 paragraph, Turkish, matching spec's "Amaç").
  - Discord Developer Portal setup: Application + Bot, enable `SERVER MEMBERS INTENT`.
  - Server setup: create `Kayıtsız` / `Üye` roles, `#kayit` channel (visible only to `Kayıtsız`), bot role placed above both roles in the hierarchy.
  - `.env` setup: copy `.env.example` to `.env` and fill in `DISCORD_TOKEN, CLIENT_ID, GUILD_ID, KAYITSIZ_ROLE_ID, UYE_ROLE_ID, KAYIT_KANAL_ID`.
  - Install & run: `npm install`, `npm run setup-kayit` (once, to post the button), `npm start`.
  - Manual test scenarios (since this can't be unit tested without a live gateway connection):
    1. New member joins → gets `Kayıtsız`, receives DM (or warning logged if DMs closed).
    2. Click "Kayıt Ol" → modal appears with İsim/Bölüm.
    3. Submit with both fields filled → ephemeral "Kaydın tamamlandı, hoş geldin!", role swapped to `Üye`, row appears in `kayitlar.sqlite`.
    4. Submit with an empty field → ephemeral error, can retry.
    5. Click "Kayıt Ol" again after registering → "Zaten kayıtlısın!".

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add setup and manual test instructions"
```

---

## Self-Review Notes

- Spec coverage: Developer Portal + intents (README/Task 8), roles/channels (README/Task 8), role hierarchy (README/Task 8), `guildMemberAdd` flow (Task 4), button→modal (Task 6), modal submit validation/save/role-swap/ephemeral (Task 6), duplicate-registration check (Task 6), DB schema (Task 2), file layout (matches spec, adapted: no empty `deploy-commands.js` since no slash commands exist — YAGNI), nickname update + owner error handling (Task 7) — all covered.
- No placeholders left un-actionable except the intentional Task 7 learner slot, which has a concrete target behavior spelled out.
- Type/name consistency checked: `openDatabase/kayitEkle/kayitVarMi` signatures match between Task 2 and their Task 3/6 call sites; `ctx` shape defined in Task 3 matches what Tasks 4 and 6 destructure; button `customId 'kayit_ol_buton'` and modal `customId 'kayit_modal'`/field ids `isim`/`bolum'` match between Task 5 and Task 6.

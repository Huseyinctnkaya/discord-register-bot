require('dotenv').config();
const http = require('node:http');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { openDatabase } = require('./database');
const guildMemberAdd = require('./events/guildMemberAdd');
const interactionCreate = require('./events/interactionCreate');

const GUNDE_BIR_KEZ_MS = 24 * 60 * 60 * 1000;

async function main() {
  const db = await openDatabase(process.env.DATABASE_URL);

  const ctx = {
    db,
    roleIds: {
      kayitsiz: process.env.KAYITSIZ_ROLE_ID,
    },
    roller: [
      { ad: process.env.ROL1_AD, id: process.env.ROL1_ID },
      { ad: process.env.ROL2_AD, id: process.env.ROL2_ID },
    ],
    kayitKanalId: process.env.KAYIT_KANAL_ID,
  };

  // Supabase'in ücretsiz projeleri 7 gün istek gelmezse duraklıyor;
  // günde bir kez basit bir sorgu atıp projeyi aktif tutuyoruz.
  setInterval(() => {
    db.pool.query('SELECT 1').catch(err => console.error('[keep-alive] Veritabanı sorgusu başarısız:', err.message));
  }, GUNDE_BIR_KEZ_MS);

  // Render'ın "Web Service" tipi HTTP isteği bekliyor; bu olmadan servis
  // "Background Worker" sayılır ve free plan'da çalışmaz. Ayrıca UptimeRobot
  // gibi bir dış servis bu adrese periyodik istek atarak Render'ın 15 dakika
  // hareketsizlikte uyutma davranışını engelleyecek.
  const port = process.env.PORT || 3000;
  http
    .createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Bot çalışıyor.');
    })
    .listen(port, () => {
      console.log(`Health-check sunucusu ${port} portunda dinliyor.`);
    });

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    partials: [Partials.GuildMember],
  });

  client.once('clientReady', () => {
    console.log(`Giriş yapıldı: ${client.user.tag}`);
  });

  client.on(guildMemberAdd.name, (...args) => guildMemberAdd.execute(...args, ctx));
  client.on(interactionCreate.name, (...args) => interactionCreate.execute(...args, ctx));

  await client.login(process.env.DISCORD_TOKEN);
}

main().catch(err => {
  console.error('Bot başlatılamadı:', err);
  process.exit(1);
});

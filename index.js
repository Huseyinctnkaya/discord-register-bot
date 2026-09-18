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
  },
  roller: [
    { ad: process.env.ROL1_AD, id: process.env.ROL1_ID },
    { ad: process.env.ROL2_AD, id: process.env.ROL2_ID },
  ],
  kayitKanalId: process.env.KAYIT_KANAL_ID,
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

client.once('clientReady', () => {
  console.log(`Giriş yapıldı: ${client.user.tag}`);
});

client.on(guildMemberAdd.name, (...args) => guildMemberAdd.execute(...args, ctx));
client.on(interactionCreate.name, (...args) => interactionCreate.execute(...args, ctx));

client.login(process.env.DISCORD_TOKEN);

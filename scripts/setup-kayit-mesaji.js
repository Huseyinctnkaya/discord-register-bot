require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
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

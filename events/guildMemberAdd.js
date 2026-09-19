const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, ctx) {
    try {
      await member.roles.add(ctx.roleIds.kayitsiz);
    } catch (err) {
      console.error(`[guildMemberAdd] ${member.user.tag} için Kayıtsız rolü atanamadı:`, err.message);
    }

    try {
      await member.send(
        `Sunucuya hoş geldin, ${member.user.username}! Kayıt olmak için lütfen <#${ctx.kayitKanalId}> kanalına git ve "Kayıt Ol" butonuna bas.`
      );
    } catch (err) {
      console.warn(`[guildMemberAdd] ${member.user.tag} DM'leri kapalı, hoş geldin mesajı gönderilemedi.`);
    }

    // Kayıt kanalındaki "Kayıt Ol" mesajı, üye role erişim kazanmadan ÖNCE
    // atılmış olabilir; kanalda "Mesaj Geçmişini Görüntüle" izni kapalıysa
    // üye o eski mesajı hiç göremez. Üyeyi burada etiketleyen TAZE bir mesaj,
    // izin ayarından bağımsız olarak her zaman görünür.
    try {
      const kayitKanali = await member.guild.channels.fetch(ctx.kayitKanalId);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('kayit_ol_buton').setLabel('Kayıt Ol').setStyle(ButtonStyle.Primary)
      );
      await kayitKanali.send({
        content: `${member} sunucuya hoş geldin! Kayıt olmak için aşağıdaki butona tıkla.`,
        components: [row],
      });
    } catch (err) {
      console.error(`[guildMemberAdd] ${member.user.tag} için kayıt kanalına hoş geldin mesajı gönderilemedi:`, err.message);
    }
  },
};

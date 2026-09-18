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

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

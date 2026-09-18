const {
  ModalBuilder,
  LabelBuilder,
  TextInputStyle,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const { kayitEkle, kayitVarMi } = require('../database');

/**
 * Kayıt tamamlanınca üyenin nickname'ini "İsim (Rol)" formatına ayarlar.
 *
 * ÖNEMLİ: member.setNickname() sunucu sahibinde HER ZAMAN, ve botun rolünden
 * yüksek/eşit role sahip üyelerde DiscordAPIError fırlatır (Discord kısıtı,
 * spec'in Notlar bölümünde belirtilmiş). Bu fonksiyon ASLA throw etmemeli —
 * çünkü çağrıldığı yerde (aşağıda) kayıt zaten veritabanına yazıldı ve rol
 * değişimi bu fonksiyondan SONRA yapılıyor; burada atılacak bir hata kaydı
 * yarım bırakır.
 *
 * @param {import('discord.js').GuildMember} member
 * @param {string} isim
 * @param {string} rolAdi
 * @returns {Promise<void>}
 */
async function updateNickname(member, isim, rolAdi) {
  try {
    await member.setNickname(`${isim} (${rolAdi})`);
  } catch (err) {
    console.warn(`[interactionCreate] ${member.user.tag} için nickname değiştirilemedi:`, err.message);
  }
}

async function handleInteraction(interaction, ctx) {
  if (interaction.isButton() && interaction.customId === 'kayit_ol_buton') {
    // "Zaten kayıtlı mı" kontrolü kasıtlı olarak burada değil, modal submit
    // anında yapılıyor: Discord modal açmak için sadece 3 saniye veriyor,
    // showModal()'dan önce bir veritabanı sorgusu bu süreyi aşıp "Unknown
    // interaction" hatasıyla botu çökertebiliyor (daha önce yaşandı).
    const modal = new ModalBuilder().setCustomId('kayit_modal').setTitle('Kayıt Formu');

    const isimLabel = new LabelBuilder()
      .setLabel('İsim')
      .setTextInputComponent(input =>
        input.setCustomId('isim').setStyle(TextInputStyle.Short).setRequired(true)
      );

    const rolLabel = new LabelBuilder()
      .setLabel('Rol')
      .setStringSelectMenuComponent(select =>
        select
          .setCustomId('rol')
          .setRequired(true)
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(
            ctx.roller.map(rol => new StringSelectMenuOptionBuilder().setLabel(rol.ad).setValue(rol.id))
          )
      );

    modal.addLabelComponents(isimLabel, rolLabel);

    await interaction.showModal(modal);
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId === 'kayit_modal') {
    const isim = interaction.fields.getTextInputValue('isim').trim();
    const rolId = interaction.fields.getStringSelectValues('rol')[0];
    const rol = ctx.roller.find(r => r.id === rolId);

    if (!isim || !rol) {
      await interaction.reply({ content: 'İsim ve rol alanları boş olamaz, lütfen tekrar dene.', ephemeral: true });
      return;
    }

    if (await kayitVarMi(ctx.db, interaction.user.id)) {
      await interaction.reply({ content: 'Zaten kayıtlısın!', ephemeral: true });
      return;
    }

    await kayitEkle(ctx.db, { discordId: interaction.user.id, isim, bolum: rol.ad });

    await updateNickname(interaction.member, isim, rol.ad);

    try {
      await interaction.member.roles.remove(ctx.roleIds.kayitsiz);
      await interaction.member.roles.add(rol.id);
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
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, ctx) {
    try {
      await handleInteraction(interaction, ctx);
    } catch (err) {
      console.error(`[interactionCreate] Beklenmeyen hata (${interaction.user?.tag}):`, err);
    }
  },
};

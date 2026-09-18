# Discord Kayıt Botu

Sunucuya yeni katılan her kullanıcıdan **isim** bilgisini ve **iki roldan birini** bir form (modal) ile toplayıp, bu bilgileri girdikten sonra kullanıcıyı seçtiği role atayarak sunucuya kabul eden bir Discord botu.

## Akış

1. Kullanıcı sunucuya katılır → bota otomatik olarak `Kayıtsız` rolü atanır, DM ile hoş geldin mesajı gönderilir.
2. Kullanıcı `#kayit` kanalındaki "Kayıt Ol" butonuna basar → bir modal açılır: **İsim** (metin alanı) ve **Rol** (iki seçenekli açılır liste, alt alta).
3. Formu doldurup gönderir → veriler SQLite'a kaydedilir (`bolum` sütununa seçilen rolün adı yazılır), nickname `İsim (Rol Adı)` olarak güncellenir, `Kayıtsız` rolü kaldırılıp seçilen rol atanır, ephemeral onay mesajı gösterilir.
4. Alan boşsa veya kullanıcı zaten kayıtlıysa uygun hata mesajı gösterilir.

## Discord Tarafında Kurulum

1. [Discord Developer Portal](https://discord.com/developers/applications)'da bir **Application + Bot** oluştur, bot token'ı al.
2. Bot ayarlarında **Privileged Gateway Intents** altından `SERVER MEMBERS INTENT`'i aç.
3. Sunucunda şu rolleri/kanalı oluştur:
   - `Kayıtsız` rolü (bu projede `ÖRGÜTSÜZ`) → yeni katılan herkese otomatik atanır, sadece `#kayit` kanalını görebilir.
   - Kullanıcının kayıtta seçeceği iki rol (bu projede `Bilgisayarcı Tayfa` / `Webci Tayfa`) → form doldurulunca seçilen rol atanır, tüm sunucuyu görebilir.
   - `#kayit` kanalı → sadece `Kayıtsız` rolünün gördüğü, kayıt butonunun olacağı kanal.
4. Botu sunucuna davet et (rol atama yetkisiyle) ve **botun rolünü, atayacağı üç rolün (Kayıtsız + iki seçilebilir rol) üstüne** taşı (Discord rol hiyerarşisi kuralı — aksi halde rol atama/nickname değiştirme başarısız olur).

> **Not:** Kayıt modalında açılır liste (select menu) kullanılıyor — bu, Discord'un 2024 sonunda tanıttığı "Components V2" modal desteğiyle mümkün, `discord.js` v14.27+ gerektirir.

## Kurulum

```bash
npm install
cp .env.example .env
```

`.env` dosyasını doldur:

```
DISCORD_TOKEN=botunun-tokeni
CLIENT_ID=uygulama-id
GUILD_ID=sunucu-id
KAYITSIZ_ROLE_ID=kayitsiz-rol-id
KAYIT_KANAL_ID=kayit-kanal-id
ROL1_AD=Birinci rolün görünen adı
ROL1_ID=birinci-rol-id
ROL2_AD=İkinci rolün görünen adı
ROL2_ID=ikinci-rol-id
```

## Çalıştırma

```bash
# 1. #kayit kanalına "Kayıt Ol" butonlu mesajı gönder (bir kez çalıştırılır)
npm run setup-kayit

# 2. Botu başlat
npm start
```

## Testler

```bash
npm test
```

`database.js` içindeki `kayitEkle`/`kayitVarMi` fonksiyonları otomatik testlerle kapsanmış durumda (`database.test.js`, `:memory:` SQLite ile).

Discord API'siyle canlı bağlantı gerektiren kısımlar (buton, modal, rol atama) otomatik test edilemez; aşağıdaki senaryoları manuel doğrula:

1. **Yeni üye katılımı** — sunucuya yeni bir hesapla katıl → `Kayıtsız` rolü otomatik atanmalı, DM açıksa hoş geldin mesajı gelmeli (DM kapalıysa konsola uyarı düşmeli, işlem durmamalı).
2. **Kayıt formu** — `#kayit` kanalında "Kayıt Ol" butonuna bas → İsim (metin) ve Rol (açılır liste, iki seçenek) alanlı modal açılmalı.
3. **Başarılı kayıt** — İsim yazıp bir rol seçip gönder → ephemeral "Kaydın tamamlandı, hoş geldin!" mesajı görünmeli, nickname `İsim (Seçilen Rol Adı)` olmalı, `Kayıtsız` rolü kalkıp seçilen rol atanmış olmalı, `kayitlar.sqlite` içinde satır oluşmalı (`bolum` sütununda seçilen rolün adı).
4. **Boş alan** — İsmi boş bırakıp gönder (rol seçimi zorunlu olduğu için Discord genelde göndermeye izin vermez, yine de sunucu tarafı kontrolünü doğrula) → ephemeral hata mesajı gelmeli, tekrar deneme şansı olmalı.
5. **Tekrar kayıt** — zaten kayıtlı bir kullanıcı "Kayıt Ol" butonuna tekrar bassın → "Zaten kayıtlısın!" mesajı görünmeli.
6. **Sunucu sahibi** — sunucu sahibi hesabıyla kaydı tamamla → nickname değiştirilemediği için konsola uyarı düşmeli ama kayıt ve rol ataması yine de tamamlanmalı.

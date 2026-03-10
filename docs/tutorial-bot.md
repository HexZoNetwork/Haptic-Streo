# Tutorial Bot

Tutorial ini membuat bot Telegram biasa berbasis Bot Token.

## 1. Buat Project

```bash
haptic new bot mybot
cd mybot
```

Command ini akan membuat:

- `bot.haptic`
- `config.hpconf`
- `.env.testing.example`
- `package.json`
- binary lokal di `.haptic/bin/haptic.cjs`

## 2. Isi Environment

Buat file `.env.testing`:

```env
BOT_TOKEN=isi_token_bot_anda
```

## 3. Install Dependency

```bash
npm install
```

## 4. Cek Konfigurasi

```bash
npm run doctor
```

Kalau sehat, Anda akan melihat info config, env, dan hasil compile cache.

## 5. Tulis Bot Pertama

Isi `bot.haptic` dengan ini:

```haptic
bot "MyBot":
 token = env("BOT_TOKEN")
end

command start:
 reply "Hello dari Haptic"
end

on message match /ping/i:
 reply "pong"
end
```

## 6. Run Bot

Mode sekali jalan:

```bash
npm run run
```

Mode watch:

```bash
npm run dev
```

`dev` akan recompile saat `bot.haptic`, config, atau env berubah.

## 7. Build Artifact

Kalau Anda ingin melihat hasil compile:

```bash
npm run build
```

Output default ada di folder `dist/`.

Kalau Anda ingin output CommonJS:

```json
{
  "moduleFormat": "cjs"
}
```

di `config.hpconf`, lalu build ulang. Output akan menjadi `.cjs`.

## 8. Tambah Function dan Flow

Contoh yang sedikit lebih realistis:

```haptic
bot "MyBot":
 token = env("BOT_TOKEN")
end

func greet(name):
 return "Halo " + name
end

command start:
 if user.username is nil:
  reply "Halo user"
 else:
  reply await greet(user.username)
 end
end

on message match /ping/i:
 reply "pong"
 console.log("ping dari", user.username)
end
```

## 9. Simpan Data Sederhana

Contoh dengan database in-memory:

```haptic
bot "MyBot":
 token = env("BOT_TOKEN")
end

db users:
 id int
 username text
 visits int
end

command start:
 insert users:
  id = user.id
  username = user.username
  visits = 1
 end

 let rows = select * from users where id = user.id
 reply "record: " + rows.length
end
```

Update dan delete:

```haptic
update users where id = user.id:
 visits = 2
end

delete from users where id = user.id
```

## 10. Debug Tips

- Pakai `log ...` untuk output sederhana.
- Pakai `console.log(...)` jika butuh JavaScript langsung.
- Pakai `npm run doctor` saat env atau config terasa aneh.
- Pakai `npm run dev` saat iterasi cepat.
- Lihat [Troubleshooting](./troubleshooting.md) kalau project gagal build atau run.

## Next Step

Setelah bot dasar jalan, lanjut ke:

- [Syntax Reference](./syntax.md)
- [Tutorial Userbot](./tutorial-userbot.md)

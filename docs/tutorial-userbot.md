# Tutorial Userbot

Tutorial ini membuat userbot berbasis akun Telegram pribadi menggunakan GramJS.

## 1. Buat Project

```bash
haptic new userbot myuserbot
cd myuserbot
```

## 2. Isi Environment Dasar

Buat `.env.testing`:

```env
API_ID=isi_api_id_anda
API_HASH=isi_api_hash_anda
STRING_SESSION=
```

`API_ID` dan `API_HASH` dipakai untuk login akun Telegram Anda.

## 3. Install Dependency

```bash
npm install
```

## 4. Login untuk Mengisi STRING_SESSION

Jalankan:

```bash
node .haptic/bin/haptic.cjs auth login
```

Atau jika global install tersedia:

```bash
haptic auth login
```

Command ini akan:

- membaca `API_ID` dan `API_HASH`
- meminta nomor telepon
- meminta OTP
- meminta password 2FA jika ada
- menyimpan `STRING_SESSION` ke env file aktif

## 5. Cek Konfigurasi

```bash
npm run doctor
```

## 6. Tulis Userbot Pertama

Isi `bot.haptic`:

```haptic
userbot "MyUserbot":
 api_id = env("API_ID")
 api_hash = env("API_HASH")
end

command ping:
 reply "pong"
end

on message match /hello/i:
 reply "hi there"
end
```

## 7. Jalankan

```bash
npm run run
```

Saat sedang mengembangkan:

```bash
npm run dev
```

Kalau Anda butuh output CommonJS untuk integrasi tertentu, set `moduleFormat` ke `"cjs"` di `config.hpconf`.

## 8. Tambah Logic

Contoh function dan branching:

```haptic
userbot "MyUserbot":
 api_id = env("API_ID")
 api_hash = env("API_HASH")
end

func normalize(text):
 return text.toLowerCase()
end

on message:
 let text = await normalize(message.text || "")

 if text is "ping":
  reply "pong"
 elseif text is "status":
  reply "ready"
 end
end
```

## 9. Pakai Data Store Sederhana

```haptic
userbot "MyUserbot":
 api_id = env("API_ID")
 api_hash = env("API_HASH")
end

db contacts:
 id int
 username text
end

on message:
 insert contacts:
  id = user.id
  username = user.username
 end

 select * from contacts where id = user.id into rows
 log rows.length
end
```

## 10. Catatan Penting

- Userbot memakai akun pribadi, jadi gunakan dengan hati-hati.
- Simpan `.env.testing` dengan aman.
- Jangan commit credential asli ke repository.
- `STRING_SESSION` sensitif dan harus diperlakukan seperti secret.

## Troubleshooting

`Missing required env vars`
: pastikan `API_ID` dan `API_HASH` sudah ada di env file.

`Telegram login failed`
: cek nomor telepon, OTP, 2FA, atau API credentials.

Userbot tidak merespons
: jalankan `npm run doctor`, lalu coba `npm run dev` untuk melihat log lebih cepat.

Troubleshooting yang lebih lengkap ada di [Troubleshooting](./troubleshooting.md).

## Next Step

Kalau flow dasar sudah jalan, lanjut baca:

- [Syntax Reference](./syntax.md)
- [Tutorial Bot](./tutorial-bot.md)

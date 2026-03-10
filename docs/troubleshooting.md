# Haptic Troubleshooting

Halaman ini merangkum masalah yang paling sering muncul saat build, run, auth, dan nulis syntax Haptic.

## CLI dan Project Setup

### `Unknown command`

Penyebab umum:

- binary global belum terinstall
- Anda sedang memakai binary lama

Coba:

```bash
haptic --help
npx haptic --help
```

Kalau project hasil scaffold, Anda juga bisa pakai binary lokal:

```bash
node .haptic/bin/haptic.cjs --help
```

### `Target directory is not empty`

Ini muncul saat `haptic new ...` diarahkan ke folder yang sudah berisi file.

Solusi:

- pakai folder baru
- atau pindah dulu isi folder lama

### `Entry file not found`

Periksa:

- file `bot.haptic` benar-benar ada
- `entry` di `config.hpconf` benar
- Anda tidak menjalankan command dari folder yang salah

Cek cepat:

```bash
haptic doctor
```

## Environment dan Credential

### `Missing required env vars: BOT_TOKEN`

Untuk bot biasa, isi `.env.testing` atau env file aktif:

```env
BOT_TOKEN=isi_token_anda
```

### `Missing required env vars: API_ID, API_HASH`

Untuk userbot, isi:

```env
API_ID=isi_api_id
API_HASH=isi_api_hash
STRING_SESSION=
```

### `Telegram login failed`

Saat `auth login`, cek:

- `API_ID` dan `API_HASH` valid
- nomor telepon format internasional
- OTP benar
- password 2FA benar jika akun memakai 2FA

Setelah sukses, `STRING_SESSION` akan ditulis ke env file aktif.

## Build dan Run

### `Build failed`

Langkah cek:

1. Jalankan `haptic doctor`
2. Pastikan syntax file `.haptic` valid
3. Pastikan env file yang dibutuhkan sudah ada

### Output `.mjs` padahal saya butuh `.cjs`

Set `moduleFormat` di `config.hpconf`:

```json
{
  "moduleFormat": "cjs"
}
```

Lalu build ulang.

### `require is not defined` atau `Cannot use import statement outside a module`

Biasanya ini mismatch antara output module dan `package.json`.

Cek:

- `moduleFormat` di `config.hpconf`
- `type` di `package.json`
- file output yang dihasilkan (`.mjs` atau `.cjs`)

Kalau project Anda mau CommonJS, gunakan:

- `moduleFormat = "cjs"`
- `type = "commonjs"` di `package.json`

### Runtime tidak merespons

Untuk debug cepat:

```bash
npm run dev
```

Atau:

```bash
haptic run --no-monitor
```

Gunakan `log ...` atau `console.log(...)` untuk melihat flow yang berjalan.

### File berubah tapi `dev` tidak restart

Pastikan Anda mengubah file yang memang di-watch:

- entry `.haptic`
- `config.hpconf`
- `.env`
- `.env.<profile>`

## Syntax Errors yang Sering

### `reply` tanpa ekspresi

Salah:

```haptic
reply
```

Benar:

```haptic
reply "hello"
```

### `select` tanpa assignment

Salah:

```haptic
select * from users where id = 1
```

Benar:

```haptic
let rows = select * from users where id = 1
```

Atau:

```haptic
select * from users where id = 1 into rows
```

### `update` tanpa `where`

Salah:

```haptic
update users:
 points = 1
end
```

Benar:

```haptic
update users where id = user.id:
 points = 1
end
```

### `delete` tanpa `where`

Salah:

```haptic
delete from users
```

Benar:

```haptic
delete from users where id = user.id
```

### `break` atau `continue` di luar loop

Salah:

```haptic
command start:
 break
end
```

Benar:

```haptic
command start:
 while true:
  break
 end
end
```

## Mixed JavaScript

Top-level JavaScript boleh dipakai, dan urutannya sekarang dipertahankan.

Contoh:

```haptic
console.log("before")

command ping:
 reply "pong"
end

console.log("after")
```

Kalau behavior terasa aneh, cek apakah masalahnya datang dari:

- syntax Haptic
- raw JavaScript di dalam block
- env value yang belum terisi

## Saran Debug yang Efektif

- Mulai dari `haptic doctor`
- Jalankan `npm run dev`
- Tambah `log ...`
- Tambah `console.log(...)`
- Kecilkan file ke contoh paling minimal yang masih rusak

# Haptic 🚀

**DSL untuk otomasi Telegram yang di-transpile ke Node.js.**

Haptic adalah bahasa khusus (DSL / Domain Specific Language) yang dibuat untuk build Telegram Bot dan Userbot. Haptic compile menjadi JavaScript sehingga tetap berjalan di atas Node.js, namun dengan syntax yang lebih mudah di pahami serta cocok untuk project Telegram.

Misi:

> Tulis logika automasi, bukan boilerplate framework.

---

## Kenapa Haptic?

semakin bertambahnya feature, project Telegram biasanya mulai dipenuhi oleh:

* Handler yang tersebar di banyak file
* Middleware berlapis-lapis
* Routing command yang repetitif
* Konfigurasi yang bercampur dengan logika bisnis
* Boilerplate framework yang terus bertambah

Haptic mencoba menyederhanakan proses tersebut dengan menyediakan syntax yang memang dirancang untuk Telegram Automation.

### Contoh

```haptic
bot "ExampleBot":
 token = env("BOT_TOKEN")
end

command start:
 reply "Hello World"
end

on message match /ping/i:
 reply "pong"
end
```

---

# Dokumentasi

Start form here:

* [Overview](./docs/README.md)
* [Syntax](./docs/syntax.md)
* [Tutorial Bot](./docs/tutorial-bot.md)
* [Tutorial Userbot](./docs/tutorial-userbot.md)
* [Troubleshooting](./docs/troubleshooting.md)

---

# Fitur Terbaru

Beberapa fitur yang baru ditambahkan:

* `import "./shared.haptic"`
* `export func ...`
* Output `ESM` dan `CommonJS`
* Metadata package melalui `config.hpconf`

---

# Instalasi

## Instalasi Global

```bash
npm i -g https://github.com/HexZoNetwork/Haptic-Streo/releases/download/Haptic/haptic-streo-0.1.0.tgz
```

verify instalationya:

```bash
haptic --help
```

Buat proyek baru:

```bash
haptic new bot mybot
cd mybot
```

Project yang dibuat menggunakan `new` maupun `wizard` akan automatic nyediain local compiler:

```text
.haptic/bin/haptic.cjs
```

Artinya perintah seperti:

```bash
npm run build
npm run run
npm run dev
npm run doctor
```

tidak bergantung pada instalasi global.

---

## Menjalankan File Secara Langsung

```bash
haptic bot.haptic
```

---

## Instalasi Local

```bash
npm i -D https://github.com/HexZoNetwork/Haptic-Streo/releases/download/Haptic/haptic-streo-0.1.0.tgz
```

Kemudian gunakan:

```bash
npx haptic --help
```

---

# Quick Start

## Membuat Bot Baru

```bash
haptic new bot mybot

cd mybot

npm install

npm run doctor

npm run run
```

Sebelum menjalankan bot:

1. Isi file `.env.testing`
2. Masukkan token Telegram Bot
3. Jalankan project

---

## Setup Project yang Sudah Ada

Jika sudah memiliki repository:

```bash
haptic wizard
```

Lalu:

```bash
npm install
npm run build
```

Periksa file berikut:

* `config.hpconf`
* `.env.<profile>`
* `.env.<profile>.example`

---

# Transform JavaScript ke Haptic

Mengubah file JavaScript menjadi source Haptic:

```bash
haptic transform bot.js
```

Atau seluruh project:

```bash
haptic transform .
```

### Perilaku Default

Transformer akan:

* scan file `.js`, `.mjs`, dan `.cjs`
* ignore folder tersembunyi
* ignore `node_modules`
* Membuat file `.haptic` di samping source asli
* sync entry point dari `config.hpconf`
* sync dependency dan script dari `package.json` sesuai engine yang digunakan

---

# Fitur Bahasa

## Sintaks yang Didukung

### Telegram

* `bot`
* `userbot`
* `command`
* `on message`
* `on command`

### Kontrol Alur

* `if`
* `else`
* `else if`
* `elseif`
* `elif`
* `for in`
* `try`
* `catch`
* `return`
* `stop`

### Fungsi

* `func`
* `fn`

### Variabel

* `let`
* `const`
* `var`

### Query Data

* `select`
* `select ... into`
* `insert`
* `update ... where ...`
* `delete from ... where ...`

### Operator DSL

* `and`
* `or`
* `not`
* `is`
* `is not`
* `nil`

### Mixed Syntax

Kode JavaScript dapat ditulis langsung di dalam blok Haptic kalo butuh.

### Validasi Saat Compile

Expression DSL divalidasi saat proses kompilasi sehingga banyak kesalahan sintaks dapat terdeteksi lebih awal sebelum aplikasi dijalankan.

---

# Konfigurasi

File konfigurasi default:

```text
config.hpconf
```

Format JSON:

```json
{
  "entry": "bot.haptic",
  "engine": "telegraf",
  "outDir": "dist",
  "cacheDir": ".hpcache",
  "runtimeMode": "jit",
  "profile": "testing",
  "plugins": []
}
```

Format key-value yg juga di support:

```ini
entry = "bot.haptic"
engine = "telegraf"
profile = "testing"
cacheDir = ".hpcache"
```

---

# Testing

Menjalankan test:

```bash
npm test
```

Coverage saat ini mencakup:

* Scaffold project yang self-contained
* Setup project menggunakan wizard
* Bootstrap compiler lokal otomatis
* Validasi input scaffold
* Penanganan komentar JavaScript di dalam blok DSL

---

# Keamanan

Sebelum publish project:

* Jangan pernah commit credential asli
* Gunakan `.env.testing.example` sebagai template
* Pastikan file `.env*` tidak masuk repository
* Simpan secret di luar source code

---

# Filosofi

Haptic tidak dibuat untuk menggantikan JavaScript.

JavaScript tetap menjadi runtime utama.

Haptic dibuat agar pengembangan Telegram Bot dan Userbot menjadi lebih sederhana, lebih mudah dibaca, dan lebih mudah dipelihara.

Fokus pada automation.

Biarkan compiler mengurus sisanya.

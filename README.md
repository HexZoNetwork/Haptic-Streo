# Haptic Monorepo

Haptic adalah DSL Telegram automation yang di-transpile ke JavaScript Node.js.

## Install (Public)

Untuk user publik:

1. `npm i -g haptic-streo`
2. `haptic --help`
3. `haptic new bot mybot`
4. `cd mybot`
5. `haptic wizard`
6. `haptic bot.haptic`

Direct run didukung:

1. `haptic x.haptic`

Alternatif tanpa global install:

1. `npm i -D haptic-streo`
2. `npx haptic --help`

Install via GitHub Release (tanpa publish ke npmjs):

1. Upload `release/tarballs/haptic-streo-0.1.0.tgz` ke GitHub Release (tag misal `v0.1.0`)
2. User install langsung:
   `npm i -g https://github.com/<owner>/<repo>/releases/download/v0.1.0/haptic-streo-0.1.0.tgz`
3. Jalankan: `haptic --help`

## Syntax Support

- DSL block style `:` ... `end` dan `{ ... }`
- `bot`, `userbot`, `command`, `on message`, `on command`
- `if/else`, `for in`, `func`, `try/catch`, `return`, `stop`
- deklarasi `let`, `const`, `var`
- mixed syntax: JS Node.js tetap bisa ditulis langsung

## Config

File default: `config.hpconf`

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

Format `key = value` juga didukung:

```ini
entry = "bot.haptic"
engine = "telegraf"
profile = "testing"
cacheDir = ".hpcache"
```

## Security Notes

- Jangan commit credential asli ke repo.
- Pakai `.env.testing.example` untuk template.
- `.env*` di-ignore dari git dan npm package.

## Maintainer Release

Tarball build:

1. `npm run pack:tarballs`
2. Output: `release/tarballs/*.tgz`

Publish check:

1. `npm run publish:dry-run`

Publish all:

1. `npm login`
2. `npm run publish:packages`

Local installer test:

1. `npm run install:cli`
2. `npm run uninstall:cli`

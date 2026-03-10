# Haptic Ohh My God

Haptic adalah DSL Telegram automation yang di-transpile ke JavaScript Node.js. [support javascript syntax]

## Docs

Mulai dari sini:

- [Docs Overview](./docs/README.md)
- [Syntax Reference](./docs/syntax.md)
- [Tutorial Bot](./docs/tutorial-bot.md)
- [Tutorial Userbot](./docs/tutorial-userbot.md)
- [Troubleshooting](./docs/troubleshooting.md)

Highlight terbaru:

- `import "./shared.haptic"`
- `export func ...`
- output `esm` / `cjs`
- `config.hpconf` bisa bawa metadata `package`

## Install (Public)

Untuk user publik:

1. `npm i -g https://github.com/HexZoNetwork/Haptic-Streo/releases/download/Haptic/haptic-streo-0.1.0.tgz`
2. `haptic --help`
3. `haptic new bot mybot`
4. `cd mybot`

Project hasil `new` dan `wizard` otomatis membawa binary lokal ke `.haptic/bin/haptic.cjs`, jadi script `npm run build|run|dev|doctor` tidak bergantung pada global install.

Direct run didukung:

1. `haptic x.haptic`

Alternatif tanpa global install:

1. `npm i -D https://github.com/HexZoNetwork/Haptic-Streo/releases/download/Haptic/haptic-streo-0.1.0.tgz`
2. `npx haptic --help`

## Scaffold Flow

Scaffold bot baru:

1. `haptic new bot mybot`
2. `cd mybot`
3. Isi `.env.testing`
4. `npm install`
5. `npm run doctor`
6. `npm run run`

Setup project existing via wizard:

1. `haptic wizard`
2. Review `config.hpconf`
3. Review `.env.<profile>` dan `.env.<profile>.example`
4. `npm install`
5. `npm run build`

## Transform

Ubah JavaScript menjadi source `Haptic`:

1. `haptic transform bot.js`
2. `haptic transform .`

Perilaku default:

- scan `.js`, `.mjs`, `.cjs`
- skip folder tersembunyi dan `node_modules`
- generate file `.haptic` di samping source asli
- jika ada `config.hpconf`, entry `.js` akan di-sync ke `.haptic`
- jika ada `package.json` dan `engine` di config, dependency + script akan di-sync

## Syntax Support

- DSL block style `:` ... `end` dan `{ ... }`
- `bot`, `userbot`, `command`, `on message`, `on command`
- `if/else`, `else if`, `elseif`, `elif`, `for in`, `func`, `fn`, `try/catch`, `return`, `stop`
- deklarasi `let`, `const`, `var`
- query data: `select`, `select ... into`, `insert`, `update ... where ...`, `delete from ... where ...`
- operator DSL: `and`, `or`, `not`, `is`, `is not`, `nil`
- mixed syntax: JS Node.js tetap bisa ditulis langsung
- expression DSL divalidasi saat compile, jadi typo syntax lebih cepat ketahuan

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

## Testing

Regression test lokal:

1. `npm test`

Coverage saat ini:

- scaffold `new` menghasilkan project self-contained
- `wizard` menulis script lokal `.haptic/bin/haptic.cjs`
- invalid input scaffold fail-fast
- parser tidak salah hitung brace dari komentar JS di dalam block DSL

## Security Notes

- Jangan commit credential asli ke repo.
- Pakai `.env.testing.example` untuk template.
- `.env*` di-ignore dari git dan npm package.

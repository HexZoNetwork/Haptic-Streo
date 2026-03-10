# Haptic Syntax Reference

Haptic adalah DSL untuk automation Telegram yang di-transpile ke JavaScript Node.js.

## Bentuk Block

Haptic mendukung dua gaya block:

```haptic
bot "Demo":
 token = env("BOT_TOKEN")
end
```

```haptic
bot "Demo" {
 token = env("BOT_TOKEN")
}
```

Style `:` ... `end` biasanya lebih nyaman untuk file Haptic sehari-hari.

## Deklarasi Bot

Bot biasa:

```haptic
bot "MyBot":
 token = env("BOT_TOKEN")
end
```

Userbot:

```haptic
userbot "MyUserbot":
 api_id = env("API_ID")
 api_hash = env("API_HASH")
end
```

## Import dan Export

Import compile-time antar file `.haptic`:

```haptic
import "./shared.haptic"
```

`import` ini akan me-load file `.haptic` lain saat compile, bukan saat runtime.

Export function:

```haptic
export func greet(name):
 return "Hello " + name
end
```

Export ini berguna saat build artifact dan ingin mengekspos helper ke output JavaScript.

## Event dan Command

Command:

```haptic
command start:
 reply "hello"
end
```

Event message:

```haptic
on message:
 log message.text
end
```

Event message dengan regex:

```haptic
on message match /ping/i:
 reply "pong"
end
```

Event command:

```haptic
on command "/start":
 reply "ready"
end
```

## Statement Dasar

Reply:

```haptic
reply "hello"
reply "hello " + user.username
```

Log:

```haptic
log user.id
log message.text
```

Send ke chat lain:

```haptic
send chat.id "broadcast"
```

Variable:

```haptic
let name = user.username
const adminId = 12345
var enabled = true
```

Return dan stop:

```haptic
return "ok"
stop
```

## Flow Control

If / else:

```haptic
if user.id is 1:
 reply "admin"
elseif user.id is nil:
 reply "unknown"
else:
 reply "guest"
end
```

Loop:

```haptic
let items = ["a", "b", "c"]
for item in items:
 log item
end
```

While:

```haptic
let count = 0
while count < 3:
 log count
 count = count + 1
end
```

Break dan continue:

```haptic
while true:
 if user.id is nil:
  break
 end
 continue
end
```

Try / catch:

```haptic
try:
 let data = JSON.parse(message.text)
 reply data.name
catch err:
 log err.message
 reply "invalid json"
end
```

## Function

```haptic
func greet(name):
 return "Hello " + name
end

command start:
 reply await greet(user.username)
end
```

Alias `fn` juga didukung:

```haptic
fn add(a, b):
 return a + b
end
```

## Operator DSL

Operator berikut akan diterjemahkan ke JavaScript:

- `and` -> `&&`
- `or` -> `||`
- `not` -> `!`
- `is` -> `===`
- `is not` -> `!==`
- `nil` -> `null`

Contoh:

```haptic
if user.id is not nil and not false:
 reply "ok"
end
```

## Context Runtime

Field yang umum dipakai:

- `message.text`
- `message.id`
- `chat.id`
- `user.id`
- `user.username`

Helper yang tersedia:

- `reply(...)`
- `send(chatId, ...)`
- `env("NAME")`

Contoh:

```haptic
command whoami:
 reply "@" + user.username
end
```

## Database DSL

Runtime database saat ini adalah in-memory store sederhana untuk flow/testing lokal.

Deklarasi schema:

```haptic
db users:
 id int
 username text
 points int
end
```

Insert:

```haptic
insert users:
 id = user.id
 username = user.username
 points = 10
end
```

Select ke variable:

```haptic
let rows = select * from users where id = user.id
reply rows.length
```

Atau dengan `into`:

```haptic
select * from users where id = user.id into rows
reply rows.length
```

Update:

```haptic
update users where id = user.id:
 points = 99
 username = user.username
end
```

Delete:

```haptic
delete from users where id = user.id
```

Catatan:

- `select` harus disimpan ke variable.
- `delete` wajib punya `where`.
- `update` wajib punya `where`.

## Mixed JavaScript

JavaScript biasa tetap bisa ditulis langsung.

Top-level JS:

```haptic
const bootTime = Date.now()
console.log("boot", bootTime)

command ping:
 reply "pong"
end
```

Raw JS di dalam block:

```haptic
command test:
 console.log("inside command")
 reply "ok"
end
```

Urutan top-level JS sekarang dipertahankan sesuai urutan file.

## CLI yang Umum Dipakai

Scaffold project baru:

```bash
haptic new bot mybot
haptic new userbot myuserbot
```

Setup project existing:

```bash
haptic wizard
```

Build:

```bash
haptic build
```

Run:

```bash
haptic run
```

Dev watch:

```bash
haptic dev
```

Health check:

```bash
haptic doctor
```

Transform JavaScript ke Haptic:

```bash
haptic transform bot.js
haptic transform .
```

Direct run:

```bash
haptic bot.haptic
```

## File Konfigurasi

Default file: `config.hpconf`

JSON style:

```json
{
  "entry": "bot.haptic",
  "engine": "telegraf",
  "moduleFormat": "esm",
  "outDir": "dist",
  "cacheDir": ".hpcache",
  "runtimeMode": "jit",
  "profile": "testing",
  "plugins": [],
  "package": {
    "name": "my-bot",
    "private": true,
    "description": "Haptic bot project"
  }
}
```

INI style:

```ini
entry = "bot.haptic"
engine = "telegraf"
moduleFormat = "esm"
profile = "testing"
cacheDir = ".hpcache"
```

Catatan:

- `moduleFormat = "esm"` menghasilkan output `.mjs`
- `moduleFormat = "cjs"` menghasilkan output `.cjs`
- object `package` di `config.hpconf` akan ikut dipakai saat sinkronisasi `package.json`

## Error yang Sering Muncul

`reply` tanpa ekspresi:

```haptic
reply
```

`select` tanpa assignment:

```haptic
select * from users where id = 1
```

`delete` tanpa `where`:

```haptic
delete from users
```

`update` tanpa `where`:

```haptic
update users:
 points = 1
end
```

`break` atau `continue` di luar loop:

```haptic
break
continue
```

Troubleshooting lengkap ada di [Troubleshooting](./troubleshooting.md).

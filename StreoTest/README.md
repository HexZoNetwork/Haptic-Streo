# StreoTest

Contoh bot Haptic untuk:
- matematika kompleks (`/math`)
- matrix/linalg (`/matrix`)
- Google Translate (`/translate`)

## Setup

1. Salin `.env.testing.example` jadi `.env.testing`
2. Isi `BOT_TOKEN`
3. Install dependency:
   - `npm install`
4. Jalankan:
   - `haptic run`

## Command Example

- `/math ncr(10,3)+sqrt(81)-5!`
- `/math sin(pi/2)+log(1000)`
- `/matrix det [[1,2],[3,4]]`
- `/matrix inv [[4,7],[2,6]]`
- `/matrix mul [[1,2],[3,4]] [[5,6],[7,8]]`
- `/translate en halo dunia`
- `/translate id->en saya suka matematika`

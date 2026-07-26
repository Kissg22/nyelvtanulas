# LinguaHover — Vercel verzió

Saját szövegekre épülő angol–magyar és német–magyar nyelvtanuló webalkalmazás.

## Funkciók

- Felhasználói regisztráció és bejelentkezés saját, HttpOnly session cookie-val.
- Felhasználónként elkülönített PostgreSQL adatok.
- Hosszú szöveg importálása beillesztéssel vagy `.txt` / `.md` fájlból.
- Automatikus mondatbontás.
- Mondat hover: idegen nyelvű felolvasás + magyar fordítás.
- Szó hover: magyar jelentés + kiejtés.
- `S` gyorsbillentyű: az aktuális szó mentése az ismeretlen szavakhoz.
- Több böngészőben elérhető angol és német TTS-hang kiválasztása.
- Saját szótár, known/learning státusz, keresés, szűrés.
- 4 gyakorlási mód: idegen→magyar, magyar→idegen, hallás utáni gépelés, mondatkiegészítés.
- Egyszerű spaced repetition és review history.
- Fordítási cache PostgreSQL-ben.
- Vercel AI Gateway alapú szerveroldali fordítás.

## 1. Vercel projekt

Tedd a repót GitHubra, majd importáld a Vercelbe.

## 2. PostgreSQL

A Vercel Dashboardban:

`Project -> Storage / Marketplace -> Neon -> Add to project`

A Neon integráció automatikusan létrehozza a `DATABASE_URL` környezeti változót.

Ezután futtasd a `db/schema.sql` teljes tartalmát a Vercel adatbázis Query felületén.

## 3. Környezeti változók

A Vercel Project Settings -> Environment Variables alatt:

```env
DATABASE_URL=...
AI_GATEWAY_API_KEY=...
AI_TRANSLATION_MODEL=openai/gpt-5.6-luna
```

## 4. AI Gateway

Kapcsold be a Vercel AI Gateway-t a projektben, majd add meg az API-kulcsát. A fordítás csak a szerveren történik; kulcs nem kerül a böngészőbe.

## 5. Helyi futtatás

```bash
npm install
cp .env.example .env.local
npm run dev
```

Nyisd meg: `http://localhost:3000`

## Megjegyzés a hangokról

A TTS a böngésző `speechSynthesis` API-ját használja, ezért az elérhető hangok operációs rendszer és böngésző szerint eltérnek. A Beállítások oldalon az app automatikusan kilistázza az `en-*` és `de-*` hangokat.

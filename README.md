# LinguaHover

Next.js + Neon PostgreSQL nyelvtanuló alkalmazás angol→magyar és német→magyar tanuláshoz.

## Környezeti változó

Csak egy kötelező szerveroldali változó van:

```env
DATABASE_URL="postgresql://..."
```

## Adatbázis

Új adatbázisnál futtasd a `db/schema.sql` fájlt.

Ha a korábbi LinguaHover-sémáról frissítesz, először futtasd a `db/migrate-simplified.sql` fájlt. Ez eltávolítja a `sentences`, `user_settings` és `review_events` táblákat, valamint a felesleges SRS mezőket.

Az új séma 5 táblát használ:

- `users`
- `sessions`
- `texts`
- `user_words`
- `translations`

## Fordítás és hang

A mondat- és szófordítás Chrome 138+ asztali böngészőben a beépített Translator API-val helyben történik. A kész fordításokat az alkalmazás a `translations` táblában cache-eli.

A kiejtés a böngésző Web Speech (`speechSynthesis`) funkcióját használja; nincs TTS API-kulcs.

## Reader vezérlés

- mondat fölé húzás: felolvasás + magyar fordítás a mondat fölött
- szó dupla kattintása: csak szójelentés + kiejtés
- kurzor szó fölött + `S`: szó mentése
- `Esc`: szó-popup bezárása

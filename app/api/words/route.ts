import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { normalizeWord } from '@/lib/text';
import { badRequest, serverError, unauthorized } from '@/lib/http';

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const lang = url.searchParams.get('lang');
    const search = url.searchParams.get('q')?.trim() ?? '';

    const rows = await sql`
      SELECT uw.*, t.title AS source_title
      FROM user_words uw
      LEFT JOIN texts t ON t.id = uw.source_text_id
      WHERE uw.user_id = ${user.id}
        AND (${status || null}::text IS NULL OR uw.status = ${status || null})
        AND (${lang || null}::text IS NULL OR uw.source_language = ${lang || null})
        AND (${search || null}::text IS NULL OR uw.display_word ILIKE ${search ? `%${search}%` : null} OR uw.hungarian_meaning ILIKE ${search ? `%${search}%` : null})
      ORDER BY (uw.status = 'learning') DESC, uw.next_review_at ASC, uw.created_at DESC
    `;
    return NextResponse.json({ words: rows });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return unauthorized();
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const b = await request.json();
    const sourceLanguage = b.sourceLanguage === 'de' ? 'de' : b.sourceLanguage === 'en' ? 'en' : null;
    const displayWord = String(b.displayWord ?? '').trim();
    const normalized = normalizeWord(displayWord);
    const meaning = String(b.hungarianMeaning ?? '').trim();
    if (!sourceLanguage || !normalized || !meaning) return badRequest('A szó és a magyar jelentés szükséges.');

    const rows = await sql`
      INSERT INTO user_words (
        user_id, source_language, word_normalized, display_word, hungarian_meaning,
        source_text_id, source_sentence_id, example_sentence, example_translation
      ) VALUES (
        ${user.id}, ${sourceLanguage}, ${normalized}, ${displayWord}, ${meaning},
        ${b.sourceTextId || null}, ${b.sourceSentenceId || null},
        ${b.exampleSentence || null}, ${b.exampleTranslation || null}
      )
      ON CONFLICT (user_id, source_language, word_normalized)
      DO UPDATE SET
        hungarian_meaning = EXCLUDED.hungarian_meaning,
        example_sentence = COALESCE(user_words.example_sentence, EXCLUDED.example_sentence),
        example_translation = COALESCE(user_words.example_translation, EXCLUDED.example_translation),
        updated_at = now()
      RETURNING *
    `;
    return NextResponse.json({ word: rows[0] });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return unauthorized();
    return serverError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const b = await request.json();
    const id = String(b.id ?? '');
    const status = b.status === 'known' ? 'known' : b.status === 'learning' ? 'learning' : null;
    if (!id || !status) return badRequest('Hiányos módosítás.');
    const rows = await sql`
      UPDATE user_words SET status = ${status}, updated_at = now()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING *
    `;
    return NextResponse.json({ word: rows[0] ?? null });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return unauthorized();
    return serverError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return badRequest('Hiányzik a szó azonosítója.');
    await sql`DELETE FROM user_words WHERE id = ${id} AND user_id = ${user.id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return unauthorized();
    return serverError(error);
  }
}

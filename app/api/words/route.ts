import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { normalizeWord } from '@/lib/text';
import { badRequest, serverError, unauthorized } from '@/lib/http';

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const lang = url.searchParams.get('lang');
    const search = url.searchParams.get('q')?.trim() ?? '';

    const rows = await sql`
      SELECT uw.*, t.title AS source_title
      FROM user_words uw
      LEFT JOIN texts t ON t.id = uw.source_text_id
      WHERE uw.user_id = ${user.id}
        AND (${lang || null}::text IS NULL OR uw.source_language = ${lang || null})
        AND (${search || null}::text IS NULL
          OR uw.display_word ILIKE ${search ? `%${search}%` : null}
          OR uw.hungarian_meaning ILIKE ${search ? `%${search}%` : null})
      ORDER BY uw.created_at DESC
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
        source_text_id, example_sentence
      ) VALUES (
        ${user.id}, ${sourceLanguage}, ${normalized}, ${displayWord}, ${meaning},
        ${b.sourceTextId || null}, ${b.exampleSentence || null}
      )
      ON CONFLICT (user_id, source_language, word_normalized)
      DO UPDATE SET
        hungarian_meaning = EXCLUDED.hungarian_meaning,
        source_text_id = COALESCE(user_words.source_text_id, EXCLUDED.source_text_id),
        example_sentence = COALESCE(user_words.example_sentence, EXCLUDED.example_sentence)
      RETURNING *
    `;
    return NextResponse.json({ word: rows[0] });
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

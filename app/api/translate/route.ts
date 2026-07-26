import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { badRequest, serverError, unauthorized } from '@/lib/http';

function cacheKey(sourceLanguage: string, type: string, sourceText: string, context: string) {
  return createHash('sha256').update(`${sourceLanguage}|hu|${type}|${sourceText}|${context}`).digest('hex');
}

/**
 * Translation generation happens locally in supported Chrome browsers.
 * This endpoint only reads/writes the user's translation cache.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const sourceLanguage = body.sourceLanguage === 'de' ? 'de' : body.sourceLanguage === 'en' ? 'en' : null;
    const type = body.type === 'sentence' ? 'sentence' : body.type === 'word' ? 'word' : null;
    const sourceText = String(body.sourceText ?? '').trim();
    const context = String(body.context ?? '').trim();
    const translatedText = String(body.translatedText ?? '').trim();

    if (!sourceLanguage || !type || !sourceText) return badRequest('Hiányos fordítási kérés.');
    if (sourceText.length > 5000 || context.length > 8000) return badRequest('A fordítandó rész túl hosszú.');

    const key = cacheKey(sourceLanguage, type, sourceText, context);
    const cached = await sql`
      SELECT translated_text FROM translations
      WHERE user_id = ${user.id} AND cache_key = ${key}
      LIMIT 1
    `;
    if (cached.length) return NextResponse.json({ translation: cached[0].translated_text, cached: true });

    if (!translatedText) return NextResponse.json({ translation: null, cached: false });

    const saved = await sql`
      INSERT INTO translations (
        user_id, source_language, translation_type, source_text, context_text,
        translated_text, cache_key
      ) VALUES (
        ${user.id}, ${sourceLanguage}, ${type}, ${sourceText}, ${context || null},
        ${translatedText}, ${key}
      )
      ON CONFLICT (user_id, cache_key)
      DO UPDATE SET translated_text = EXCLUDED.translated_text
      RETURNING translated_text
    `;

    return NextResponse.json({ translation: saved[0].translated_text, cached: false });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return unauthorized();
    return serverError(error);
  }
}

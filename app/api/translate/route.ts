import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { generateText } from 'ai';
import { requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { badRequest, serverError, unauthorized } from '@/lib/http';

function cacheKey(sourceLanguage: string, type: string, sourceText: string, context: string) {
  return createHash('sha256')
    .update(`${sourceLanguage}|hu|${type}|${sourceText}|${context}`)
    .digest('hex');
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const sourceLanguage = body.sourceLanguage === 'de' ? 'de' : body.sourceLanguage === 'en' ? 'en' : null;
    const type = body.type === 'sentence' ? 'sentence' : body.type === 'word' ? 'word' : null;
    const sourceText = String(body.sourceText ?? '').trim();
    const context = String(body.context ?? '').trim();
    if (!sourceLanguage || !type || !sourceText) return badRequest('Hiányos fordítási kérés.');
    if (sourceText.length > 3000 || context.length > 5000) return badRequest('A fordítandó rész túl hosszú.');

    const key = cacheKey(sourceLanguage, type, sourceText, context);
    const cached = await sql`
      SELECT translated_text FROM translation_cache WHERE user_id = ${user.id} AND cache_key = ${key} LIMIT 1
    `;
    if (cached.length) return NextResponse.json({ translation: cached[0].translated_text, cached: true });

    if (!process.env.AI_GATEWAY_API_KEY) {
      return NextResponse.json(
        { error: 'A fordító nincs konfigurálva. Add meg az AI_GATEWAY_API_KEY környezeti változót a Vercelben.' },
        { status: 503 },
      );
    }

    const languageName = sourceLanguage === 'de' ? 'német' : 'angol';
    const prompt = type === 'word'
      ? `Fordítsd magyarra ezt a ${languageName} szót vagy rövid kifejezést. A kontextus alapján a leginkább odaillő jelentést add. Csak a magyar jelentést írd, magyarázat nélkül.\n\nSzó: ${sourceText}\nKontextus: ${context}`
      : `Fordítsd természetes, pontos magyarra ezt a ${languageName} mondatot. Csak a magyar fordítást add vissza, idézőjelek és magyarázat nélkül.\n\n${sourceText}`;

    const result = await generateText({
      model: process.env.AI_TRANSLATION_MODEL || 'openai/gpt-5.6-luna',
      prompt,
      temperature: 0.1,
    });
    const translation = result.text.trim();
    if (!translation) throw new Error('Empty translation');

    await sql`
      INSERT INTO translation_cache (
        user_id, source_language, target_language, source_text, context_text,
        translated_text, translation_type, cache_key
      ) VALUES (
        ${user.id}, ${sourceLanguage}, 'hu', ${sourceText}, ${context || null},
        ${translation}, ${type}, ${key}
      ) ON CONFLICT (user_id, cache_key) DO NOTHING
    `;

    return NextResponse.json({ translation, cached: false });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return unauthorized();
    return serverError(error);
  }
}

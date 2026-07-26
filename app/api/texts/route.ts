import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { segmentSentences } from '@/lib/text';
import { badRequest, serverError, unauthorized } from '@/lib/http';

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await sql`
      SELECT t.id, t.title, t.source_language, t.created_at,
             count(s.id)::int AS sentence_count
      FROM texts t
      LEFT JOIN sentences s ON s.text_id = t.id
      WHERE t.user_id = ${user.id}
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    return NextResponse.json({ texts: rows });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return unauthorized();
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const title = String(body.title ?? '').trim();
    const sourceLanguage = body.sourceLanguage === 'de' ? 'de' : body.sourceLanguage === 'en' ? 'en' : null;
    const originalText = String(body.originalText ?? '').trim();

    if (!title) return badRequest('Adj címet a szövegnek.');
    if (!sourceLanguage) return badRequest('Válassz angol vagy német nyelvet.');
    if (originalText.length < 10) return badRequest('A szöveg túl rövid.');
    if (originalText.length > 50000) return badRequest('Egy import legfeljebb 50 000 karakter lehet.');

    const sentences = segmentSentences(originalText, sourceLanguage);
    const inserted = await sql`
      INSERT INTO texts (user_id, title, source_language, original_text)
      VALUES (${user.id}, ${title}, ${sourceLanguage}, ${originalText})
      RETURNING id
    `;
    const textId = String(inserted[0].id);

    for (let i = 0; i < sentences.length; i += 1) {
      await sql`
        INSERT INTO sentences (text_id, position, source_text)
        VALUES (${textId}, ${i}, ${sentences[i]})
      `;
    }

    return NextResponse.json({ id: textId, sentenceCount: sentences.length }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return unauthorized();
    return serverError(error);
  }
}

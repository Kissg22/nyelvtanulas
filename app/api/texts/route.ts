import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { badRequest, serverError, unauthorized } from '@/lib/http';

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await sql`
      SELECT id, title, source_language, original_text, created_at
      FROM texts
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
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
    const originalText = String(body.originalText ?? '').replace(/\r\n/g, '\n').trim();

    if (!title) return badRequest('Adj címet a szövegnek.');
    if (!sourceLanguage) return badRequest('Válassz angol vagy német nyelvet.');
    if (originalText.length < 10) return badRequest('A szöveg túl rövid.');
    if (originalText.length > 50000) return badRequest('Egy import legfeljebb 50 000 karakter lehet.');

    const inserted = await sql`
      INSERT INTO texts (user_id, title, source_language, original_text)
      VALUES (${user.id}, ${title}, ${sourceLanguage}, ${originalText})
      RETURNING id
    `;

    return NextResponse.json({ id: String(inserted[0].id) }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return unauthorized();
    return serverError(error);
  }
}

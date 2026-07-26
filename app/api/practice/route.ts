import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { serverError, unauthorized } from '@/lib/http';

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await sql`
      SELECT id, display_word, hungarian_meaning, source_language, example_sentence
      FROM user_words
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return NextResponse.json({ words: rows });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return unauthorized();
    return serverError(error);
  }
}

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { badRequest, serverError, unauthorized } from '@/lib/http';

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await sql`
      SELECT * FROM user_words
      WHERE user_id = ${user.id}
        AND status = 'learning'
        AND next_review_at <= now()
      ORDER BY next_review_at ASC, created_at ASC
      LIMIT 30
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
    const wordId = String(b.wordId ?? '');
    const correct = Boolean(b.wasCorrect);
    const answer = String(b.answer ?? '');
    const exerciseType = String(b.exerciseType ?? 'foreign-to-hungarian');
    if (!wordId) return badRequest('Hiányzik a szó.');

    const existing = await sql`
      SELECT ease_factor::float8 AS ease_factor, interval_days, repetitions
      FROM user_words WHERE id = ${wordId} AND user_id = ${user.id} LIMIT 1
    `;
    if (!existing.length) return badRequest('A szó nem található.');

    let ease = Number(existing[0].ease_factor) || 2.5;
    let interval = Number(existing[0].interval_days) || 0;
    let repetitions = Number(existing[0].repetitions) || 0;

    if (correct) {
      repetitions += 1;
      if (repetitions === 1) interval = 1;
      else if (repetitions === 2) interval = 3;
      else interval = Math.max(1, Math.round(interval * ease));
      ease = Math.min(3.0, ease + 0.05);
    } else {
      repetitions = 0;
      interval = 0;
      ease = Math.max(1.3, ease - 0.2);
    }

    const next = correct
      ? new Date(Date.now() + interval * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 10 * 60 * 1000);

    await sql`
      UPDATE user_words SET
        ease_factor = ${ease}, interval_days = ${interval}, repetitions = ${repetitions},
        next_review_at = ${next.toISOString()}, updated_at = now()
      WHERE id = ${wordId} AND user_id = ${user.id}
    `;
    await sql`
      INSERT INTO review_events (user_id, user_word_id, exercise_type, was_correct, answer)
      VALUES (${user.id}, ${wordId}, ${exerciseType}, ${correct}, ${answer})
    `;

    return NextResponse.json({ ok: true, nextReviewAt: next.toISOString(), intervalDays: interval });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return unauthorized();
    return serverError(error);
  }
}

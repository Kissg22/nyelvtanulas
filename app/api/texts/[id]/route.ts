import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { serverError, unauthorized } from '@/lib/http';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const texts = await sql`
      SELECT id, title, source_language, original_text, created_at
      FROM texts WHERE id = ${id} AND user_id = ${user.id} LIMIT 1
    `;
    if (!texts.length) return NextResponse.json({ error: 'A szöveg nem található.' }, { status: 404 });
    return NextResponse.json({ text: texts[0] });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return unauthorized();
    return serverError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await sql`DELETE FROM texts WHERE id = ${id} AND user_id = ${user.id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return unauthorized();
    return serverError(error);
  }
}

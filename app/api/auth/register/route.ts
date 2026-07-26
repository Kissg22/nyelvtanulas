import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { createSession, hashPassword } from '@/lib/auth';
import { badRequest, serverError } from '@/lib/http';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const displayName = String(body.displayName ?? '').trim();

    if (!/^\S+@\S+\.\S+$/.test(email)) return badRequest('Adj meg érvényes e-mail címet.');
    if (password.length < 8) return badRequest('A jelszó legalább 8 karakter legyen.');

    const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing.length) return badRequest('Ehhez az e-mail címhez már tartozik fiók.');

    const rows = await sql`
      INSERT INTO users (email, password_hash, display_name)
      VALUES (${email}, ${hashPassword(password)}, ${displayName})
      RETURNING id, email, display_name
    `;
    const user = rows[0] as { id: string; email: string; display_name: string };

    await sql`INSERT INTO user_settings (user_id) VALUES (${user.id}) ON CONFLICT DO NOTHING`;
    await createSession(user.id);

    return NextResponse.json({ user });
  } catch (error) {
    return serverError(error);
  }
}

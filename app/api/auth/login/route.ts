import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { createSession, verifyPassword } from '@/lib/auth';
import { badRequest, serverError } from '@/lib/http';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    const rows = await sql`
      SELECT id, email, display_name, password_hash
      FROM users WHERE email = ${email} LIMIT 1
    `;
    const user = rows[0] as { id: string; email: string; display_name: string; password_hash: string } | undefined;
    if (!user || !verifyPassword(password, user.password_hash)) {
      return badRequest('Hibás e-mail cím vagy jelszó.');
    }

    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email, display_name: user.display_name } });
  } catch (error) {
    return serverError(error);
  }
}

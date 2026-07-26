import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { serverError, unauthorized } from '@/lib/http';

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await sql`SELECT * FROM user_settings WHERE user_id = ${user.id} LIMIT 1`;
    return NextResponse.json({ settings: rows[0] ?? null });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return unauthorized();
    return serverError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const b = await request.json();
    const pair = b.selected_pair === 'de-hu' ? 'de-hu' : 'en-hu';
    const rate = Math.min(1.4, Math.max(0.6, Number(b.speech_rate) || 1));
    const pitch = Math.min(1.5, Math.max(0.5, Number(b.speech_pitch) || 1));
    const fontSize = Math.min(30, Math.max(16, Number(b.font_size) || 20));
    const lineHeight = Math.min(2.4, Math.max(1.4, Number(b.line_height) || 1.8));

    const rows = await sql`
      INSERT INTO user_settings (
        user_id, selected_pair, en_voice_uri, de_voice_uri, speech_rate, speech_pitch,
        auto_word_audio, auto_sentence_audio, show_translation, font_size, line_height, updated_at
      ) VALUES (
        ${user.id}, ${pair}, ${b.en_voice_uri || null}, ${b.de_voice_uri || null}, ${rate}, ${pitch},
        ${Boolean(b.auto_word_audio)}, ${Boolean(b.auto_sentence_audio)}, ${Boolean(b.show_translation)},
        ${fontSize}, ${lineHeight}, now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        selected_pair = EXCLUDED.selected_pair,
        en_voice_uri = EXCLUDED.en_voice_uri,
        de_voice_uri = EXCLUDED.de_voice_uri,
        speech_rate = EXCLUDED.speech_rate,
        speech_pitch = EXCLUDED.speech_pitch,
        auto_word_audio = EXCLUDED.auto_word_audio,
        auto_sentence_audio = EXCLUDED.auto_sentence_audio,
        show_translation = EXCLUDED.show_translation,
        font_size = EXCLUDED.font_size,
        line_height = EXCLUDED.line_height,
        updated_at = now()
      RETURNING *
    `;
    return NextResponse.json({ settings: rows[0] });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') return unauthorized();
    return serverError(error);
  }
}

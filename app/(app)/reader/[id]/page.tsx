import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import Reader from '@/components/Reader';

export default async function ReaderPage({params}:{params:Promise<{id:string}>}){
  const user=await requireUser(); const {id}=await params;
  const texts=await sql`SELECT id,title,source_language FROM texts WHERE id=${id} AND user_id=${user.id} LIMIT 1`; if(!texts.length)notFound();
  const sentences=await sql`SELECT id,position,source_text,translated_text FROM sentences WHERE text_id=${id} ORDER BY position`;
  const sr=await sql`SELECT * FROM user_settings WHERE user_id=${user.id} LIMIT 1`;
  const settings=(sr[0]||{speech_rate:1,speech_pitch:1,auto_word_audio:true,auto_sentence_audio:true,show_translation:true,font_size:20,line_height:1.8,en_voice_uri:null,de_voice_uri:null}) as any;
  return <><div className="page-head"><div><Link className="muted" href="/texts">← Szövegek</Link><h1 style={{marginTop:8}}>{String(texts[0].title)}</h1></div><Link className="button secondary" href="/settings">Hangbeállítások</Link></div><Reader text={texts[0] as any} sentences={sentences as any} settings={settings}/></>;
}

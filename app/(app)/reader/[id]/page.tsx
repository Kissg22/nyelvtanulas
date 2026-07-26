import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import Reader from '@/components/Reader';

export default async function ReaderPage({params}:{params:Promise<{id:string}>}){
  const user=await requireUser();
  const {id}=await params;
  const texts=await sql`
    SELECT id,title,source_language,original_text
    FROM texts WHERE id=${id} AND user_id=${user.id} LIMIT 1
  `;
  if(!texts.length)notFound();
  return <>
    <div className="page-head"><div><Link className="muted" href="/texts">← Szövegek</Link><h1 style={{marginTop:8}}>{String(texts[0].title)}</h1></div><Link className="button secondary" href="/settings">Hangbeállítások</Link></div>
    <Reader text={texts[0] as any}/>
  </>;
}

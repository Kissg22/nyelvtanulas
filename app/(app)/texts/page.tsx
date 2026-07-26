import Link from 'next/link';
import {requireUser} from '@/lib/auth';
import {sql} from '@/lib/db';
import {segmentSentences} from '@/lib/text';
import TextList,{TextItem} from '@/components/TextList';

export default async function Texts(){
  const u=await requireUser();
  const rows=await sql`SELECT id,title,source_language,original_text,created_at FROM texts WHERE user_id=${u.id} ORDER BY created_at DESC`;
  const items=rows.map(row=>({
    id:String(row.id),title:String(row.title),source_language:row.source_language as 'en'|'de',created_at:String(row.created_at),
    sentence_count:segmentSentences(String(row.original_text),row.source_language as 'en'|'de').length,
  })) as TextItem[];
  return <><div className="page-head"><div><h1>Szövegeim</h1><div className="muted">A saját olvasási anyagaid.</div></div><Link className="button" href="/import">+ Új szöveg</Link></div><TextList items={items}/></>;
}

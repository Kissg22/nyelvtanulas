'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type TextItem={id:string;title:string;source_language:'en'|'de';created_at:string;sentence_count:number};
export default function TextList({items}:{items:TextItem[]}){
  const router=useRouter();
  async function remove(id:string){if(!confirm('Biztosan törlöd ezt a szöveget?'))return;await fetch(`/api/texts/${id}`,{method:'DELETE'});router.refresh();}
  return <div className="list">{items.map(t=><div className="list-row" key={t.id}><div><div style={{fontWeight:800,fontSize:17}}>{t.title}</div><div className="muted" style={{marginTop:5}}><span className="tag">{t.source_language==='en'?'EN → HU':'DE → HU'}</span> &nbsp; {t.sentence_count} mondat · {new Date(t.created_at).toLocaleDateString('hu-HU')}</div></div><div style={{display:'flex',gap:8}}><Link className="button secondary" href={`/reader/${t.id}`}>Olvasás</Link><button className="button danger" onClick={()=>remove(t.id)}>Törlés</button></div></div>)}{!items.length&&<div className="card"><b>Még nincs importált szöveged.</b><p className="muted">Importálj egy angol vagy német szöveget az induláshoz.</p></div>}</div>;
}

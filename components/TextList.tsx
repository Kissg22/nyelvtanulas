'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type TextItem={id:string;title:string;source_language:'en'|'de';created_at:string;sentence_count:number;preview:string};
export default function TextList({items}:{items:TextItem[]}){
  const router=useRouter();
  async function remove(id:string){
    if(!confirm('Biztosan törlöd ezt a szöveget?'))return;
    await fetch(`/api/texts/${id}`,{method:'DELETE'});
    router.refresh();
  }
  return <div className="text-library-grid">{items.map(t=><article className="text-library-card" key={t.id}>
    <div className="text-library-card-top">
      <span className="tag">{t.source_language==='en'?'EN → HU':'DE → HU'}</span>
      <span className="muted text-date">{new Date(t.created_at).toLocaleDateString('hu-HU')}</span>
    </div>
    <h2>{t.title}</h2>
    <p className="text-preview">{t.preview}</p>
    <div className="text-library-footer">
      <span className="muted">{t.sentence_count} mondat</span>
      <div className="text-library-actions">
        <button className="button danger compact" onClick={()=>remove(t.id)}>Törlés</button>
        <Link className="button compact" href={`/reader/${t.id}`}>Olvasás →</Link>
      </div>
    </div>
  </article>)}{!items.length&&<div className="card"><b>Még nincs importált szöveged.</b><p className="muted">Importálj egy angol vagy német szöveget az induláshoz.</p></div>}</div>;
}

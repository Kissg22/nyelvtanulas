'use client';
import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatReadingParagraphs, segmentSentences } from '@/lib/text';

export default function ImportText(){
  const router = useRouter();
  const [title,setTitle]=useState('');
  const [lang,setLang]=useState<'en'|'de'>('en');
  const [text,setText]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  const preview=useMemo(()=>formatReadingParagraphs(text,lang),[text,lang]);
  const sentenceCount=useMemo(()=>segmentSentences(text,lang).length,[text,lang]);

  async function filePicked(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0]; if(!file)return;
    setText(await file.text());
    if(!title)setTitle(file.name.replace(/\.(txt|md)$/i,''));
  }

  async function submit(e:FormEvent){
    e.preventDefault(); setLoading(true); setError('');
    const res=await fetch('/api/texts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title,sourceLanguage:lang,originalText:text})});
    const data=await res.json(); setLoading(false);
    if(!res.ok)return setError(data.error||'Nem sikerült menteni.');
    router.push(`/reader/${data.id}`); router.refresh();
  }

  return <form onSubmit={submit}>
    {error&&<div className="error">{error}</div>}
    <div className="import-layout">
      <div className="card">
        <div className="two-col">
          <div className="field"><label>Cím</label><input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Pl. The future of technology" required/></div>
          <div className="field"><label>Nyelv</label><select className="select" value={lang} onChange={e=>setLang(e.target.value as 'en'|'de')}><option value="en">Angol → magyar</option><option value="de">Német → magyar</option></select></div>
        </div>
        <div className="field"><label>.txt vagy .md fájl</label><input className="input" type="file" accept=".txt,.md,text/plain,text/markdown" onChange={filePicked}/></div>
        <div className="field"><label>Idegen nyelvű szöveg</label><textarea className="textarea import-textarea" value={text} onChange={e=>setText(e.target.value)} placeholder="Másold ide az angol vagy német szöveget. A bekezdéseket és mondatokat automatikusan olvasható formára rendezzük." required/></div>
        <div className="import-meta"><span>{text.length.toLocaleString('hu-HU')} karakter</span><span>{sentenceCount} mondat</span><span>{preview.length} olvasási bekezdés</span></div>
        <button className="button" style={{width:'100%',marginTop:16}} disabled={loading}>{loading?'Mentés…':'Mentés és megnyitás'}</button>
      </div>

      <div className="card import-preview-card">
        <div className="preview-head"><div><b>Olvasási előnézet</b><div className="muted">Így jelenik majd meg a szöveg.</div></div><span className="tag">{lang==='en'?'EN → HU':'DE → HU'}</span></div>
        <div className="import-preview">
          {preview.length?preview.map((paragraph,i)=><p key={i}>{paragraph.join(' ')}</p>):<p className="muted">A beírt szöveg formázott előnézete itt jelenik meg.</p>}
        </div>
      </div>
    </div>
  </form>;
}

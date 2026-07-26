'use client';
import { ChangeEvent, FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportText(){
  const router = useRouter();
  const [title,setTitle]=useState(''); const [lang,setLang]=useState<'en'|'de'>('en'); const [text,setText]=useState('');
  const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  async function filePicked(e:ChangeEvent<HTMLInputElement>){ const file=e.target.files?.[0]; if(!file)return; setText(await file.text()); if(!title)setTitle(file.name.replace(/\.(txt|md)$/i,'')); }
  async function submit(e:FormEvent){ e.preventDefault(); setLoading(true); setError('');
    const res=await fetch('/api/texts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title,sourceLanguage:lang,originalText:text})});
    const data=await res.json(); setLoading(false); if(!res.ok)return setError(data.error||'Nem sikerült menteni.'); router.push(`/reader/${data.id}`); router.refresh();
  }
  return <form className="card" onSubmit={submit}>
    {error&&<div className="error">{error}</div>}
    <div className="two-col">
      <div className="field"><label>Cím</label><input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Pl. The future of technology" required/></div>
      <div className="field"><label>Nyelv</label><select className="select" value={lang} onChange={e=>setLang(e.target.value as 'en'|'de')}><option value="en">Angol → magyar</option><option value="de">Német → magyar</option></select></div>
    </div>
    <div className="field"><label>.txt vagy .md fájl</label><input className="input" type="file" accept=".txt,.md,text/plain,text/markdown" onChange={filePicked}/></div>
    <div className="field"><label>Idegen nyelvű szöveg</label><textarea className="textarea" value={text} onChange={e=>setText(e.target.value)} placeholder="Másold ide a fél–egy oldalas angol vagy német szöveget…" required/></div>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><span className="muted">{text.length.toLocaleString('hu-HU')} karakter</span><button className="button" disabled={loading}>{loading?'Feldolgozás…':'Mentés és megnyitás'}</button></div>
  </form>;
}

'use client';
import { useEffect, useState } from 'react';

type Word={id:string;display_word:string;hungarian_meaning:string;source_language:'en'|'de';example_sentence:string|null;source_title:string|null;created_at:string};

export default function WordsManager(){
  const [words,setWords]=useState<Word[]>([]);
  const [q,setQ]=useState('');
  const [lang,setLang]=useState('');
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    const p=new URLSearchParams(); if(q)p.set('q',q); if(lang)p.set('lang',lang);
    const r=await fetch('/api/words?'+p); const d=await r.json(); setWords(d.words||[]); setLoading(false);
  }
  useEffect(()=>{const t=setTimeout(()=>void load(),180);return()=>clearTimeout(t)},[q,lang]);

  function speak(w:Word){
    window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(w.display_word); u.lang=w.source_language==='de'?'de-DE':'en-US'; window.speechSynthesis.speak(u);
  }
  async function remove(id:string){await fetch('/api/words?id='+id,{method:'DELETE'});void load()}

  return <>
    <div className="card" style={{marginBottom:16}}><div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:10}}><input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Keresés szó vagy jelentés alapján…"/><select className="select" value={lang} onChange={e=>setLang(e.target.value)}><option value="">Minden nyelv</option><option value="en">Angol</option><option value="de">Német</option></select></div></div>
    <div className="card" style={{overflowX:'auto'}}>{loading?<div className="muted">Betöltés…</div>:<table className="word-table"><thead><tr><th>Szó</th><th>Magyarul</th><th>Példamondat / forrás</th><th></th></tr></thead><tbody>{words.map(w=><tr key={w.id}><td><b>{w.display_word}</b><div><span className="tag">{w.source_language.toUpperCase()}</span></div></td><td>{w.hungarian_meaning}</td><td><div>{w.example_sentence||'—'}</div>{w.source_title&&<small className="muted">{w.source_title}</small>}</td><td><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><button className="button secondary" onClick={()=>speak(w)}>🔊</button><button className="button danger" onClick={()=>remove(w.id)}>Törlés</button></div></td></tr>)}</tbody></table>}{!loading&&!words.length&&<p className="muted">Nincs a szűrésnek megfelelő mentett szó.</p>}</div>
  </>;
}

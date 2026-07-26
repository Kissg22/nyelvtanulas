'use client';
import { useEffect, useMemo, useState } from 'react';

type Word={id:string;display_word:string;hungarian_meaning:string;source_language:'en'|'de';example_sentence:string|null};
type Exercise='foreign-to-hungarian'|'hungarian-to-foreign'|'listening'|'cloze';

function normalize(v:string){return v.trim().toLocaleLowerCase().normalize('NFKC').replace(/[.!?,;:]+$/g,'');}
function shuffled<T>(a:T[]){return [...a].sort(()=>Math.random()-.5)}

export default function Practice(){
  const [words,setWords]=useState<Word[]>([]); const [index,setIndex]=useState(0); const [score,setScore]=useState(0); const [answer,setAnswer]=useState(''); const [feedback,setFeedback]=useState<'correct'|'wrong'|''>(''); const [loading,setLoading]=useState(true);
  useEffect(()=>{fetch('/api/practice').then(r=>r.json()).then(d=>{setWords(d.words||[]);setLoading(false)})},[]);
  const current=words[index];
  const type=useMemo<Exercise>(()=>{if(!current)return'foreign-to-hungarian';const types:Exercise[]=['foreign-to-hungarian','hungarian-to-foreign','listening',current.example_sentence?'cloze':'foreign-to-hungarian'];return types[index%types.length]},[current,index]);
  const options=useMemo(()=>{if(!current||type!=='foreign-to-hungarian')return[];const others=shuffled(words.filter(w=>w.id!==current.id).map(w=>w.hungarian_meaning)).slice(0,3);return shuffled([current.hungarian_meaning,...others])},[current,type,words]);
  function speak(){if(!current)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(current.display_word);u.lang=current.source_language==='de'?'de-DE':'en-US';u.rate=.9;speechSynthesis.speak(u)}
  useEffect(()=>{if(type==='listening'&&current)setTimeout(speak,250)},[type,current]);
  async function record(correct:boolean,value:string){setFeedback(correct?'correct':'wrong');if(correct)setScore(s=>s+1);await fetch('/api/practice',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({wordId:current.id,wasCorrect:correct,answer:value,exerciseType:type})});setTimeout(()=>{setFeedback('');setAnswer('');setIndex(i=>i+1)},900)}
  function submitTyped(){if(!current)return;let expected=current.display_word;if(type==='cloze')expected=current.display_word;void record(normalize(answer)===normalize(expected),answer)}
  if(loading)return <div className="card">Gyakorlás betöltése…</div>;
  if(!words.length)return <div className="card"><h2>Nincs most esedékes szó 🎉</h2><p className="muted">Olvasás közben ments el új szavakat az S billentyűvel, vagy térj vissza később az ismétléshez.</p></div>;
  if(index>=words.length)return <div className="card practice-card"><h2>Kör kész</h2><div className="practice-prompt">{score} / {words.length}</div><p className="muted">A következő ismétlési időpontokat az eredményeid alapján frissítettük.</p><button className="button" onClick={()=>location.reload()}>Új kör</button></div>;
  const pct=Math.round((index/words.length)*100);
  const cloze=current.example_sentence?.replace(new RegExp(`\\b${current.display_word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i'),'_____');
  return <div className="card practice-card"><div className="progress"><div style={{width:`${pct}%`}}/></div><div className="muted" style={{marginTop:10}}>{index+1}. / {words.length} · Pont: {score}</div>
    {type==='foreign-to-hungarian'&&<><div className="muted" style={{marginTop:28}}>Mit jelent magyarul?</div><div className="practice-prompt">{current.display_word}</div><div className="options">{options.map(o=><button className="option" key={o} disabled={!!feedback} onClick={()=>record(normalize(o)===normalize(current.hungarian_meaning),o)}>{o}</button>)}</div></>}
    {type==='hungarian-to-foreign'&&<><div className="muted" style={{marginTop:28}}>Írd le {current.source_language==='de'?'németül':'angolul'}:</div><div className="practice-prompt">{current.hungarian_meaning}</div><input className="input" autoFocus value={answer} onChange={e=>setAnswer(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitTyped()} placeholder="Válasz…"/><button className="button" style={{marginTop:12}} onClick={submitTyped}>Ellenőrzés</button></>}
    {type==='listening'&&<><div className="muted" style={{marginTop:28}}>Mit hallasz?</div><div className="practice-prompt"><button className="button secondary" onClick={speak}>🔊 Újra lejátszás</button></div><input className="input" autoFocus value={answer} onChange={e=>setAnswer(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitTyped()} placeholder="Írd le a hallott szót…"/><button className="button" style={{marginTop:12}} onClick={submitTyped}>Ellenőrzés</button></>}
    {type==='cloze'&&<><div className="muted" style={{marginTop:28}}>Egészítsd ki a mondatot:</div><div className="practice-prompt" style={{fontSize:24,lineHeight:1.5}}>{cloze}</div><div className="muted" style={{marginBottom:12}}>Jelentés: {current.hungarian_meaning}</div><input className="input" autoFocus value={answer} onChange={e=>setAnswer(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitTyped()} placeholder="Hiányzó szó…"/><button className="button" style={{marginTop:12}} onClick={submitTyped}>Ellenőrzés</button></>}
    {feedback&&<div className={feedback==='correct'?'success':'error'} style={{marginTop:18}}>{feedback==='correct'?'Helyes!':'Nem jó.'} {feedback==='wrong'&&<>Helyes válasz: <b>{current.display_word}</b></>}</div>}
  </div>
}

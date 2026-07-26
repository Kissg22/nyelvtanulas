'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Word={id:string;display_word:string;hungarian_meaning:string;source_language:'en'|'de';example_sentence:string|null};
type Exercise='foreign-to-hungarian'|'hungarian-to-foreign'|'listening'|'cloze';
type Mode='flashcards'|'mixed';

function normalize(v:string){return v.trim().toLocaleLowerCase().normalize('NFKC').replace(/[.!?,;:]+$/g,'');}
function shuffled<T>(a:T[]){return [...a].sort(()=>Math.random()-.5)}

export default function Practice(){
  const [words,setWords]=useState<Word[]>([]);
  const [mode,setMode]=useState<Mode>('flashcards');
  const [index,setIndex]=useState(0);
  const [score,setScore]=useState(0);
  const [answer,setAnswer]=useState('');
  const [feedback,setFeedback]=useState<'correct'|'wrong'|''>('');
  const [loading,setLoading]=useState(true);
  const [flipped,setFlipped]=useState(false);

  useEffect(()=>{
    fetch('/api/practice').then(r=>r.json()).then(d=>{setWords(shuffled(d.words||[]));setLoading(false)}).catch(()=>setLoading(false));
  },[]);

  const current=words[index];
  const type=useMemo<Exercise>(()=>{
    if(!current)return'foreign-to-hungarian';
    const types:Exercise[]=['foreign-to-hungarian','hungarian-to-foreign','listening',current.example_sentence?'cloze':'foreign-to-hungarian'];
    return types[index%types.length];
  },[current,index]);
  const options=useMemo(()=>{
    if(!current||type!=='foreign-to-hungarian')return[];
    const others=shuffled(words.filter(w=>w.id!==current.id).map(w=>w.hungarian_meaning)).slice(0,3);
    return shuffled([current.hungarian_meaning,...others]);
  },[current,type,words]);

  const speak=useCallback(()=>{
    if(!current)return;
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(current.display_word);
    u.lang=current.source_language==='de'?'de-DE':'en-US';
    u.rate=.9;
    speechSynthesis.speak(u);
  },[current]);

  useEffect(()=>{
    if(mode==='mixed'&&type==='listening'&&current){
      const id=setTimeout(speak,250);
      return()=>clearTimeout(id);
    }
  },[mode,type,current,speak]);

  function changeMode(next:Mode){
    setMode(next);setIndex(0);setScore(0);setAnswer('');setFeedback('');setFlipped(false);
  }
  function nextCard(){if(!words.length)return;setFlipped(false);setIndex(i=>(i+1)%words.length)}
  function previousCard(){if(!words.length)return;setFlipped(false);setIndex(i=>(i-1+words.length)%words.length)}
  function shuffleCards(){setWords(prev=>shuffled(prev));setIndex(0);setFlipped(false)}

  useEffect(()=>{
    if(mode!=='flashcards')return;
    function key(e:KeyboardEvent){
      const t=e.target as HTMLElement|null;
      if(t?.tagName==='INPUT'||t?.tagName==='TEXTAREA'||t?.isContentEditable)return;
      if(e.code==='Space'){e.preventDefault();setFlipped(v=>!v)}
      else if(e.key==='ArrowRight'){e.preventDefault();nextCard()}
      else if(e.key==='ArrowLeft'){e.preventDefault();previousCard()}
    }
    window.addEventListener('keydown',key);
    return()=>window.removeEventListener('keydown',key);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[mode,words.length]);

  function record(correct:boolean){
    setFeedback(correct?'correct':'wrong');
    if(correct)setScore(s=>s+1);
    setTimeout(()=>{setFeedback('');setAnswer('');setIndex(i=>i+1)},900);
  }
  function submitTyped(){if(!current)return;record(normalize(answer)===normalize(current.display_word))}

  if(loading)return <div className="card">Gyakorlás betöltése…</div>;
  if(!words.length)return <div className="card"><h2>Még nincs mentett szó.</h2><p className="muted">Olvasás közben vidd a kurzort egy szóra, és nyomd meg az S billentyűt.</p></div>;

  return <>
    <div className="practice-mode-switch" role="tablist" aria-label="Gyakorlási mód">
      <button className={mode==='flashcards'?'active':''} onClick={()=>changeMode('flashcards')}>Szókártyák</button>
      <button className={mode==='mixed'?'active':''} onClick={()=>changeMode('mixed')}>Vegyes gyakorlás</button>
    </div>

    {mode==='flashcards'?<Flashcards
      words={words} current={current} index={index} flipped={flipped}
      setFlipped={setFlipped} next={nextCard} previous={previousCard} shuffle={shuffleCards} speak={speak}
    />:<MixedPractice
      words={words} current={current} index={index} score={score} type={type} options={options}
      answer={answer} setAnswer={setAnswer} feedback={feedback} record={record} submitTyped={submitTyped} speak={speak}
    />}
  </>;
}

function Flashcards({words,current,index,flipped,setFlipped,next,previous,shuffle,speak}:{
  words:Word[];current:Word;index:number;flipped:boolean;setFlipped:(v:boolean|((v:boolean)=>boolean))=>void;
  next:()=>void;previous:()=>void;shuffle:()=>void;speak:()=>void;
}){
  const pct=((index+1)/words.length)*100;
  return <div className="flashcard-shell">
    <div className="flashcard-topline">
      <span>{index+1} / {words.length}</span>
      <span>{current.source_language==='de'?'Német → magyar':'Angol → magyar'}</span>
      <button className="text-button" onClick={shuffle}>↻ Keverés</button>
    </div>
    <div className="progress"><div style={{width:`${pct}%`}}/></div>

    <button className={`flashcard ${flipped?'is-flipped':''}`} onClick={()=>setFlipped(v=>!v)} aria-label="Szókártya megfordítása">
      <span className="flashcard-side flashcard-front">
        <span className="flashcard-eyebrow">MAGYARUL</span>
        <strong>{current.hungarian_meaning}</strong>
        <small>Kattints a kártyára az idegen szóért</small>
      </span>
      <span className="flashcard-side flashcard-back">
        <span className="flashcard-eyebrow">{current.source_language==='de'?'NÉMETÜL':'ANGOLUL'}</span>
        <strong>{current.display_word}</strong>
        {current.example_sentence&&<span className="flashcard-example">{current.example_sentence}</span>}
        <small>Újabb kattintás: visszafordítás</small>
      </span>
    </button>

    <div className="flashcard-actions">
      <button className="button secondary" onClick={previous}>← Előző</button>
      <button className="button secondary" onClick={e=>{e.stopPropagation();speak()}}>🔊 Kiejtés</button>
      <button className="button" onClick={next}>Következő →</button>
    </div>
    <div className="flashcard-keyboard muted"><kbd>Space</kbd> fordítás · <kbd>←</kbd> előző · <kbd>→</kbd> következő</div>
  </div>;
}

function MixedPractice({words,current,index,score,type,options,answer,setAnswer,feedback,record,submitTyped,speak}:{
  words:Word[];current:Word;index:number;score:number;type:Exercise;options:string[];answer:string;
  setAnswer:(v:string)=>void;feedback:'correct'|'wrong'|'';record:(correct:boolean)=>void;submitTyped:()=>void;speak:()=>void;
}){
  if(index>=words.length)return <div className="card practice-card"><h2>Kör kész</h2><div className="practice-prompt">{score} / {words.length}</div><p className="muted">Az eredmény csak erre a körre vonatkozik.</p><button className="button" onClick={()=>location.reload()}>Új kör</button></div>;
  const pct=Math.round((index/words.length)*100);
  const cloze=current.example_sentence?.replace(new RegExp(`\\b${current.display_word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i'),'_____');
  return <div className="card practice-card"><div className="progress"><div style={{width:`${pct}%`}}/></div><div className="muted" style={{marginTop:10}}>{index+1}. / {words.length} · Pont: {score}</div>
    {type==='foreign-to-hungarian'&&<><div className="muted" style={{marginTop:28}}>Mit jelent magyarul?</div><div className="practice-prompt">{current.display_word}</div><div className="options">{options.map(o=><button className="option" key={o} disabled={!!feedback} onClick={()=>record(normalize(o)===normalize(current.hungarian_meaning))}>{o}</button>)}</div></>}
    {type==='hungarian-to-foreign'&&<><div className="muted" style={{marginTop:28}}>Írd le {current.source_language==='de'?'németül':'angolul'}:</div><div className="practice-prompt">{current.hungarian_meaning}</div><input className="input" autoFocus value={answer} onChange={e=>setAnswer(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitTyped()} placeholder="Válasz…"/><button className="button" style={{marginTop:12}} onClick={submitTyped}>Ellenőrzés</button></>}
    {type==='listening'&&<><div className="muted" style={{marginTop:28}}>Mit hallasz?</div><div className="practice-prompt"><button className="button secondary" onClick={speak}>🔊 Újra lejátszás</button></div><input className="input" autoFocus value={answer} onChange={e=>setAnswer(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitTyped()} placeholder="Írd le a hallott szót…"/><button className="button" style={{marginTop:12}} onClick={submitTyped}>Ellenőrzés</button></>}
    {type==='cloze'&&<><div className="muted" style={{marginTop:28}}>Egészítsd ki a mondatot:</div><div className="practice-prompt" style={{fontSize:24,lineHeight:1.5}}>{cloze}</div><div className="muted" style={{marginBottom:12}}>Jelentés: {current.hungarian_meaning}</div><input className="input" autoFocus value={answer} onChange={e=>setAnswer(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitTyped()} placeholder="Hiányzó szó…"/><button className="button" style={{marginTop:12}} onClick={submitTyped}>Ellenőrzés</button></>}
    {feedback&&<div className={feedback==='correct'?'success':'error'} style={{marginTop:18}}>{feedback==='correct'?'Helyes!':<>Nem jó. Helyes válasz: <b>{current.display_word}</b></>}</div>}
  </div>;
}

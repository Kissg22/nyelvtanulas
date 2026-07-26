'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isWordToken, normalizeWord, tokenizeSentence } from '@/lib/text';

type Sentence={id:string;position:number;source_text:string;translated_text:string|null};
type Settings={en_voice_uri:string|null;de_voice_uri:string|null;speech_rate:number|string;speech_pitch:number|string;auto_word_audio:boolean;auto_sentence_audio:boolean;show_translation:boolean;font_size:number;line_height:number|string};
type Props={text:{id:string;title:string;source_language:'en'|'de'};sentences:Sentence[];settings:Settings};
type Hovered={word:string;sentence:Sentence;translation?:string};

export default function Reader({text,sentences,settings}:Props){
  const [sentenceTranslations,setSentenceTranslations]=useState<Record<string,string>>(()=>Object.fromEntries(sentences.filter(s=>s.translated_text).map(s=>[s.id,s.translated_text!] )));
  const [wordTranslations,setWordTranslations]=useState<Record<string,string>>({});
  const [activeSentence,setActiveSentence]=useState<string|null>(null);
  const [hovered,setHovered]=useState<Hovered|null>(null);
  const [saved,setSaved]=useState<Set<string>>(new Set());
  const [notice,setNotice]=useState('');
  const sentenceTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const wordTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const voices=useRef<SpeechSynthesisVoice[]>([]);

  useEffect(()=>{
    const load=()=>{voices.current=window.speechSynthesis.getVoices()}; load(); window.speechSynthesis.addEventListener('voiceschanged',load);
    fetch(`/api/words?lang=${text.source_language}&status=learning`).then(r=>r.json()).then(d=>setSaved(new Set((d.words||[]).map((w:{word_normalized:string})=>w.word_normalized)))).catch(()=>{});
    return()=>{window.speechSynthesis.removeEventListener('voiceschanged',load); window.speechSynthesis.cancel();};
  },[text.source_language]);

  const speak=useCallback((value:string)=>{
    if(!value.trim()||typeof window==='undefined')return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(value);
    u.lang=text.source_language==='de'?'de-DE':'en-US'; u.rate=Number(settings.speech_rate)||1; u.pitch=Number(settings.speech_pitch)||1;
    const uri=text.source_language==='de'?settings.de_voice_uri:settings.en_voice_uri;
    const voice=voices.current.find(v=>v.voiceURI===uri) || voices.current.find(v=>v.lang.toLowerCase().startsWith(text.source_language));
    if(voice)u.voice=voice; window.speechSynthesis.speak(u);
  },[settings,text.source_language]);

  async function translate(sourceText:string,type:'word'|'sentence',context=''){
    const key=type==='word'?`${sourceText.toLocaleLowerCase()}|${context}`:sourceText;
    const map=type==='word'?wordTranslations:sentenceTranslations;
    if(map[key])return map[key];
    const res=await fetch('/api/translate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sourceLanguage:text.source_language,type,sourceText,context})});
    const data=await res.json();
    if(!res.ok){setNotice(data.error||'A fordítás nem sikerült.'); return '';}
    if(type==='word')setWordTranslations(m=>({...m,[key]:data.translation}));
    return data.translation as string;
  }

  async function enterSentence(s:Sentence){
    if(sentenceTimer.current)clearTimeout(sentenceTimer.current);
    sentenceTimer.current=setTimeout(async()=>{
      setActiveSentence(s.id);
      if(settings.auto_sentence_audio)speak(s.source_text);
      if(settings.show_translation&&!sentenceTranslations[s.id]){
        const tr=await translate(s.source_text,'sentence'); if(tr)setSentenceTranslations(m=>({...m,[s.id]:tr}));
      }
    },450);
  }
  function leaveSentence(){if(sentenceTimer.current)clearTimeout(sentenceTimer.current); setActiveSentence(null);}

  function enterWord(word:string,s:Sentence){
    if(sentenceTimer.current)clearTimeout(sentenceTimer.current); if(wordTimer.current)clearTimeout(wordTimer.current);
    wordTimer.current=setTimeout(async()=>{
      const key=`${word.toLocaleLowerCase()}|${s.source_text}`;
      setHovered({word,sentence:s,translation:wordTranslations[key]});
      if(settings.auto_word_audio)speak(word);
      const tr=wordTranslations[key]||await translate(word,'word',s.source_text);
      setHovered(h=>h&&h.word===word&&h.sentence.id===s.id?{...h,translation:tr}:h);
    },260);
  }
  function leaveWord(){if(wordTimer.current)clearTimeout(wordTimer.current); setHovered(null);}

  const saveWord=useCallback(async(h:Hovered)=>{
    let meaning=h.translation;
    if(!meaning){meaning=await translate(h.word,'word',h.sentence.source_text);}
    if(!meaning)return;
    const res=await fetch('/api/words',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sourceLanguage:text.source_language,displayWord:h.word,hungarianMeaning:meaning,sourceTextId:text.id,sourceSentenceId:h.sentence.id,exampleSentence:h.sentence.source_text,exampleTranslation:sentenceTranslations[h.sentence.id]||null})});
    if(res.ok){setSaved(prev=>new Set(prev).add(normalizeWord(h.word)));setNotice(`Elmentve: ${h.word} → ${meaning}`);setTimeout(()=>setNotice(''),1800);} else {const d=await res.json();setNotice(d.error||'Nem sikerült menteni.');}
  },[sentenceTranslations,text.id,text.source_language,wordTranslations]);

  useEffect(()=>{
    function key(e:KeyboardEvent){
      const target=e.target as HTMLElement|null; const typing=target?.tagName==='INPUT'||target?.tagName==='TEXTAREA'||target?.isContentEditable;
      if(!typing&&hovered&&e.key.toLowerCase()==='s'){e.preventDefault();void saveWord(hovered);}
    }
    window.addEventListener('keydown',key); return()=>window.removeEventListener('keydown',key);
  },[hovered,saveWord]);

  const rendered=useMemo(()=>sentences.map(s=>({s,tokens:tokenizeSentence(s.source_text)})),[sentences]);
  return <>
    <div className="reader-toolbar"><span className="tag">{text.source_language==='en'?'ANGOL → MAGYAR':'NÉMET → MAGYAR'}</span><button className="button secondary" onClick={()=>window.speechSynthesis.cancel()}>■ Hang leállítása</button><span className="muted">Szó fölött: <b>S</b> = mentés</span></div>
    {notice&&<div className={notice.startsWith('Elmentve')?'success':'error'} style={{marginBottom:12}}>{notice}</div>}
    <article className="reader-card"><div className="reader-text" style={{fontSize:settings.font_size||20,lineHeight:Number(settings.line_height)||1.8}}>
      {rendered.map(({s,tokens})=><span key={s.id} className="sentence" onMouseEnter={()=>enterSentence(s)} onMouseLeave={leaveSentence} onClick={()=>speak(s.source_text)} title="Kattintás: mondat újra lejátszása">
        {tokens.map((token,i)=>isWordToken(token)?<span key={i} className={`word ${saved.has(normalizeWord(token))?'saved':''}`} onMouseEnter={()=>enterWord(token,s)} onMouseLeave={leaveWord} onFocus={()=>enterWord(token,s)} onBlur={leaveWord} onClick={e=>{e.stopPropagation();speak(token)}} tabIndex={0} title="Kattintás: szó újra lejátszása">
          {token}
          {hovered?.word===token&&hovered.sentence.id===s.id&&<span className="tooltip"><b>{token}</b><br/>{hovered.translation||'Fordítás…'}<br/><span style={{opacity:.75}}>🔊 kiejtés · S mentés</span></span>}
        </span>:<span key={i}>{token}</span>)}{' '}
        {activeSentence===s.id&&settings.show_translation&&<span className="translation-line">{sentenceTranslations[s.id]||'Fordítás…'}</span>}
      </span>)}
    </div></article>
  </>;
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatReadingParagraphs, isWordToken, normalizeWord, tokenizeSentence } from '@/lib/text';
import { translateInBrowser } from '@/lib/browser-translation';
import { DEFAULT_PREFERENCES, loadPreferences, ReaderPreferences } from '@/lib/preferences';

type Props={text:{id:string;title:string;source_language:'en'|'de';original_text:string}};
type Sentence={id:string;source_text:string};
type WordTarget={word:string;sentence:Sentence};
type WordPopup=WordTarget&{translation:string;loading:boolean};

export default function Reader({text}:Props){
  const [preferences,setPreferences]=useState<ReaderPreferences>(DEFAULT_PREFERENCES);
  const [sentenceTranslations,setSentenceTranslations]=useState<Record<string,string>>({});
  const sentenceTranslationsRef=useRef<Record<string,string>>({});
  const wordTranslationsRef=useRef<Record<string,string>>({});
  const [activeSentence,setActiveSentence]=useState<string|null>(null);
  const [hoveredSentence,setHoveredSentence]=useState<Sentence|null>(null);
  const [hoveredWord,setHoveredWord]=useState<WordTarget|null>(null);
  const [wordPopup,setWordPopup]=useState<WordPopup|null>(null);
  const [saved,setSaved]=useState<Set<string>>(new Set());
  const [notice,setNotice]=useState('');
  const [translationStatus,setTranslationStatus]=useState('Fordítások előkészítése…');
  const sentenceTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const voices=useRef<SpeechSynthesisVoice[]>([]);

  const paragraphs=useMemo(()=>{
    let n=0;
    return formatReadingParagraphs(text.original_text,text.source_language).map((sentences,pIndex)=>({
      id:`p-${pIndex}`,
      sentences:sentences.map(source_text=>({id:`s-${n++}`,source_text})),
    }));
  },[text.original_text,text.source_language]);

  const allSentences=useMemo(()=>paragraphs.flatMap(p=>p.sentences),[paragraphs]);

  useEffect(()=>{
    setPreferences(loadPreferences());
    const load=()=>{voices.current=window.speechSynthesis.getVoices()};
    load();
    window.speechSynthesis.addEventListener('voiceschanged',load);
    fetch(`/api/words?lang=${text.source_language}`)
      .then(r=>r.json())
      .then(d=>setSaved(new Set((d.words||[]).map((w:{word_normalized:string})=>w.word_normalized))))
      .catch(()=>{});
    return()=>{
      window.speechSynthesis.removeEventListener('voiceschanged',load);
      window.speechSynthesis.cancel();
      if(sentenceTimer.current)clearTimeout(sentenceTimer.current);
    };
  },[text.source_language]);

  const speak=useCallback((value:string)=>{
    if(!value.trim()||typeof window==='undefined')return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(value);
    u.lang=text.source_language==='de'?'de-DE':'en-US';
    u.rate=preferences.speech_rate;
    u.pitch=preferences.speech_pitch;
    const uri=text.source_language==='de'?preferences.de_voice_uri:preferences.en_voice_uri;
    const voice=voices.current.find(v=>v.voiceURI===uri) || voices.current.find(v=>v.lang.toLowerCase().startsWith(text.source_language));
    if(voice)u.voice=voice;
    window.speechSynthesis.speak(u);
  },[preferences,text.source_language]);

  const getTranslation=useCallback(async(sourceText:string,type:'word'|'sentence',context='')=>{
    const localKey=type==='word'?`${normalizeWord(sourceText)}|${context}`:sourceText;
    if(type==='word'&&wordTranslationsRef.current[localKey])return wordTranslationsRef.current[localKey];

    const cachedRes=await fetch('/api/translate',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({sourceLanguage:text.source_language,type,sourceText,context}),
    });
    const cached=await cachedRes.json().catch(()=>({}));
    if(cachedRes.ok&&cached.translation){
      if(type==='word')wordTranslationsRef.current={...wordTranslationsRef.current,[localKey]:String(cached.translation)};
      return String(cached.translation);
    }

    let translated='';
    try{
      translated=await translateInBrowser(text.source_language,sourceText,(progress)=>{
        setTranslationStatus(`Fordítómodell letöltése… ${Math.round(progress*100)}%`);
      });
    }catch(error){
      if((error as Error).message==='BROWSER_TRANSLATOR_UNAVAILABLE'){
        setTranslationStatus('A helyi automatikus fordítás ezen a böngészőn nem érhető el.');
      }else{
        setTranslationStatus('A helyi fordítás most nem érhető el.');
      }
      return '';
    }

    if(!translated)return '';
    if(type==='word')wordTranslationsRef.current={...wordTranslationsRef.current,[localKey]:translated};

    void fetch('/api/translate',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({sourceLanguage:text.source_language,type,sourceText,context,translatedText:translated}),
    });
    return translated;
  },[text.source_language]);

  const ensureSentenceTranslation=useCallback(async(sentence:Sentence)=>{
    if(sentenceTranslationsRef.current[sentence.id])return sentenceTranslationsRef.current[sentence.id];
    const tr=await getTranslation(sentence.source_text,'sentence');
    if(tr){
      sentenceTranslationsRef.current={...sentenceTranslationsRef.current,[sentence.id]:tr};
      setSentenceTranslations(sentenceTranslationsRef.current);
    }
    return tr;
  },[getTranslation]);

  // Prepare the text automatically, but keep interaction instant from the cache afterwards.
  useEffect(()=>{
    let cancelled=false;
    async function prepare(){
      let done=0;
      for(const sentence of allSentences){
        if(cancelled)return;
        if(!sentenceTranslationsRef.current[sentence.id]){
          setTranslationStatus(`Automatikus fordítás: ${done}/${allSentences.length}`);
          await ensureSentenceTranslation(sentence);
        }
        done+=1;
      }
      if(!cancelled)setTranslationStatus('Fordítások készen');
    }
    void prepare();
    return()=>{cancelled=true};
  },[allSentences,ensureSentenceTranslation]);

  function enterSentence(sentence:Sentence){
    setHoveredSentence(sentence);
    if(sentenceTimer.current)clearTimeout(sentenceTimer.current);
    sentenceTimer.current=setTimeout(()=>{
      if(wordPopup)return;
      setActiveSentence(sentence.id);
      void ensureSentenceTranslation(sentence);
    },180);
  }

  function leaveSentence(sentence:Sentence){
    if(sentenceTimer.current)clearTimeout(sentenceTimer.current);
    setHoveredSentence(current=>current?.id===sentence.id?null:current);
    setActiveSentence(current=>current===sentence.id?null:current);
  }

  async function openWord(word:string,sentence:Sentence,playAudio=true){
    if(sentenceTimer.current)clearTimeout(sentenceTimer.current);
    setActiveSentence(null);
    setWordPopup({word,sentence,translation:'',loading:true});
    if(playAudio)speak(word);
    const key=`${normalizeWord(word)}|${sentence.source_text}`;
    const existing=wordTranslationsRef.current[key];
    const translation=existing||await getTranslation(word,'word',sentence.source_text);
    setWordPopup(current=>current?.word===word&&current.sentence.id===sentence.id?{...current,translation,loading:false}:current);
  }

  const saveWord=useCallback(async(target:WordTarget)=>{
    const key=`${normalizeWord(target.word)}|${target.sentence.source_text}`;
    const meaning=wordTranslationsRef.current[key]||await getTranslation(target.word,'word',target.sentence.source_text);
    if(!meaning){setNotice('A szó fordítása még nem érhető el.');return;}

    const res=await fetch('/api/words',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({
        sourceLanguage:text.source_language,
        displayWord:target.word,
        hungarianMeaning:meaning,
        sourceTextId:text.id,
        exampleSentence:target.sentence.source_text,
      }),
    });
    const data=await res.json().catch(()=>({}));
    if(res.ok){
      setSaved(prev=>new Set(prev).add(normalizeWord(target.word)));
      setNotice(`Elmentve: ${target.word} → ${meaning}`);
    }else setNotice(data.error||'Nem sikerült menteni a szót.');
    setTimeout(()=>setNotice(''),2200);
  },[getTranslation,text.id,text.source_language]);

  const playHoveredSentence=useCallback(async()=>{
    if(!hoveredSentence)return;
    setWordPopup(null);
    setActiveSentence(hoveredSentence.id);
    await ensureSentenceTranslation(hoveredSentence);
    speak(hoveredSentence.source_text);
  },[ensureSentenceTranslation,hoveredSentence,speak]);

  const playHoveredWord=useCallback(async()=>{
    if(!hoveredWord)return;
    await openWord(hoveredWord.word,hoveredWord.sentence,true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[hoveredWord,speak,getTranslation]);

  useEffect(()=>{
    function key(e:KeyboardEvent){
      const target=e.target as HTMLElement|null;
      const typing=target?.tagName==='INPUT'||target?.tagName==='TEXTAREA'||target?.isContentEditable;
      if(typing)return;
      const pressed=e.key.toLowerCase();
      if(pressed==='s'&&hoveredWord){
        e.preventDefault();
        void saveWord(hoveredWord);
      }else if(pressed==='w'&&hoveredSentence){
        e.preventDefault();
        void playHoveredSentence();
      }else if(pressed==='e'&&hoveredWord){
        e.preventDefault();
        void playHoveredWord();
      }else if(e.key==='Escape'){
        setWordPopup(null);
        window.speechSynthesis.cancel();
      }
    }
    window.addEventListener('keydown',key);
    return()=>window.removeEventListener('keydown',key);
  },[hoveredSentence,hoveredWord,playHoveredSentence,playHoveredWord,saveWord]);

  return <>
    <div className="reader-toolbar reader-toolbar-v3">
      <span className="tag">{text.source_language==='en'?'ANGOL → MAGYAR':'NÉMET → MAGYAR'}</span>
      <div className="reader-shortcuts">
        <span><kbd>W</kbd> mondat + jelentés</span>
        <span><kbd>E</kbd> szó + jelentés</span>
        <span><kbd>S</kbd> szó mentése</span>
      </div>
      <button className="button secondary compact" onClick={()=>window.speechSynthesis.cancel()}>■ Leállítás</button>
      <span className="translation-status">{translationStatus}</span>
    </div>
    {notice&&<div className={notice.startsWith('Elmentve')?'success':'error'} style={{marginBottom:12}}>{notice}</div>}

    <article className="reader-card reader-card-v3" onClick={()=>setWordPopup(null)}>
      <div className="reader-title-row">
        <div>
          <div className="reader-kicker">OLVASÁS</div>
          <h2>{text.title}</h2>
        </div>
        <div className="reader-help">Vidd az egeret egy mondatra vagy szóra, majd használd a W / E / S gombokat.</div>
      </div>
      <div className="reader-text" style={{fontSize:preferences.font_size,lineHeight:preferences.line_height}}>
        {paragraphs.map(paragraph=><p className="reader-paragraph" key={paragraph.id}>
          {paragraph.sentences.map(sentence=><span
            key={sentence.id}
            className={`sentence ${activeSentence===sentence.id?'active':''}`}
            onMouseEnter={()=>enterSentence(sentence)}
            onMouseLeave={()=>leaveSentence(sentence)}
          >
            {activeSentence===sentence.id&&!wordPopup&&<span className="sentence-translation">
              <span className="translation-label">MAGYARUL</span>
              {sentenceTranslations[sentence.id]||'Fordítás folyamatban…'}
              <span className="translation-key-hint">W · felolvasás</span>
            </span>}
            {tokenizeSentence(sentence.source_text).map((token,i)=>isWordToken(token)?<span
              key={`${sentence.id}-${i}`}
              className={`word ${saved.has(normalizeWord(token))?'saved':''}`}
              onMouseEnter={()=>setHoveredWord({word:token,sentence})}
              onMouseLeave={()=>setHoveredWord(current=>current?.word===token&&current.sentence.id===sentence.id?null:current)}
              onClick={e=>e.stopPropagation()}
              onDoubleClick={e=>{e.preventDefault();e.stopPropagation();void openWord(token,sentence,true)}}
              title="E: szó kiejtése és jelentése · S: mentés · dupla kattintás: ugyanaz, mint E"
            >
              {token}
              {wordPopup?.word===token&&wordPopup.sentence.id===sentence.id&&<span className="word-popup word-popup-v3" onClick={e=>e.stopPropagation()}>
                <span className="translation-label dark">MAGYARUL</span>
                <b>{wordPopup.loading?'Fordítás…':wordPopup.translation||'Nincs fordítás.'}</b>
                <small>{token} · 🔊 kiejtés</small>
              </span>}
            </span>:<span key={`${sentence.id}-${i}`}>{token}</span>)}{' '}
          </span>)}
        </p>)}
      </div>
    </article>
  </>;
}

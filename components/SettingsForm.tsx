'use client';
import { useEffect, useState } from 'react';
import { DEFAULT_PREFERENCES, loadPreferences, PREFERENCES_KEY, ReaderPreferences } from '@/lib/preferences';

type VoiceOption={name:string;voiceURI:string;lang:string};

export default function SettingsForm(){
  const [s,setS]=useState<ReaderPreferences>(DEFAULT_PREFERENCES);
  const [voices,setVoices]=useState<VoiceOption[]>([]);
  const [saved,setSaved]=useState(false);

  useEffect(()=>{
    setS(loadPreferences());
    const load=()=>setVoices(speechSynthesis.getVoices().map(v=>({name:v.name,voiceURI:v.voiceURI,lang:v.lang})));
    load(); speechSynthesis.addEventListener('voiceschanged',load);
    return()=>speechSynthesis.removeEventListener('voiceschanged',load);
  },[]);

  const ens=voices.filter(v=>v.lang.toLowerCase().startsWith('en'));
  const des=voices.filter(v=>v.lang.toLowerCase().startsWith('de'));

  function save(){
    localStorage.setItem(PREFERENCES_KEY,JSON.stringify(s));
    setSaved(true); setTimeout(()=>setSaved(false),1600);
  }

  function test(lang:'en'|'de'){
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(lang==='de'?'Guten Tag! So klingt diese Stimme.':'Hello! This is how this voice sounds.');
    u.lang=lang==='de'?'de-DE':'en-US'; u.rate=s.speech_rate; u.pitch=s.speech_pitch;
    const uri=lang==='de'?s.de_voice_uri:s.en_voice_uri;
    const v=speechSynthesis.getVoices().find(x=>x.voiceURI===uri);
    if(v)u.voice=v; speechSynthesis.speak(u);
  }

  return <div className="card" style={{maxWidth:850}}>
    {saved&&<div className="success">Beállítások elmentve ezen az eszközön.</div>}
    <p className="muted">A hangbeállításokat nem tároljuk az adatbázisban; csak ebben a böngészőben maradnak meg.</p>
    <h2>Hangok</h2>
    <div className="two-col">
      <div className="field"><label>Angol hang</label><select className="select" value={s.en_voice_uri||''} onChange={e=>setS({...s,en_voice_uri:e.target.value||null})}><option value="">Automatikus</option>{ens.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}</select><button className="button secondary" type="button" onClick={()=>test('en')}>🔊 Próba</button></div>
      <div className="field"><label>Német hang</label><select className="select" value={s.de_voice_uri||''} onChange={e=>setS({...s,de_voice_uri:e.target.value||null})}><option value="">Automatikus</option>{des.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}</select><button className="button secondary" type="button" onClick={()=>test('de')}>🔊 Próba</button></div>
    </div>
    <div className="range-row"><b>Beszédsebesség</b><input type="range" min="0.6" max="1.4" step="0.05" value={s.speech_rate} onChange={e=>setS({...s,speech_rate:Number(e.target.value)})}/><span>{s.speech_rate.toFixed(2)}×</span></div>
    <div className="range-row"><b>Hangmagasság</b><input type="range" min="0.5" max="1.5" step="0.05" value={s.speech_pitch} onChange={e=>setS({...s,speech_pitch:Number(e.target.value)})}/><span>{s.speech_pitch.toFixed(2)}</span></div>
    <h2>Olvasó</h2>
    <div className="switch-row"><span>Mondat automatikus felolvasása rámutatáskor</span><input type="checkbox" checked={s.auto_sentence_audio} onChange={e=>setS({...s,auto_sentence_audio:e.target.checked})}/></div>
    <div className="switch-row"><span>Magyar mondatfordítás megjelenítése</span><input type="checkbox" checked={s.show_translation} onChange={e=>setS({...s,show_translation:e.target.checked})}/></div>
    <div className="range-row"><b>Betűméret</b><input type="range" min="16" max="30" step="1" value={s.font_size} onChange={e=>setS({...s,font_size:Number(e.target.value)})}/><span>{s.font_size}px</span></div>
    <div className="range-row"><b>Sorköz</b><input type="range" min="1.4" max="2.4" step="0.1" value={s.line_height} onChange={e=>setS({...s,line_height:Number(e.target.value)})}/><span>{s.line_height.toFixed(1)}</span></div>
    <div style={{marginTop:22}}><button className="button" type="button" onClick={save}>Beállítások mentése</button></div>
  </div>;
}

'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError('');
    const form = new FormData(e.currentTarget);
    const payload = {
      displayName: String(form.get('displayName') ?? ''),
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    };
    const res = await fetch(`/api/auth/${mode}`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || 'Hiba történt.');
    router.push('/dashboard'); router.refresh();
  }
  const register = mode === 'register';
  return <div className="auth-wrap"><div className="card auth-card">
    <div className="brand" style={{color:'#111827', margin:'0 0 22px'}}>Lingua<span>Hover</span></div>
    <h1>{register ? 'Fiók létrehozása' : 'Bejelentkezés'}</h1>
    <p className="muted">Angol–magyar és német–magyar tanulás saját szövegekből.</p>
    {error && <div className="error">{error}</div>}
    <form onSubmit={submit}>
      {register && <div className="field"><label>Név</label><input className="input" name="displayName" autoComplete="name" /></div>}
      <div className="field"><label>E-mail</label><input className="input" type="email" name="email" autoComplete="email" required /></div>
      <div className="field"><label>Jelszó</label><input className="input" type="password" name="password" minLength={8} autoComplete={register?'new-password':'current-password'} required /></div>
      <button className="button" disabled={loading} style={{width:'100%'}}>{loading ? 'Betöltés…' : register ? 'Regisztráció' : 'Belépés'}</button>
    </form>
    <p className="muted" style={{marginTop:18}}>{register ? 'Van már fiókod?' : 'Még nincs fiókod?'} <Link href={register?'/login':'/register'} style={{color:'#4f46e5',fontWeight:700}}>{register?'Belépés':'Regisztráció'}</Link></p>
  </div></div>;
}

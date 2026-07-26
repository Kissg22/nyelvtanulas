'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const items = [
  ['/dashboard','Áttekintés'], ['/texts','Szövegek'], ['/import','Import'],
  ['/words','Szavaim'], ['/practice','Gyakorlás'], ['/settings','Beállítások'],
];

export default function Sidebar() {
  const router = useRouter();
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login'); router.refresh();
  }
  return <aside className="sidebar">
    <div className="brand">Lingua<span>Hover</span></div>
    <nav className="nav">{items.map(([href,label]) => <Link key={href} href={href}>{label}</Link>)}</nav>
    <div className="sidebar-bottom"><button className="button secondary" style={{width:'100%'}} onClick={logout}>Kijelentkezés</button></div>
  </aside>;
}

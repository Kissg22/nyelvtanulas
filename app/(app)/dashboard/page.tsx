import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';

export default async function Dashboard(){
  const user = await requireUser();
  const stats = await sql`
    SELECT
      (SELECT count(*)::int FROM texts WHERE user_id=${user.id}) AS texts,
      (SELECT count(*)::int FROM user_words WHERE user_id=${user.id}) AS words,
      (SELECT count(*)::int FROM translations WHERE user_id=${user.id}) AS translations
  `;
  const s = stats[0] as {texts:number;words:number;translations:number};
  return <>
    <div className="page-head"><div><h1>Szia{user.display_name ? `, ${user.display_name}` : ''}!</h1><div className="muted">Olvasás, hallás és szókincs egy helyen.</div></div><Link className="button" href="/import">+ Szöveg importálása</Link></div>
    <div className="grid">
      <div className="card"><div className="muted">Importált szöveg</div><div className="stat">{s.texts}</div></div>
      <div className="card"><div className="muted">Mentett szó</div><div className="stat">{s.words}</div></div>
      <div className="card"><div className="muted">Elmentett fordítás</div><div className="stat">{s.translations}</div></div>
    </div>
    <div className="two-col" style={{marginTop:18}}>
      <div className="card"><h2>Olvass és hallgass</h2><p className="muted">Vidd a kurzort egy mondatra: felolvassa, a magyar fordítás pedig közvetlenül fölötte jelenik meg.</p><Link className="button secondary" href="/texts">Szövegek megnyitása</Link></div>
      <div className="card"><h2>Gyűjts nehéz szavakat</h2><p className="muted">Vidd a kurzort egy szóra és nyomd meg az <b>S</b> billentyűt. Dupla kattintásra csak a szó jelentését és kiejtését kapod.</p><Link className="button secondary" href="/words">Mentett szavak</Link></div>
    </div>
  </>;
}

import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { sql } from '@/lib/db';

export default async function Dashboard(){
  const user = await requireUser();
  const stats = await sql`
    SELECT
      (SELECT count(*)::int FROM texts WHERE user_id=${user.id}) AS texts,
      (SELECT count(*)::int FROM user_words WHERE user_id=${user.id} AND status='learning') AS learning,
      (SELECT count(*)::int FROM user_words WHERE user_id=${user.id} AND status='learning' AND next_review_at<=now()) AS due
  `;
  const s = stats[0] as {texts:number;learning:number;due:number};
  return <>
    <div className="page-head"><div><h1>Szia{user.display_name ? `, ${user.display_name}` : ''}!</h1><div className="muted">Folytasd ott, ahol abbahagytad.</div></div><Link className="button" href="/import">+ Szöveg importálása</Link></div>
    <div className="grid">
      <div className="card"><div className="muted">Importált szöveg</div><div className="stat">{s.texts}</div></div>
      <div className="card"><div className="muted">Tanulandó szó</div><div className="stat">{s.learning}</div></div>
      <div className="card"><div className="muted">Most esedékes</div><div className="stat">{s.due}</div></div>
    </div>
    <div className="two-col" style={{marginTop:18}}>
      <div className="card"><h2>Olvass és hallgass</h2><p className="muted">Nyiss meg egy szöveget. A mondatok fölé húzva hallod a kiejtést és megkapod a magyar fordítást.</p><Link className="button secondary" href="/texts">Szövegek megnyitása</Link></div>
      <div className="card"><h2>Ismételd a nehéz szavakat</h2><p className="muted">Az <b>S</b> billentyűvel elmentett szavak automatikusan bekerülnek a gyakorlásba.</p><Link className="button secondary" href="/practice">Gyakorlás indítása</Link></div>
    </div>
  </>;
}

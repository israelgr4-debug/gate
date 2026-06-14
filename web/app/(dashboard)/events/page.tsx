import { createClient } from '@/lib/supabase/server';
import type { AccessEvent, Decision } from '@/lib/types';

export const dynamic = 'force-dynamic';

const BUCKET = 'plate-snapshots';

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { decision?: string; q?: string; from?: string; to?: string };
}) {
  const supabase = createClient();
  const decisionFilter = (searchParams.decision ?? '').trim() as Decision | '';
  const q = (searchParams.q ?? '').trim();
  const from = (searchParams.from ?? '').trim();
  const to = (searchParams.to ?? '').trim();

  let query = supabase
    .from('access_events')
    .select(
      'id, captured_at, plate_read, plate_display, matched_vehicle_id, decision, reason, confidence, gate_opened, snapshot_path',
    )
    .order('captured_at', { ascending: false })
    .limit(200);

  if (decisionFilter) query = query.eq('decision', decisionFilter);
  if (q) {
    const qDigits = q.replace(/\D+/g, '');
    if (qDigits) query = query.ilike('plate_read', `%${qDigits}%`);
  }
  if (from) query = query.gte('captured_at', `${from}T00:00:00`);
  if (to) query = query.lte('captured_at', `${to}T23:59:59`);

  const { data, error } = await query;
  const events = (data ?? []) as AccessEvent[];

  const withUrls = await Promise.all(
    events.map(async (e) => {
      let url: string | null = null;
      if (e.snapshot_path) {
        const signed = await supabase.storage.from(BUCKET).createSignedUrl(e.snapshot_path, 600);
        url = signed.data?.signedUrl ?? null;
      }
      return { ...e, snapshot_url: url };
    }),
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">יומן מעברים</h1>

      <form action="/events" method="get" className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        <select
          name="decision"
          defaultValue={decisionFilter}
          className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
        >
          <option value="">כל ההחלטות</option>
          <option value="granted">אושרו</option>
          <option value="denied">נדחו</option>
          <option value="unrecognized">לא זוהו</option>
        </select>
        <input
          name="q"
          defaultValue={q}
          placeholder="לוחית"
          className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
        />
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
        />
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
        />
        <button className="rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 font-medium">
          סנן
        </button>
      </form>

      {error && <p className="text-rose-400 text-sm">{error.message}</p>}

      <div className="rounded-2xl overflow-hidden border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-slate-400">
            <tr>
              <th className="text-right px-4 py-3 font-medium">זמן</th>
              <th className="text-right px-4 py-3 font-medium">לוחית</th>
              <th className="text-right px-4 py-3 font-medium">החלטה</th>
              <th className="text-right px-4 py-3 font-medium">סיבה</th>
              <th className="text-right px-4 py-3 font-medium">ביטחון</th>
              <th className="text-right px-4 py-3 font-medium">שער</th>
              <th className="text-right px-4 py-3 font-medium">צילום</th>
            </tr>
          </thead>
          <tbody>
            {withUrls.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-slate-500 py-8">
                  אין רשומות תואמות
                </td>
              </tr>
            )}
            {withUrls.map((e) => (
              <tr key={e.id} className="border-t border-slate-800 hover:bg-slate-900/40">
                <td className="px-4 py-2 text-slate-300 whitespace-nowrap">
                  {new Date(e.captured_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}
                </td>
                <td className="px-4 py-2 font-mono" dir="ltr">
                  {e.plate_display ?? e.plate_read ?? '—'}
                </td>
                <td className="px-4 py-2">
                  <DecisionBadge decision={e.decision} />
                </td>
                <td className="px-4 py-2 text-slate-400">{e.reason ?? '—'}</td>
                <td className="px-4 py-2 text-slate-400" dir="ltr">
                  {e.confidence != null ? e.confidence.toFixed(2) : '—'}
                </td>
                <td className="px-4 py-2">
                  {e.gate_opened ? (
                    <span className="text-emerald-400">נפתח</span>
                  ) : (
                    <span className="text-slate-500">לא</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {e.snapshot_url ? (
                    <a href={e.snapshot_url} target="_blank" rel="noopener" className="text-sky-400 hover:underline">
                      פתיחה
                    </a>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: Decision }) {
  if (decision === 'granted') return <span className="text-emerald-400">אושר</span>;
  if (decision === 'denied') return <span className="text-rose-400">נדחה</span>;
  return <span className="text-amber-400">לא מזוהה</span>;
}

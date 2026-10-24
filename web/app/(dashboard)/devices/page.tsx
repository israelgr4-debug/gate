import { createClient } from '@/lib/supabase/server';
import { manualOpen } from '@/lib/actions/devices';
import type { GateDevice } from '@/lib/types';

export const dynamic = 'force-dynamic';

const OFFLINE_MS = 2 * 60 * 1000;

export default async function DevicesPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('gate_devices')
    .select('*')
    .order('name', { ascending: true });

  const devices = (data ?? []) as GateDevice[];
  const now = Date.now();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">מכשירים</h1>

      {(error || searchParams.error) && (
        <p className="text-rose-400 text-sm">{error?.message ?? searchParams.error}</p>
      )}

      {devices.length === 0 && (
        <p className="text-sm text-slate-500">
          אין מכשירים רשומים. הוסף שורה ב‑<code className="text-slate-300">gate_devices</code> והגדר את ה‑DEVICE_ID בסוכן.
        </p>
      )}

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
        {devices.map((d) => {
          const lastSeenMs = d.last_seen ? new Date(d.last_seen).getTime() : 0;
          const online = lastSeenMs > 0 && now - lastSeenMs < OFFLINE_MS;
          const openBound = manualOpen.bind(null, d.id);
          return (
            <div key={d.id} className="rounded-2xl border border-slate-800 p-5 bg-slate-900/40 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{d.name}</h3>
                  {d.location && <p className="text-sm text-slate-400">{d.location}</p>}
                </div>
                <span
                  className={
                    online
                      ? 'text-xs px-2 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-900'
                      : 'text-xs px-2 py-1 rounded-full bg-rose-950/60 text-rose-300 border border-rose-900'
                  }
                >
                  {online ? 'מחובר' : 'מנותק'}
                </span>
              </div>

              <dl className="text-sm text-slate-400 grid grid-cols-2 gap-y-1">
                <dt>כתובת ממסר</dt>
                <dd dir="ltr" className="font-mono">
                  {d.relay_ip ?? '—'}:{d.relay_port}
                </dd>
                <dt>ערוץ</dt>
                <dd dir="ltr">{d.relay_channel}</dd>
                <dt>ראו לאחרונה</dt>
                <dd>
                  {d.last_seen
                    ? new Date(d.last_seen).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })
                    : 'אף פעם'}
                </dd>
              </dl>

              <form action={openBound}>
                <button
                  disabled={!online}
                  className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 font-medium"
                >
                  פתיחה ידנית
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}

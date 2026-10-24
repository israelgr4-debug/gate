import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VehicleForm } from '@/components/vehicle-form';
import { RulesEditor } from '@/components/rules-editor';
import { updateVehicle, deleteVehicle } from '@/lib/actions/vehicles';
import type { Vehicle, AccessRule, AccessEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function VehicleDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!vehicle) notFound();
  const v = vehicle as Vehicle;

  const [{ data: rulesRaw }, { data: eventsRaw }] = await Promise.all([
    supabase
      .from('access_rules')
      .select('*')
      .eq('vehicle_id', params.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('access_events')
      .select('id, captured_at, decision, reason, gate_opened')
      .eq('matched_vehicle_id', params.id)
      .order('captured_at', { ascending: false })
      .limit(20),
  ]);

  const rules = (rulesRaw ?? []) as AccessRule[];
  const events = (eventsRaw ?? []) as Pick<
    AccessEvent,
    'id' | 'captured_at' | 'decision' | 'reason' | 'gate_opened'
  >[];

  const updateBound = updateVehicle.bind(null, params.id);
  const deleteBound = deleteVehicle.bind(null, params.id);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/vehicles" className="text-sky-400 hover:underline text-sm">
          ← חזרה לרשימה
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-bold">
          {v.owner_name ?? 'רכב'}{' '}
          <span className="font-mono text-slate-400" dir="ltr">
            {v.plate_display ?? v.plate}
          </span>
        </h1>
      </header>

      <section className="rounded-2xl border border-slate-800 p-5 bg-slate-900/40 space-y-4">
        <h2 className="font-semibold">פרטי רכב</h2>
        <VehicleForm
          vehicle={v}
          action={updateBound}
          submitLabel="שמור שינויים"
          error={searchParams.error}
        />
        <form action={deleteBound} className="pt-4 border-t border-slate-800">
          <button className="text-sm px-3 py-1.5 rounded-lg border border-rose-900 text-rose-300 hover:bg-rose-950/40">
            מחק רכב
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">כללי הרשאה</h2>
        <RulesEditor vehicleId={params.id} rules={rules} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">מעברים אחרונים</h2>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">אין מעברים רשומים לרכב זה</p>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 text-slate-400">
                <tr>
                  <th className="text-right px-4 py-2 font-medium">זמן</th>
                  <th className="text-right px-4 py-2 font-medium">החלטה</th>
                  <th className="text-right px-4 py-2 font-medium">סיבה</th>
                  <th className="text-right px-4 py-2 font-medium">שער נפתח</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-t border-slate-800">
                    <td className="px-4 py-2 text-slate-300">
                      {new Date(e.captured_at).toLocaleString('he-IL', {
                        timeZone: 'Asia/Jerusalem',
                      })}
                    </td>
                    <td className="px-4 py-2">
                      <DecisionBadge decision={e.decision} />
                    </td>
                    <td className="px-4 py-2 text-slate-400">{e.reason ?? '—'}</td>
                    <td className="px-4 py-2">
                      {e.gate_opened ? (
                        <span className="text-emerald-400">כן</span>
                      ) : (
                        <span className="text-slate-500">לא</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: AccessEvent['decision'] }) {
  if (decision === 'granted') {
    return <span className="text-emerald-400">אושר</span>;
  }
  if (decision === 'denied') {
    return <span className="text-rose-400">נדחה</span>;
  }
  return <span className="text-amber-400">לא מזוהה</span>;
}

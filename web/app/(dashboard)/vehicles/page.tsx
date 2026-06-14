import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Vehicle } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const q = (searchParams.q ?? '').trim();

  let query = supabase
    .from('vehicles')
    .select('id, plate, plate_display, owner_name, vehicle_type, active, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (q) {
    const qDigits = q.replace(/\D+/g, '');
    if (qDigits) {
      query = query.or(`plate.ilike.%${qDigits}%,owner_name.ilike.%${q}%`);
    } else {
      query = query.ilike('owner_name', `%${q}%`);
    }
  }

  const { data, error } = await query;
  const vehicles = (data ?? []) as Vehicle[];

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">רכבים</h1>
        <Link
          href="/vehicles/new"
          className="rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 font-medium"
        >
          רכב חדש
        </Link>
      </header>

      <form action="/vehicles" method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="חיפוש לוחית או שם"
          className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
        />
        <button className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800">
          חיפוש
        </button>
      </form>

      {error && <p className="text-rose-400 text-sm">{error.message}</p>}

      <div className="rounded-2xl overflow-hidden border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-slate-400">
            <tr>
              <th className="text-right px-4 py-3 font-medium">לוחית</th>
              <th className="text-right px-4 py-3 font-medium">שם / זיהוי</th>
              <th className="text-right px-4 py-3 font-medium">סוג</th>
              <th className="text-right px-4 py-3 font-medium">מצב</th>
              <th className="text-right px-4 py-3 font-medium">עדכון</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-slate-500 py-8">
                  אין רכבים להצגה
                </td>
              </tr>
            )}
            {vehicles.map((v) => (
              <tr key={v.id} className="border-t border-slate-800 hover:bg-slate-900/40">
                <td className="px-4 py-3 font-mono" dir="ltr">
                  <Link href={`/vehicles/${v.id}`} className="text-sky-400 hover:underline">
                    {v.plate_display ?? v.plate}
                  </Link>
                </td>
                <td className="px-4 py-3">{v.owner_name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400">{vehicleTypeLabel(v.vehicle_type)}</td>
                <td className="px-4 py-3">
                  {v.active ? (
                    <span className="text-emerald-400">פעיל</span>
                  ) : (
                    <span className="text-slate-500">לא פעיל</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {new Date(v.updated_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function vehicleTypeLabel(t: Vehicle['vehicle_type']): string {
  return t === 'car' ? 'פרטי' : t === 'truck' ? 'משאית' : 'אחר';
}

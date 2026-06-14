import { createVehicle } from '@/lib/actions/vehicles';
import { VehicleForm } from '@/components/vehicle-form';
import Link from 'next/link';

export default function NewVehiclePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/vehicles" className="text-sky-400 hover:underline text-sm">
          ← חזרה לרשימה
        </Link>
      </div>
      <h1 className="text-2xl font-bold">רכב חדש</h1>
      <VehicleForm action={createVehicle} submitLabel="הוסף רכב" error={searchParams.error} />
    </div>
  );
}

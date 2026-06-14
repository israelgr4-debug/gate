import type { Vehicle } from '@/lib/types';

interface Props {
  vehicle?: Vehicle;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  error?: string;
}

export function VehicleForm({ vehicle, action, submitLabel, error }: Props) {
  return (
    <form action={action} className="space-y-5 max-w-lg">
      <Field
        label="לוחית רישוי"
        name="plate"
        defaultValue={vehicle?.plate_display ?? vehicle?.plate ?? ''}
        placeholder="12-345-67 או 123-45-678"
        dir="ltr"
        required
      />
      <Field
        label="שם / זיהוי"
        name="owner_name"
        defaultValue={vehicle?.owner_name ?? ''}
        placeholder="לדוגמה: רכב של דני"
      />
      <div>
        <label className="block text-sm mb-1">סוג רכב</label>
        <select
          name="vehicle_type"
          defaultValue={vehicle?.vehicle_type ?? 'car'}
          className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
        >
          <option value="car">פרטי</option>
          <option value="truck">משאית</option>
          <option value="other">אחר</option>
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">הערות</label>
        <textarea
          name="notes"
          defaultValue={vehicle?.notes ?? ''}
          rows={3}
          className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
        />
      </div>
      {vehicle && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="active"
            defaultChecked={vehicle.active}
            className="w-4 h-4"
          />
          <span>פעיל</span>
        </label>
      )}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 font-medium"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  dir,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  dir?: 'ltr' | 'rtl';
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm mb-1" htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        dir={dir}
        required={required}
        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 focus:outline-none focus:border-sky-500"
      />
    </div>
  );
}

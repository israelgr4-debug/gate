import Link from 'next/link';
import { signOut } from '@/lib/actions/auth';

const items = [
  { href: '/vehicles', label: 'רכבים' },
  { href: '/events', label: 'יומן מעברים' },
  { href: '/devices', label: 'מכשירים' },
];

export function Nav({ email }: { email: string | null }) {
  return (
    <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg">בקרת כניסה</span>
          <div className="flex items-center gap-1 text-sm">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className="px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                {it.label}
              </Link>
            ))}
          </div>
        </div>
        <form action={signOut} className="flex items-center gap-3">
          {email && <span className="text-sm text-slate-400" dir="ltr">{email}</span>}
          <button className="text-sm px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800">
            יציאה
          </button>
        </form>
      </div>
    </nav>
  );
}

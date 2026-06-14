import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function signIn(formData: FormData) {
  'use server';
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect('/vehicles');
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-center mb-6">בקרת כניסה</h1>
        <form action={signIn} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="email">דוא"ל</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              dir="ltr"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="password">סיסמה</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 focus:outline-none focus:border-sky-500"
            />
          </div>
          {searchParams.error && (
            <p className="text-sm text-rose-400">{searchParams.error}</p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 py-2 font-medium transition"
          >
            כניסה
          </button>
        </form>
      </div>
    </main>
  );
}

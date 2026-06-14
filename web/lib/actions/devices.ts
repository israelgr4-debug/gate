'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function manualOpen(deviceId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('manual_actions').insert({
    device_id: deviceId,
    user_id: user?.id ?? null,
    action: 'manual_open',
  });
  if (error) {
    redirect(`/devices?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath('/devices');
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { RuleType } from '@/lib/types';

const RULE_TYPES: RuleType[] = ['always', 'weekly', 'date_range', 'one_time'];

function parseRuleType(raw: FormDataEntryValue | null): RuleType {
  const v = String(raw ?? 'always');
  return (RULE_TYPES as string[]).includes(v) ? (v as RuleType) : 'always';
}

function emptyOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim();
  return s.length === 0 ? null : s;
}

function daysFromForm(formData: FormData): number[] {
  const days: number[] = [];
  for (let i = 0; i < 7; i++) {
    if (formData.get(`day_${i}`) === 'on') days.push(i);
  }
  return days;
}

export async function createRule(vehicleId: string, formData: FormData) {
  const supabase = createClient();
  const rule_type = parseRuleType(formData.get('rule_type'));
  const days_of_week = rule_type === 'weekly' ? daysFromForm(formData) : [];
  const time_from = emptyOrNull(formData.get('time_from'));
  const time_to = emptyOrNull(formData.get('time_to'));
  const valid_from = emptyOrNull(formData.get('valid_from'));
  const valid_to = emptyOrNull(formData.get('valid_to'));

  if (rule_type === 'weekly' && days_of_week.length === 0) {
    redirect(`/vehicles/${vehicleId}?error=${encodeURIComponent('בחר לפחות יום אחד')}`);
  }
  if (rule_type === 'one_time' && !valid_from) {
    redirect(`/vehicles/${vehicleId}?error=${encodeURIComponent('בחר תאריך לחד-פעמי')}`);
  }

  const { error } = await supabase.from('access_rules').insert({
    vehicle_id: vehicleId,
    rule_type,
    days_of_week,
    time_from,
    time_to,
    valid_from,
    valid_to,
    active: true,
  });

  if (error) {
    redirect(`/vehicles/${vehicleId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/vehicles/${vehicleId}`);
  redirect(`/vehicles/${vehicleId}`);
}

export async function toggleRule(vehicleId: string, ruleId: string, active: boolean) {
  const supabase = createClient();
  await supabase.from('access_rules').update({ active }).eq('id', ruleId);
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function deleteRule(vehicleId: string, ruleId: string) {
  const supabase = createClient();
  await supabase.from('access_rules').delete().eq('id', ruleId);
  revalidatePath(`/vehicles/${vehicleId}`);
}

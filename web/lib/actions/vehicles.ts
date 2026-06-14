'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizePlate, displayPlate } from '@/lib/plate';
import type { VehicleType } from '@/lib/types';

const VEHICLE_TYPES: VehicleType[] = ['car', 'truck', 'other'];

function parseVehicleType(raw: FormDataEntryValue | null): VehicleType {
  const v = String(raw ?? 'car');
  return (VEHICLE_TYPES as string[]).includes(v) ? (v as VehicleType) : 'car';
}

export async function createVehicle(formData: FormData) {
  const supabase = createClient();
  const plate = normalizePlate(String(formData.get('plate') ?? ''));
  if (!plate) {
    redirect(`/vehicles/new?error=${encodeURIComponent('לוחית לא תקינה — נדרשות 7–8 ספרות')}`);
  }
  const owner_name = String(formData.get('owner_name') ?? '').trim() || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;
  const vehicle_type = parseVehicleType(formData.get('vehicle_type'));

  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      plate,
      plate_display: displayPlate(plate),
      owner_name,
      notes,
      vehicle_type,
      active: true,
    })
    .select('id')
    .single();

  if (error) {
    redirect(`/vehicles/new?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath('/vehicles');
  redirect(`/vehicles/${data.id}`);
}

export async function updateVehicle(id: string, formData: FormData) {
  const supabase = createClient();
  const plate = normalizePlate(String(formData.get('plate') ?? ''));
  if (!plate) {
    redirect(`/vehicles/${id}?error=${encodeURIComponent('לוחית לא תקינה')}`);
  }
  const owner_name = String(formData.get('owner_name') ?? '').trim() || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;
  const vehicle_type = parseVehicleType(formData.get('vehicle_type'));
  const active = formData.get('active') === 'on';

  const { error } = await supabase
    .from('vehicles')
    .update({
      plate,
      plate_display: displayPlate(plate),
      owner_name,
      notes,
      vehicle_type,
      active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    redirect(`/vehicles/${id}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath('/vehicles');
  revalidatePath(`/vehicles/${id}`);
  redirect(`/vehicles/${id}`);
}

export async function deleteVehicle(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) {
    redirect(`/vehicles/${id}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath('/vehicles');
  redirect('/vehicles');
}

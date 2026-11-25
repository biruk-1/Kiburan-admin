'use server';

import { revalidatePath } from 'next/cache';

import { writeAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

const WEDDING_STATUSES = ['planning', 'completed', 'cancelled', 'archived'] as const;

async function loadWedding(id: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from('weddings').select('*').eq('id', id).single();
  if (error || !data) throw new Error(error?.message ?? 'Wedding not found');
  return data;
}

function revalidateWedding(id: string) {
  revalidatePath('/weddings');
  revalidatePath(`/weddings/${id}`);
}

export async function updateWedding(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('weddingId') ?? '');
  if (!id) throw new Error('Missing wedding id');

  const before = await loadWedding(id);
  const status = String(formData.get('status') ?? before.status);
  if (!WEDDING_STATUSES.includes(status as (typeof WEDDING_STATUSES)[number])) {
    throw new Error('Invalid wedding status');
  }

  const weddingDateRaw = String(formData.get('weddingDate') ?? '').trim();
  const payload = {
    title: String(formData.get('title') ?? before.title),
    city: String(formData.get('city') ?? '').trim() || null,
    status,
    wedding_date: weddingDateRaw || null,
    updated_at: new Date().toISOString(),
  };

  const admin = createAdminClient();
  const { data, error } = await admin.from('weddings').update(payload).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'wedding.update',
    entityType: 'wedding',
    entityId: id,
    before,
    after: data,
  });
  revalidateWedding(id);
}

export async function transferWeddingOwnership(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('weddingId') ?? '');
  const newOwnerId = String(formData.get('newOwnerId') ?? '').trim();
  if (!id || !newOwnerId) throw new Error('Wedding id and new owner user id are required');

  const before = await loadWedding(id);
  const admin = createAdminClient();

  const { data: newProfile } = await admin.from('profiles').select('id').eq('id', newOwnerId).maybeSingle();
  if (!newProfile) throw new Error('New owner profile not found');

  const { data, error } = await admin
    .from('weddings')
    .update({ created_by: newOwnerId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  const now = new Date().toISOString();
  await admin.from('wedding_members').upsert(
    { wedding_id: id, user_id: newOwnerId, role: 'owner', joined_at: now, updated_at: now },
    { onConflict: 'wedding_id,user_id' },
  );

  if (before.created_by !== newOwnerId) {
    await admin
      .from('wedding_members')
      .update({ role: 'partner', updated_at: now })
      .eq('wedding_id', id)
      .eq('user_id', before.created_by)
      .eq('role', 'owner');
  }

  await writeAudit({
    adminId: ctx.userId,
    action: 'wedding.transfer_ownership',
    entityType: 'wedding',
    entityId: id,
    before,
    after: data,
    reason: newOwnerId,
  });
  revalidateWedding(id);
}

export async function deleteWedding(formData: FormData) {
  const ctx = await requireAdmin('super_admin');
  const id = String(formData.get('weddingId') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (!id) throw new Error('Missing wedding id');
  if (confirm !== 'DELETE') throw new Error('Type DELETE to confirm');

  const before = await loadWedding(id);
  const admin = createAdminClient();
  const { error } = await admin.from('weddings').delete().eq('id', id);
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'wedding.delete',
    entityType: 'wedding',
    entityId: id,
    before,
    after: null,
  });
  revalidatePath('/weddings');
}
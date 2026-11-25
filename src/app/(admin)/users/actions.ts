'use server';

import { revalidatePath } from 'next/cache';

import { writeAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

async function loadProfile(id: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from('profiles').select('*').eq('id', id).single();
  if (error || !data) throw new Error(error?.message ?? 'Profile not found');
  return data;
}

function revalidateUser(id: string) {
  revalidatePath('/users');
  revalidatePath(`/users/${id}`);
}

export async function updateUserProfile(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('userId') ?? '');
  if (!id) throw new Error('Missing user id');

  const before = await loadProfile(id);
  const payload = {
    display_name: String(formData.get('displayName') ?? before.display_name),
    phone: String(formData.get('phone') ?? '').trim() || null,
    updated_at: new Date().toISOString(),
  };

  const admin = createAdminClient();
  const { data, error } = await admin.from('profiles').update(payload).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'user.update_profile',
    entityType: 'profile',
    entityId: id,
    before,
    after: data,
  });
  revalidateUser(id);
}

export async function banUser(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('userId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!id) throw new Error('Missing user id');

  const before = await loadProfile(id);
  const admin = createAdminClient();

  const { error: authError } = await admin.auth.admin.updateUserById(id, { ban_duration: '876000h' });
  if (authError) throw new Error(authError.message);

  const { data, error } = await admin
    .from('profiles')
    .update({ is_banned: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'user.ban',
    entityType: 'profile',
    entityId: id,
    before,
    after: data,
    reason: reason || null,
  });
  revalidateUser(id);
}

export async function unbanUser(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('userId') ?? '');
  if (!id) throw new Error('Missing user id');

  const before = await loadProfile(id);
  const admin = createAdminClient();

  const { error: authError } = await admin.auth.admin.updateUserById(id, { ban_duration: 'none' });
  if (authError) throw new Error(authError.message);

  const { data, error } = await admin
    .from('profiles')
    .update({ is_banned: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'user.unban',
    entityType: 'profile',
    entityId: id,
    before,
    after: data,
  });
  revalidateUser(id);
}

export async function sendPasswordReset(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const email = String(formData.get('email') ?? '').trim();
  const id = String(formData.get('userId') ?? '');
  if (!email) throw new Error('Email is required');

  const admin = createAdminClient();
  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify`
      : undefined,
  });
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'user.password_reset',
    entityType: 'profile',
    entityId: id || null,
    reason: email,
  });
  if (id) revalidateUser(id);
}

export async function deleteUser(formData: FormData) {
  const ctx = await requireAdmin('super_admin');
  const id = String(formData.get('userId') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (!id) throw new Error('Missing user id');
  if (confirm !== 'DELETE') throw new Error('Type DELETE to confirm');

  const before = await loadProfile(id);
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'user.delete',
    entityType: 'profile',
    entityId: id,
    before,
    after: null,
  });
  revalidatePath('/users');
}
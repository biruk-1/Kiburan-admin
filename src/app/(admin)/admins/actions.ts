'use server';

import { revalidatePath } from 'next/cache';

import { writeAudit } from '@/lib/audit';
import { isAdminRole } from '@/lib/auth/roles';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

function revalidateAdmins() {
  revalidatePath('/admins');
}

async function resolveUserId(formData: FormData): Promise<string> {
  const userId = String(formData.get('userId') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (userId) return userId;
  if (!email) throw new Error('Provide user id or email');

  const admin = createAdminClient();
  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  throw new Error('No auth user found for that email');
}

export async function addPlatformAdmin(formData: FormData) {
  const ctx = await requireAdmin('super_admin');
  const roleRaw = String(formData.get('role') ?? 'admin');
  if (!isAdminRole(roleRaw)) throw new Error('Invalid role');

  const userId = await resolveUserId(formData);
  const admin = createAdminClient();

  const { data: before } = await admin.from('platform_admins').select('*').eq('user_id', userId).maybeSingle();

  const { data, error } = await admin
    .from('platform_admins')
    .upsert({ user_id: userId, role: roleRaw, created_by: ctx.userId }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: before ? 'admin.update_role' : 'admin.add',
    entityType: 'platform_admin',
    entityId: userId,
    before,
    after: data,
  });
  revalidateAdmins();
}

export async function changeAdminRole(formData: FormData) {
  const ctx = await requireAdmin('super_admin');
  const userId = String(formData.get('userId') ?? '');
  const roleRaw = String(formData.get('role') ?? '');
  if (!userId || !isAdminRole(roleRaw)) throw new Error('Invalid input');

  const admin = createAdminClient();
  const { data: before, error: loadError } = await admin.from('platform_admins').select('*').eq('user_id', userId).single();
  if (loadError || !before) throw new Error(loadError?.message ?? 'Admin not found');

  const { data, error } = await admin.from('platform_admins').update({ role: roleRaw }).eq('user_id', userId).select('*').single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'admin.change_role',
    entityType: 'platform_admin',
    entityId: userId,
    before,
    after: data,
  });
  revalidateAdmins();
}

export async function removePlatformAdmin(formData: FormData) {
  const ctx = await requireAdmin('super_admin');
  const userId = String(formData.get('userId') ?? '');
  if (!userId) throw new Error('Missing user id');
  if (userId === ctx.userId) throw new Error('You cannot remove yourself');

  const admin = createAdminClient();
  const { data: before, error: loadError } = await admin.from('platform_admins').select('*').eq('user_id', userId).single();
  if (loadError || !before) throw new Error(loadError?.message ?? 'Admin not found');

  const { error } = await admin.from('platform_admins').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'admin.remove',
    entityType: 'platform_admin',
    entityId: userId,
    before,
    after: null,
  });
  revalidateAdmins();
}
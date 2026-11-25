'use server';

import { revalidatePath } from 'next/cache';

import { writeAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

async function loadReview(id: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from('vendor_reviews').select('*').eq('id', id).single();
  if (error || !data) throw new Error(error?.message ?? 'Review not found');
  return data;
}

function revalidateReviews() {
  revalidatePath('/reviews');
  revalidatePath('/dashboard');
}

export async function publishReview(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('reviewId') ?? '');
  if (!id) throw new Error('Missing review id');

  const before = await loadReview(id);
  const admin = createAdminClient();
  const { data, error } = await admin.from('vendor_reviews').update({ status: 'published' }).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'review.publish',
    entityType: 'vendor_review',
    entityId: id,
    before,
    after: data,
  });
  revalidateReviews();
}

export async function hideReview(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('reviewId') ?? '');
  if (!id) throw new Error('Missing review id');

  const before = await loadReview(id);
  const admin = createAdminClient();
  const { data, error } = await admin.from('vendor_reviews').update({ status: 'hidden' }).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'review.hide',
    entityType: 'vendor_review',
    entityId: id,
    before,
    after: data,
  });
  revalidateReviews();
}

export async function deleteReview(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('reviewId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!id) throw new Error('Missing review id');

  const before = await loadReview(id);
  const admin = createAdminClient();
  const { error } = await admin.from('vendor_reviews').delete().eq('id', id);
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'review.delete',
    entityType: 'vendor_review',
    entityId: id,
    before,
    after: null,
    reason: reason || null,
  });
  revalidateReviews();
}
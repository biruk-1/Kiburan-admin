'use server';

import { revalidatePath } from 'next/cache';

import { writeAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

const PAYMENT_STATUSES = ['pending', 'success', 'failed', 'cancelled'] as const;

async function loadPayment(id: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from('booking_payments').select('*').eq('id', id).single();
  if (error || !data) throw new Error(error?.message ?? 'Payment not found');
  return data;
}

function revalidatePayments() {
  revalidatePath('/payments');
  revalidatePath('/dashboard');
}

export async function setPaymentStatus(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('paymentId') ?? '');
  const status = String(formData.get('status') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!id) throw new Error('Missing payment id');
  if (!PAYMENT_STATUSES.includes(status as (typeof PAYMENT_STATUSES)[number])) throw new Error('Invalid status');

  const before = await loadPayment(id);
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'success') patch.verified_at = new Date().toISOString();

  const { data, error } = await admin.from('booking_payments').update(patch).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'payment.set_status',
    entityType: 'booking_payment',
    entityId: id,
    before,
    after: data,
    reason: reason || null,
  });
  revalidatePayments();
}

export async function reverifyChapaPayment(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('paymentId') ?? '');
  if (!id) throw new Error('Missing payment id');

  const secret = process.env.CHAPA_SECRET_KEY;
  if (!secret) throw new Error('CHAPA_SECRET_KEY is not configured');

  const before = await loadPayment(id);
  const res = await fetch(`https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(before.tx_ref)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
  });
  const verifyJson = (await res.json().catch(() => ({}))) as {
    data?: { status?: string; reference?: string; amount?: number };
    message?: string;
  };

  if (!res.ok) {
    throw new Error(verifyJson.message ?? `Chapa verify failed (${res.status})`);
  }

  const chapaStatus = String(verifyJson.data?.status ?? '').toLowerCase();
  let status: (typeof PAYMENT_STATUSES)[number] = 'pending';
  if (chapaStatus === 'success') status = 'success';
  else if (chapaStatus === 'cancelled') status = 'cancelled';
  else if (chapaStatus === 'failed') status = 'failed';
  else status = 'failed';

  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    status,
    raw_verify: verifyJson,
    chapa_ref: verifyJson.data?.reference ?? before.chapa_ref,
    updated_at: new Date().toISOString(),
  };
  if (status === 'success') patch.verified_at = new Date().toISOString();

  const { data, error } = await admin.from('booking_payments').update(patch).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'payment.chapa_reverify',
    entityType: 'booking_payment',
    entityId: id,
    before,
    after: data,
    reason: chapaStatus || null,
  });
  revalidatePayments();
}
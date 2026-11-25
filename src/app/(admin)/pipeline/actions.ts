'use server';

import { revalidatePath } from 'next/cache';

import { writeAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

const INQUIRY_STATUSES = ['new', 'replied', 'quoted', 'accepted', 'declined', 'closed'] as const;
const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const;
const BOOKING_STATUSES = ['pending', 'confirmed', 'fulfilled', 'cancelled'] as const;

function revalidatePipeline() {
  revalidatePath('/pipeline');
}

async function loadRow(table: 'vendor_inquiries' | 'vendor_quotes' | 'vendor_bookings', id: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from(table).select('*').eq('id', id).single();
  if (error || !data) throw new Error(error?.message ?? 'Record not found');
  return data;
}

export async function updateInquiryStatus(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id) throw new Error('Missing id');
  if (!INQUIRY_STATUSES.includes(status as (typeof INQUIRY_STATUSES)[number])) throw new Error('Invalid status');

  const before = await loadRow('vendor_inquiries', id);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('vendor_inquiries')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'inquiry.update_status',
    entityType: 'vendor_inquiry',
    entityId: id,
    before,
    after: data,
  });
  revalidatePipeline();
}

export async function updateQuoteStatus(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id) throw new Error('Missing id');
  if (!QUOTE_STATUSES.includes(status as (typeof QUOTE_STATUSES)[number])) throw new Error('Invalid status');

  const before = await loadRow('vendor_quotes', id);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('vendor_quotes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'quote.update_status',
    entityType: 'vendor_quote',
    entityId: id,
    before,
    after: data,
  });
  revalidatePipeline();
}

export async function updateBookingStatus(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id) throw new Error('Missing id');
  if (!BOOKING_STATUSES.includes(status as (typeof BOOKING_STATUSES)[number])) throw new Error('Invalid status');

  const before = await loadRow('vendor_bookings', id);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('vendor_bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'booking.update_status',
    entityType: 'vendor_booking',
    entityId: id,
    before,
    after: data,
  });
  revalidatePipeline();
}
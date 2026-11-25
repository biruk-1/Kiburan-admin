'use server';

import { revalidatePath } from 'next/cache';

import { writeAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

async function loadVendor(id: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from('vendors').select('*').eq('id', id).single();
  if (error || !data) throw new Error(error?.message ?? 'Vendor not found');
  return data;
}

function revalidateVendor(id: string) {
  revalidatePath('/vendors');
  revalidatePath('/vendors/queue');
  revalidatePath(`/vendors/${id}`);
  revalidatePath('/dashboard');
}

export async function approveVendor(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('vendorId') ?? '');
  const publish = formData.get('publish') === 'on' || formData.get('publish') === 'true';
  if (!id) throw new Error('Missing vendor id');

  const before = await loadVendor(id);
  const admin = createAdminClient();
  const afterPayload = {
    verification_status: 'verified',
    rejection_reason: null,
    verified_at: new Date().toISOString(),
    verified_by: ctx.userId,
    listing_status: publish ? 'published' : before.listing_status === 'suspended' ? 'draft' : before.listing_status,
    suspended_reason: publish ? null : before.suspended_reason,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin.from('vendors').update(afterPayload).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: publish ? 'vendor.approve_and_publish' : 'vendor.approve',
    entityType: 'vendor',
    entityId: id,
    before,
    after: data,
  });
  revalidateVendor(id);
}

export async function rejectVendor(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('vendorId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!id) throw new Error('Missing vendor id');
  if (!reason) throw new Error('Rejection reason is required');

  const before = await loadVendor(id);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('vendors')
    .update({
      verification_status: 'rejected',
      rejection_reason: reason,
      listing_status: before.listing_status === 'published' ? 'draft' : before.listing_status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'vendor.reject',
    entityType: 'vendor',
    entityId: id,
    before,
    after: data,
    reason,
  });
  revalidateVendor(id);
}

export async function suspendVendor(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('vendorId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!id) throw new Error('Missing vendor id');
  if (!reason) throw new Error('Suspension reason is required');

  const before = await loadVendor(id);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('vendors')
    .update({
      listing_status: 'suspended',
      suspended_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'vendor.suspend',
    entityType: 'vendor',
    entityId: id,
    before,
    after: data,
    reason,
  });
  revalidateVendor(id);
}

export async function unsuspendVendor(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('vendorId') ?? '');
  if (!id) throw new Error('Missing vendor id');

  const before = await loadVendor(id);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('vendors')
    .update({
      listing_status: before.verification_status === 'verified' ? 'published' : 'draft',
      suspended_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'vendor.unsuspend',
    entityType: 'vendor',
    entityId: id,
    before,
    after: data,
  });
  revalidateVendor(id);
}

export async function setVendorListing(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('vendorId') ?? '');
  const listing = String(formData.get('listingStatus') ?? '');
  if (!id || !['draft', 'published'].includes(listing)) throw new Error('Invalid listing status');

  const before = await loadVendor(id);
  if (before.listing_status === 'suspended') throw new Error('Unsuspend before changing listing status');
  if (listing === 'published' && before.verification_status !== 'verified') {
    throw new Error('Only verified vendors can be published');
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('vendors')
    .update({ listing_status: listing, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: listing === 'published' ? 'vendor.publish' : 'vendor.unpublish',
    entityType: 'vendor',
    entityId: id,
    before,
    after: data,
  });
  revalidateVendor(id);
}

export async function updateVendorProfile(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('vendorId') ?? '');
  if (!id) throw new Error('Missing vendor id');

  const before = await loadVendor(id);
  const payload = {
    business_name: String(formData.get('businessName') ?? before.business_name),
    description: String(formData.get('description') ?? '') || null,
    city: String(formData.get('city') ?? '') || null,
    phone: String(formData.get('phone') ?? '') || null,
    email: String(formData.get('email') ?? '') || null,
    website_url: String(formData.get('websiteUrl') ?? '') || null,
    address: String(formData.get('address') ?? '') || null,
    updated_at: new Date().toISOString(),
  };

  const admin = createAdminClient();
  const { data, error } = await admin.from('vendors').update(payload).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'vendor.update_profile',
    entityType: 'vendor',
    entityId: id,
    before,
    after: data,
  });
  revalidateVendor(id);
}

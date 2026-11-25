'use server';

import { revalidatePath } from 'next/cache';

import { writeAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

function revalidateCatalog() {
  revalidatePath('/catalog');
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function createVendorCategory(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const nameEn = String(formData.get('nameEn') ?? '').trim();
  const nameAm = String(formData.get('nameAm') ?? '').trim() || null;
  const slug = String(formData.get('slug') ?? '').trim() || slugify(nameEn);
  if (!nameEn || !slug) throw new Error('English name and slug are required');

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('vendor_categories')
    .insert({ name_en: nameEn, name_am: nameAm, slug })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'catalog.vendor_category.create',
    entityType: 'vendor_category',
    entityId: data.id,
    after: data,
  });
  revalidateCatalog();
}

export async function createBudgetCategory(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const nameEn = String(formData.get('nameEn') ?? '').trim();
  const nameAm = String(formData.get('nameAm') ?? '').trim() || null;
  const slug = String(formData.get('slug') ?? '').trim() || slugify(nameEn);
  if (!nameEn || !slug) throw new Error('English name and slug are required');

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('budget_categories')
    .insert({ name_en: nameEn, name_am: nameAm, slug })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'catalog.budget_category.create',
    entityType: 'budget_category',
    entityId: data.id,
    after: data,
  });
  revalidateCatalog();
}

export async function createTaskCategory(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const nameEn = String(formData.get('nameEn') ?? '').trim();
  const nameAm = String(formData.get('nameAm') ?? '').trim() || null;
  const slug = String(formData.get('slug') ?? '').trim() || slugify(nameEn);
  const icon = String(formData.get('icon') ?? '').trim() || null;
  if (!nameEn || !slug) throw new Error('English name and slug are required');

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('task_categories')
    .insert({ name_en: nameEn, name_am: nameAm, slug, icon, is_active: true })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'catalog.task_category.create',
    entityType: 'task_category',
    entityId: data.id,
    after: data,
  });
  revalidateCatalog();
}

export async function toggleTaskCategory(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Missing id');

  const admin = createAdminClient();
  const { data: before, error: loadError } = await admin.from('task_categories').select('*').eq('id', id).single();
  if (loadError || !before) throw new Error(loadError?.message ?? 'Not found');

  const { data, error } = await admin
    .from('task_categories')
    .update({ is_active: !before.is_active })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'catalog.task_category.toggle',
    entityType: 'task_category',
    entityId: id,
    before,
    after: data,
  });
  revalidateCatalog();
}

export async function createChecklistTemplate(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const categoryId = String(formData.get('categoryId') ?? '');
  const titleEn = String(formData.get('titleEn') ?? '').trim();
  const titleAm = String(formData.get('titleAm') ?? '').trim() || null;
  const descriptionEn = String(formData.get('descriptionEn') ?? '').trim() || null;
  const sortOrder = Number(formData.get('sortOrder') ?? 0);
  if (!categoryId || !titleEn) throw new Error('Category and English title are required');

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('checklist_templates')
    .insert({
      category_id: categoryId,
      title_en: titleEn,
      title_am: titleAm,
      description_en: descriptionEn,
      is_active: true,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'catalog.checklist_template.create',
    entityType: 'checklist_template',
    entityId: data.id,
    after: data,
  });
  revalidateCatalog();
}

export async function toggleChecklistTemplate(formData: FormData) {
  const ctx = await requireAdmin('admin');
  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Missing id');

  const admin = createAdminClient();
  const { data: before, error: loadError } = await admin.from('checklist_templates').select('*').eq('id', id).single();
  if (loadError || !before) throw new Error(loadError?.message ?? 'Not found');

  const { data, error } = await admin
    .from('checklist_templates')
    .update({ is_active: !before.is_active })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await writeAudit({
    adminId: ctx.userId,
    action: 'catalog.checklist_template.toggle',
    entityType: 'checklist_template',
    entityId: id,
    before,
    after: data,
  });
  revalidateCatalog();
}
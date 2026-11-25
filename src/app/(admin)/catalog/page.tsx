import {
  createBudgetCategory,
  createChecklistTemplate,
  createTaskCategory,
  createVendorCategory,
  toggleChecklistTemplate,
  toggleTaskCategory,
} from '@/app/(admin)/catalog/actions';
import { Badge, Button, Card, Input, Label, PageHeader, Select, Table, Td, Textarea, Th } from '@/components/ui';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function CatalogPage() {
  const ctx = await requireAdmin('support');
  const admin = createAdminClient();
  const canWrite = ctx.role === 'admin' || ctx.role === 'super_admin';

  const [vendorCategories, budgetCategories, taskCategories, checklistTemplates] = await Promise.all([
    admin.from('vendor_categories').select('*').order('name_en'),
    admin.from('budget_categories').select('*').order('name_en'),
    admin.from('task_categories').select('*').order('sort_order'),
    admin
      .from('checklist_templates')
      .select('*, task_categories:task_categories(name_en)')
      .order('sort_order')
      .limit(200),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Catalog" description="Reference data for vendors, budgets, tasks, and checklist templates." />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Vendor categories</h2>
        {canWrite ? (
          <Card>
            <form action={createVendorCategory} className="grid gap-2 md:grid-cols-4">
              <div>
                <Label>Name (EN)</Label>
                <Input name="nameEn" required />
              </div>
              <div>
                <Label>Name (AM)</Label>
                <Input name="nameAm" />
              </div>
              <div>
                <Label>Slug</Label>
                <Input name="slug" placeholder="auto from name" />
              </div>
              <ChatCreateButton />
            </form>
          </Card>
        ) : null}
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Slug</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(vendorCategories.data ?? []).map((c) => (
              <tr key={c.id}>
                <Td>
                  {c.name_en}
                  {c.name_am ? <span className="text-zinc-500"> / {c.name_am}</span> : null}
                </Td>
                <Td>{c.slug}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Budget categories</h2>
        {canWrite ? (
          <Card>
            <form action={createBudgetCategory} className="grid gap-2 md:grid-cols-4">
              <div>
                <Label>Name (EN)</Label>
                <Input name="nameEn" required />
              </div>
              <div>
                <Label>Name (AM)</Label>
                <Input name="nameAm" />
              </div>
              <div>
                <Label>Slug</Label>
                <Input name="slug" />
              </div>
              <ChatCreateButton />
            </form>
          </Card>
        ) : null}
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Slug</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(budgetCategories.data ?? []).map((c) => (
              <tr key={c.id}>
                <Td>{c.name_en}</Td>
                <Td>{c.slug}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Task categories</h2>
        {canWrite ? (
          <Card>
            <form action={createTaskCategory} className="grid gap-2 md:grid-cols-5">
              <div>
                <Label>Name (EN)</Label>
                <Input name="nameEn" required />
              </div>
              <div>
                <Label>Name (AM)</Label>
                <Input name="nameAm" />
              </div>
              <div>
                <Label>Slug</Label>
                <Input name="slug" />
              </div>
              <div>
                <Label>Icon</Label>
                <Input name="icon" />
              </div>
              <ChatCreateButton />
            </form>
          </Card>
        ) : null}
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Slug</Th>
              <Th>Active</Th>
              {canWrite ? <Th>Toggle</Th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(taskCategories.data ?? []).map((c) => (
              <tr key={c.id}>
                <Td>{c.name_en}</Td>
                <Td>{c.slug}</Td>
                <Td>{c.is_active ? <Badge tone="success">active</Badge> : <Badge>inactive</Badge>}</Td>
                {canWrite ? (
                  <Td>
                    <form action={toggleTaskCategory}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
                        Toggle
                      </Button>
                    </form>
                  </Td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Checklist templates</h2>
        {canWrite ? (
          <Card>
            <form action={createChecklistTemplate} className="grid gap-2 md:grid-cols-2">
              <div>
                <Label>Task category</Label>
                <Select name="categoryId" required>
                  <option value="">Select category</option>
                  {(taskCategories.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_en}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Sort order</Label>
                <Input name="sortOrder" type="number" defaultValue={0} />
              </div>
              <div>
                <Label>Title (EN)</Label>
                <Input name="titleEn" required />
              </div>
              <div>
                <Label>Title (AM)</Label>
                <Input name="titleAm" />
              </div>
              <div className="md:col-span-2">
                <Label>Description (EN)</Label>
                <Textarea name="descriptionEn" rows={2} />
              </div>
              <ChatCreateButton />
            </form>
          </Card>
        ) : null}
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>Category</Th>
              <Th>Active</Th>
              {canWrite ? <Th>Toggle</Th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(checklistTemplates.data ?? []).map((t) => {
              const cat = Array.isArray(t.task_categories) ? t.task_categories[0] : t.task_categories;
              return (
                <tr key={t.id}>
                  <Td>{t.title_en}</Td>
                  <Td>{cat?.name_en ?? t.category_id}</Td>
                  <Td>{t.is_active ? <Badge tone="success">active</Badge> : <Badge>inactive</Badge>}</Td>
                  {canWrite ? (
                    <Td>
                      <form action={toggleChecklistTemplate}>
                        <input type="hidden" name="id" value={t.id} />
                        <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
                          Toggle
                        </Button>
                      </form>
                    </Td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </section>
    </div>
  );
}

function ChatCreateButton() {
  return (
    <div className="flex items-end">
      <Button type="submit">Create</Button>
    </div>
  );
}
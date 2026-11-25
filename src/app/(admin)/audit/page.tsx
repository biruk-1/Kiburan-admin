import { Badge, EmptyState, Input, PageHeader, Table, Td, Th } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

type Search = Promise<{ entity_type?: string; action?: string }>;

export default async function AuditPage({ searchParams }: { searchParams: Search }) {
  await requireAdmin('support');
  const params = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from('admin_audit_log')
    .select('id, admin_id, action, entity_type, entity_id, reason, created_at')
    .order('created_at', { ascending: false })
    .limit(300);

  if (params.entity_type) query = query.eq('entity_type', params.entity_type);
  if (params.action) query = query.ilike('action', `%${params.action}%`);

  const { data: rows, error } = await query;

  return (
    <div>
      <PageHeader title="Audit log" description="Immutable history of admin mutations (newest first)." />

      <form className="mb-4 grid gap-2 md:grid-cols-3">
        <div>
          <Input name="entity_type" defaultValue={params.entity_type ?? ''} placeholder="entity_type" />
        </div>
        <div>
          <Input name="action" defaultValue={params.action ?? ''} placeholder="action contains" />
        </div>
        <button type="submit" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium">
          Filter
        </button>
      </form>

      {error ? <p className="text-sm text-rose-600">{error.message}</p> : null}
      {!rows?.length ? (
        <EmptyState title="No audit entries" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Action</Th>
              <Th>Entity</Th>
              <Th>Entity id</Th>
              <Th>Admin</Th>
              <Th>Reason</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>{formatDate(r.created_at)}</Td>
                <Td>
                  <Badge tone="info">{r.action}</Badge>
                </Td>
                <Td>{r.entity_type}</Td>
                <Td className="font-mono text-xs">{r.entity_id ?? '—'}</Td>
                <Td className="font-mono text-xs">{r.admin_id}</Td>
                <Td className="max-w-xs text-xs text-zinc-600">{r.reason ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
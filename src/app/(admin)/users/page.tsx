import Link from 'next/link';

import { Badge, EmptyState, Input, PageHeader, Table, Td, Th } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

type Search = Promise<{ q?: string }>;

export default async function UsersPage({ searchParams }: { searchParams: Search }) {
  await requireAdmin('support');
  const params = await searchParams;
  const admin = createAdminClient();

  let query = admin.from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
  if (params.q) {
    query = query.or(`display_name.ilike.%${params.q}%,phone.ilike.%${params.q}%`);
  }

  const { data: profiles, error } = await query;

  return (
    <div>
      <PageHeader title="Users" description="Couple and vendor accounts (profiles). Open a row to ban, edit, or reset password." />

      <form className="mb-4 flex max-w-md gap-2">
        <Input name="q" defaultValue={params.q ?? ''} placeholder="Search display name or phone" />
        <button type="submit" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium">
          Search
        </button>
      </form>

      {error ? <p className="text-sm text-rose-600">{error.message}</p> : null}
      {!profiles?.length ? (
        <EmptyState title="No users found" description="Try a different search." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {profiles.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50">
                <Td>
                  <Link href={`/users/${p.id}`} className="font-medium text-zinc-900 hover:underline">
                    {p.display_name || 'Unnamed'}
                  </Link>
                  <div className="font-mono text-xs text-zinc-400">{p.id}</div>
                </Td>
                <Td>{p.phone ?? '—'}</Td>
                <Td>
                  {p.is_banned ? <Badge tone="danger">banned</Badge> : <Badge tone="success">active</Badge>}
                </Td>
                <Td>{formatDate(p.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
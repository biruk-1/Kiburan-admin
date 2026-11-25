import Link from 'next/link';

import { Badge, EmptyState, Input, PageHeader, Table, Td, Th } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

type Search = Promise<{ q?: string; status?: string }>;

export default async function WeddingsPage({ searchParams }: { searchParams: Search }) {
  await requireAdmin('support');
  const params = await searchParams;
  const admin = createAdminClient();

  let query = admin.from('admin_wedding_overview').select('*').order('created_at', { ascending: false }).limit(200);
  if (params.status) query = query.eq('status', params.status);
  if (params.q) {
    query = query.or(`title.ilike.%${params.q}%,city.ilike.%${params.q}%,owner_display_name.ilike.%${params.q}%`);
  }

  const { data: weddings, error } = await query;

  return (
    <div>
      <PageHeader title="Weddings" description="Couple workspaces with member and booking counts." />

      <form className="mb-4 grid gap-3 md:grid-cols-3">
        <Input name="q" defaultValue={params.q ?? ''} placeholder="Search title, city, owner" />
        <select
          name="status"
          defaultValue={params.status ?? ''}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All status</option>
          <option value="planning">Planning</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="archived">Archived</option>
        </select>
        <button type="submit" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium">
          Filter
        </button>
      </form>

      {error ? <p className="text-sm text-rose-600">{error.message}</p> : null}
      {!weddings?.length ? (
        <EmptyState title="No weddings found" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>Owner</Th>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th>Members</Th>
              <Th>Guests</Th>
              <Th>Bookings</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {weddings.map((w) => (
              <tr key={w.id} className="hover:bg-zinc-50">
                <Td>
                  <Link href={`/weddings/${w.id}`} className="font-medium hover:underline">
                    {w.title}
                  </Link>
                  <div className="text-xs text-zinc-500">{w.city ?? '—'}</div>
                </Td>
                <Td>{w.owner_display_name ?? '—'}</Td>
                <Td>{w.wedding_date ?? '—'}</Td>
                <Td>
                  <Badge>{w.status}</Badge>
                </Td>
                <Td>{w.member_count}</Td>
                <Td>{w.guest_count}</Td>
                <Td>{w.booking_count}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
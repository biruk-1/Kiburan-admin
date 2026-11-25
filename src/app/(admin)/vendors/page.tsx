import Link from 'next/link';

import { Badge, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { formatDate, listingTone, verificationTone } from '@/lib/format';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

type Search = Promise<{ q?: string; verification?: string; listing?: string }>;

export default async function VendorsPage({ searchParams }: { searchParams: Search }) {
  await requireAdmin('support');
  const params = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from('admin_vendor_overview')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (params.verification) query = query.eq('verification_status', params.verification);
  if (params.listing) query = query.eq('listing_status', params.listing);
  if (params.q) {
    query = query.or(
      `business_name.ilike.%${params.q}%,city.ilike.%${params.q}%,email.ilike.%${params.q}%`,
    );
  }

  const { data: vendors, error } = await query;

  return (
    <div>
      <PageHeader
        title="Vendors"
        description="All marketplace businesses. Couples only see published + verified listings."
        actions={
          <Link
            href="/vendors/queue"
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Verification queue
          </Link>
        }
      />

      <form className="mb-4 grid gap-3 md:grid-cols-4">
        <input
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Search name, city, email"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
        <select
          name="verification"
          defaultValue={params.verification ?? ''}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All verification</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="unverified">Unverified</option>
        </select>
        <select
          name="listing"
          defaultValue={params.listing ?? ''}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All listing</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="suspended">Suspended</option>
        </select>
        <button type="submit" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium">
          Filter
        </button>
      </form>

      {error ? <p className="text-sm text-rose-600">{error.message}</p> : null}
      {!vendors?.length ? (
        <EmptyState title="No vendors found" description="Try clearing filters or wait for vendor signups." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Business</Th>
              <Th>Owner</Th>
              <Th>Verification</Th>
              <Th>Listing</Th>
              <Th>Services</Th>
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {vendors.map((v) => (
              <tr key={v.id} className="hover:bg-zinc-50">
                <Td>
                  <Link href={`/vendors/${v.id}`} className="font-medium text-zinc-900 hover:underline">
                    {v.business_name}
                  </Link>
                  <div className="text-xs text-zinc-500">
                    {v.city ?? '—'} · {v.email ?? 'no email'}
                  </div>
                </Td>
                <Td>{v.owner_display_name || '—'}</Td>
                <Td>
                  <Badge tone={verificationTone(v.verification_status)}>{v.verification_status}</Badge>
                </Td>
                <Td>
                  <Badge tone={listingTone(v.listing_status)}>{v.listing_status}</Badge>
                </Td>
                <Td>{v.active_service_count}</Td>
                <Td>{formatDate(v.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

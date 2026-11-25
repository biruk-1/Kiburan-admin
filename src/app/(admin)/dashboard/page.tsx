import Link from 'next/link';

import { Badge, Card, PageHeader, StatCard, Table, Td, Th } from '@/components/ui';
import { formatDate, formatMoney, verificationTone } from '@/lib/format';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

async function countRows(admin: ReturnType<typeof createAdminClient>, table: string, filter?: { col: string; val: string }) {
  let q = admin.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = q.eq(filter.col, filter.val);
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

export default async function DashboardPage() {
  await requireAdmin('support');
  const admin = createAdminClient();

  const [
    profileCount,
    weddingCount,
    pendingVendors,
    pendingReviews,
    pendingPayments,
    successPayments,
    failedPayments,
    cancelledPayments,
    verifiedPublished,
    verifiedDraft,
    rejectedVendors,
    suspendedVendors,
    topPending,
    reviewQueue,
    failedPaymentRows,
  ] = await Promise.all([
    countRows(admin, 'profiles'),
    countRows(admin, 'weddings'),
    countRows(admin, 'vendors', { col: 'verification_status', val: 'pending' }),
    countRows(admin, 'vendor_reviews', { col: 'status', val: 'pending' }),
    countRows(admin, 'booking_payments', { col: 'status', val: 'pending' }),
    countRows(admin, 'booking_payments', { col: 'status', val: 'success' }),
    countRows(admin, 'booking_payments', { col: 'status', val: 'failed' }),
    countRows(admin, 'booking_payments', { col: 'status', val: 'cancelled' }),
    countRows(admin, 'vendors', { col: 'verification_status', val: 'verified' }).then(async () => {
      const { count } = await admin
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'verified')
        .eq('listing_status', 'published');
      return count ?? 0;
    }),
    admin
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'verified')
      .eq('listing_status', 'draft')
      .then((r) => r.count ?? 0),
    countRows(admin, 'vendors', { col: 'verification_status', val: 'rejected' }),
    countRows(admin, 'vendors', { col: 'listing_status', val: 'suspended' }),
    admin
      .from('admin_vendor_overview')
      .select('id, business_name, city, owner_display_name, created_at')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(8),
    admin
      .from('vendor_reviews')
      .select('id, rating, comment, created_at, vendors:vendors(business_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(8),
    admin
      .from('booking_payments')
      .select('id, tx_ref, amount, currency_code, status, created_at, booking_id')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const vendorTotal = await countRows(admin, 'vendors');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Platform health snapshot for Kiburan couples, vendors, and payments."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Profiles" value={profileCount} />
        <StatCard label="Weddings" value={weddingCount} />
        <StatCard label="Vendors" value={vendorTotal} hint={`${verifiedPublished} live listings`} />
        <StatCard
          label="Payments"
          value={pendingPayments + successPayments + failedPayments + cancelledPayments}
          hint={`${successPayments} success · ${failedPayments} failed`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Pending verification" value={pendingVendors} hint="Vendors awaiting review" />
        <StatCard label="Pending reviews" value={pendingReviews} hint="Couple reviews to moderate" />
        <StatCard label="Suspended listings" value={suspendedVendors} />
        <StatCard label="Verified + published" value={verifiedPublished} />
        <StatCard label="Verified + draft" value={verifiedDraft} />
        <StatCard label="Rejected vendors" value={rejectedVendors} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-zinc-900">Pending vendors</h2>
            <Link href="/vendors/queue" className="text-sm font-medium text-zinc-700 hover:underline">
              Open queue
            </Link>
          </div>
          {!topPending.data?.length ? (
            <p className="text-sm text-zinc-500">No vendors waiting for verification.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Business</Th>
                  <Th>Owner</Th>
                  <Th>Submitted</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {topPending.data.map((v) => (
                  <tr key={v.id}>
                    <Td>
                      <Link href={`/vendors/${v.id}`} className="font-medium hover:underline">
                        {v.business_name}
                      </Link>
                      <div className="text-xs text-zinc-500">{v.city ?? '—'}</div>
                    </Td>
                    <Td>{v.owner_display_name ?? '—'}</Td>
                    <Td>{formatDate(v.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-zinc-900">Pending reviews</h2>
            <Link href="/reviews?status=pending" className="text-sm font-medium text-zinc-700 hover:underline">
              Moderate reviews
            </Link>
          </div>
          {!reviewQueue.data?.length ? (
            <p className="text-sm text-zinc-500">No reviews awaiting moderation.</p>
          ) : (
            <ul className="space-y-3">
              {reviewQueue.data.map((r) => {
                const vendor = Array.isArray(r.vendors) ? r.vendors[0] : r.vendors;
                return (
                  <li key={r.id} className="rounded-lg border border-zinc-100 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge tone="warning">pending</Badge>
                      <span className="font-medium">{vendor?.business_name ?? 'Vendor'}</span>
                      <span className="text-zinc-500">{r.rating}/5</span>
                    </div>
                    {r.comment ? <p className="mt-1 line-clamp-2 text-zinc-600">{r.comment}</p> : null}
                    <p className="mt-1 text-xs text-zinc-400">{formatDate(r.created_at)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-zinc-900">Failed payments</h2>
          <Link href="/payments?status=failed" className="text-sm font-medium text-zinc-700 hover:underline">
            All payments
          </Link>
        </div>
        {!failedPaymentRows.data?.length ? (
          <p className="text-sm text-zinc-500">No failed payments recently.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Tx ref</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {failedPaymentRows.data.map((p) => (
                <tr key={p.id}>
                  <Td className="font-mono text-xs">{p.tx_ref}</Td>
                  <Td>{formatMoney(p.amount, p.currency_code)}</Td>
                  <Td>
                    <Badge tone="danger">{p.status}</Badge>
                  </Td>
                  <Td>{formatDate(p.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-zinc-900">Vendor breakdown</h2>
        <p className="text-sm text-zinc-600">
          <Link href="/vendors?verification=pending" className="hover:underline">
            {pendingVendors} pending
          </Link>
          {' · '}
          <Link href="/vendors?verification=verified&listing=published" className="hover:underline">
            {verifiedPublished} live
          </Link>
          {' · '}
          <Link href="/vendors?listing=suspended" className="hover:underline">
            {suspendedVendors} suspended
          </Link>
        </p>
        {topPending.data?.[0] ? (
          <p className="mt-2 text-xs text-zinc-500">
            Next in queue:{' '}
            <Link href={`/vendors/${topPending.data[0].id}`} className="font-medium hover:underline">
              {topPending.data[0].business_name}
            </Link>{' '}
            <Badge tone={verificationTone('pending')}>pending</Badge>
          </p>
        ) : null}
      </Card>
    </div>
  );
}
import Link from 'next/link';

import { approveVendor, rejectVendor } from '@/app/(admin)/vendors/actions';
import { Badge, Button, EmptyState, PageHeader, Table, Td, Textarea, Th } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function VendorQueuePage() {
  const ctx = await requireAdmin('support');
  const admin = createAdminClient();
  const { data: pending } = await admin
    .from('admin_vendor_overview')
    .select('*')
    .eq('verification_status', 'pending')
    .order('created_at', { ascending: true });

  const canWrite = ctx.role === 'admin' || ctx.role === 'super_admin';

  return (
    <div>
      <PageHeader
        title="Verification queue"
        description="Approve or reject businesses waiting for review. Approval is what makes them visible to couples."
      />

      {!pending?.length ? (
        <EmptyState title="Queue is empty" description="No vendors are waiting for verification." />
      ) : (
        <div className="space-y-4">
          {pending.map((v) => (
            <div key={v.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/vendors/${v.id}`} className="text-lg font-semibold text-zinc-900 hover:underline">
                    {v.business_name}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-500">
                    {v.city ?? 'No city'} · Owner: {v.owner_display_name || '—'} · Submitted {formatDate(v.updated_at)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Badge tone="warning">pending</Badge>
                    <Badge>{v.active_service_count} active services</Badge>
                  </div>
                </div>
              </div>

              {canWrite ? (
                <div className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 md:grid-cols-2">
                  <form action={approveVendor} className="space-y-2 rounded-lg bg-emerald-50 p-3">
                    <input type="hidden" name="vendorId" value={v.id} />
                    <label className="flex items-center gap-2 text-sm text-emerald-900">
                      <input type="checkbox" name="publish" defaultChecked />
                      Also publish to marketplace
                    </label>
                    <Button type="submit" className="bg-emerald-700 hover:bg-emerald-600">
                      Approve
                    </Button>
                  </form>
                  <form action={rejectVendor} className="space-y-2 rounded-lg bg-rose-50 p-3">
                    <input type="hidden" name="vendorId" value={v.id} />
                    <Textarea name="reason" required placeholder="Rejection reason (shown to vendor)" rows={3} />
                    <Button type="submit" variant="danger">
                      Reject
                    </Button>
                  </form>
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">Support role is read-only on verification.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {pending && pending.length > 0 ? (
        <div className="mt-6">
          <Table>
            <thead>
              <tr>
                <Th>Business</Th>
                <Th>City</Th>
                <Th>Owner</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pending.map((v) => (
                <tr key={`row-${v.id}`}>
                  <Td>
                    <Link href={`/vendors/${v.id}`} className="hover:underline">
                      {v.business_name}
                    </Link>
                  </Td>
                  <Td>{v.city ?? '—'}</Td>
                  <Td>{v.owner_display_name || '—'}</Td>
                  <Td>{formatDate(v.updated_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}

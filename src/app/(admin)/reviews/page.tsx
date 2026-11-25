import Link from 'next/link';

import { deleteReview, hideReview, publishReview } from '@/app/(admin)/reviews/actions';
import { Badge, Button, EmptyState, PageHeader, Table, Td, Textarea, Th } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

type Search = Promise<{ status?: string }>;

export default async function ReviewsPage({ searchParams }: { searchParams: Search }) {
  const ctx = await requireAdmin('support');
  const params = await searchParams;
  const admin = createAdminClient();
  const canWrite = ctx.role === 'admin' || ctx.role === 'super_admin';

  let query = admin
    .from('vendor_reviews')
    .select(
      'id, rating, comment, status, created_at, vendor_id, wedding_id, reviewer_id, vendors:vendors(business_name), profiles:profiles(display_name)',
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (params.status) query = query.eq('status', params.status);

  const { data: reviews, error } = await query;

  return (
    <div>
      <PageHeader title="Reviews" description="Moderate couple reviews before they appear on vendor profiles." />

      <form className="mb-4 flex gap-2">
        <select
          name="status"
          defaultValue={params.status ?? ''}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">pending</option>
          <option value="published">published</option>
          <option value="hidden">hidden</option>
        </select>
        <button type="submit" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium">
          Filter
        </button>
      </form>

      {error ? <p className="text-sm text-rose-600">{error.message}</p> : null}
      {!reviews?.length ? (
        <EmptyState title="No reviews" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Vendor</Th>
              <Th>Reviewer</Th>
              <Th>Rating</Th>
              <Th>Comment</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              {canWrite ? <Th>Actions</Th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {reviews.map((r) => {
              const vendor = Array.isArray(r.vendors) ? r.vendors[0] : r.vendors;
              const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
              const tone = r.status === 'published' ? 'success' : r.status === 'pending' ? 'warning' : 'neutral';
              return (
                <tr key={r.id}>
                  <Td>
                    <Link href={`/vendors/${r.vendor_id}`} className="font-medium hover:underline">
                      {vendor?.business_name ?? r.vendor_id}
                    </Link>
                  </Td>
                  <Td>
                    <Link href={`/users/${r.reviewer_id}`} className="hover:underline">
                      {profile?.display_name ?? r.reviewer_id.slice(0, 8)}
                    </Link>
                  </Td>
                  <Td>{r.rating}/5</Td>
                  <Td className="max-w-xs text-xs text-zinc-600">{r.comment ?? '—'}</Td>
                  <Td>
                    <Badge tone={tone}>{r.status}</Badge>
                  </Td>
                  <Td>{formatDate(r.created_at)}</Td>
                  {canWrite ? (
                    <Td>
                      <div className="flex flex-col gap-1">
                        <form action={publishReview}>
                          <input type="hidden" name="reviewId" value={r.id} />
                          <Button type="submit" variant="secondary" className="w-full px-2 py-1 text-xs">
                            Publish
                          </Button>
                        </form>
                        <form action={hideReview}>
                          <input type="hidden" name="reviewId" value={r.id} />
                          <Button type="submit" variant="ghost" className="w-full px-2 py-1 text-xs">
                            Hide
                          </Button>
                        </form>
                        <form action={deleteReview} className="space-y-1">
                          <input type="hidden" name="reviewId" value={r.id} />
                          <Textarea name="reason" placeholder="Delete reason" rows={1} className="text-xs" />
                          <Button type="submit" variant="danger" className="w-full px-2 py-1 text-xs">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </Td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
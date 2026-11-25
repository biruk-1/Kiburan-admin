import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  approveVendor,
  rejectVendor,
  setVendorListing,
  suspendVendor,
  unsuspendVendor,
  updateVendorProfile,
} from '@/app/(admin)/vendors/actions';
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  Table,
  Td,
  Textarea,
  Th,
} from '@/components/ui';
import { formatDate, listingTone, verificationTone } from '@/lib/format';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin('support');
  const { id } = await params;
  const admin = createAdminClient();
  const canWrite = ctx.role === 'admin' || ctx.role === 'super_admin';

  const [{ data: vendor }, { data: services }, { data: inquiries }, { data: reviews }, { data: team }] =
    await Promise.all([
      admin.from('admin_vendor_overview').select('*').eq('id', id).maybeSingle(),
      admin
        .from('vendor_services')
        .select('id, title, base_price, currency_code, is_active, created_at')
        .eq('vendor_id', id)
        .order('created_at', { ascending: false }),
      admin
        .from('vendor_inquiries')
        .select('id, status, message, created_at, wedding_id')
        .eq('vendor_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      admin
        .from('vendor_reviews')
        .select('id, rating, status, comment, created_at')
        .eq('vendor_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      admin
        .from('vendor_team_members')
        .select('user_id, role, profiles:profiles(display_name)')
        .eq('vendor_id', id),
    ]);

  if (!vendor) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={vendor.business_name}
        description={`${vendor.city ?? 'No city'} · slug: ${vendor.slug}`}
        actions={
          <Link href="/vendors" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">
            Back to vendors
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge tone={verificationTone(vendor.verification_status)}>{vendor.verification_status}</Badge>
        <Badge tone={listingTone(vendor.listing_status)}>{vendor.listing_status}</Badge>
        <Badge>{vendor.active_service_count} services</Badge>
        <Badge>{vendor.inquiry_count} inquiries</Badge>
        <Badge>{vendor.booking_count} bookings</Badge>
      </div>

      {vendor.rejection_reason ? (
        <Card className="border-rose-200 bg-rose-50 text-sm text-rose-800">
          Rejection reason: {vendor.rejection_reason}
        </Card>
      ) : null}
      {vendor.suspended_reason ? (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
          Suspended reason: {vendor.suspended_reason}
        </Card>
      ) : null}

      {canWrite ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {vendor.verification_status === 'pending' || vendor.verification_status === 'rejected' || vendor.verification_status === 'unverified' ? (
            <Card>
              <h2 className="font-semibold">Approve</h2>
              <form action={approveVendor} className="mt-3 space-y-2">
                <input type="hidden" name="vendorId" value={vendor.id} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="publish" defaultChecked />
                  Publish after approve
                </label>
                <Button type="submit">Approve vendor</Button>
              </form>
            </Card>
          ) : null}

          <Card>
            <h2 className="font-semibold">Reject</h2>
            <form action={rejectVendor} className="mt-3 space-y-2">
              <input type="hidden" name="vendorId" value={vendor.id} />
              <Textarea name="reason" required placeholder="Reason" rows={3} />
              <Button type="submit" variant="danger">
                Reject
              </Button>
            </form>
          </Card>

          {vendor.listing_status !== 'suspended' ? (
            <Card>
              <h2 className="font-semibold">Suspend</h2>
              <form action={suspendVendor} className="mt-3 space-y-2">
                <input type="hidden" name="vendorId" value={vendor.id} />
                <Textarea name="reason" required placeholder="Suspension reason" rows={3} />
                <Button type="submit" variant="danger">
                  Suspend listing
                </Button>
              </form>
            </Card>
          ) : (
            <Card>
              <h2 className="font-semibold">Unsuspend</h2>
              <form action={unsuspendVendor} className="mt-3">
                <input type="hidden" name="vendorId" value={vendor.id} />
                <Button type="submit">Restore listing</Button>
              </form>
            </Card>
          )}

          {vendor.verification_status === 'verified' && vendor.listing_status !== 'suspended' ? (
            <Card>
              <h2 className="font-semibold">Listing</h2>
              <div className="mt-3 flex gap-2">
                <form action={setVendorListing}>
                  <input type="hidden" name="vendorId" value={vendor.id} />
                  <input type="hidden" name="listingStatus" value="published" />
                  <Button type="submit">Publish</Button>
                </form>
                <form action={setVendorListing}>
                  <input type="hidden" name="vendorId" value={vendor.id} />
                  <input type="hidden" name="listingStatus" value="draft" />
                  <Button type="submit" variant="secondary">
                    Unpublish
                  </Button>
                </form>
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      <Card>
        <h2 className="mb-4 font-semibold">Profile</h2>
        {canWrite ? (
          <form action={updateVendorProfile} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="vendorId" value={vendor.id} />
            <div>
              <Label>Business name</Label>
              <Input name="businessName" defaultValue={vendor.business_name} required />
            </div>
            <div>
              <Label>City</Label>
              <Input name="city" defaultValue={vendor.city ?? ''} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input name="phone" defaultValue={vendor.phone ?? ''} />
            </div>
            <div>
              <Label>Email</Label>
              <Input name="email" defaultValue={vendor.email ?? ''} />
            </div>
            <div>
              <Label>Website</Label>
              <Input name="websiteUrl" defaultValue={(vendor as { website_url?: string }).website_url ?? ''} />
            </div>
            <div>
              <Label>Address</Label>
              <Input name="address" defaultValue={(vendor as { address?: string }).address ?? ''} />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea name="description" rows={4} defaultValue={(vendor as { description?: string }).description ?? ''} />
            </div>
            <div>
              <Button type="submit">Save profile</Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Owner</dt>
              <dd>{vendor.owner_display_name || vendor.owner_user_id}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Verified at</dt>
              <dd>{formatDate(vendor.verified_at)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Created</dt>
              <dd>{formatDate(vendor.created_at)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Updated</dt>
              <dd>{formatDate(vendor.updated_at)}</dd>
            </div>
          </dl>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Team</h2>
        {!team?.length ? (
          <p className="text-sm text-zinc-500">No team members.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {team.map((m) => {
              const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              return (
                <li key={m.user_id}>
                  {(profile as { display_name?: string } | null)?.display_name ?? m.user_id} · {m.role}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div>
        <h2 className="mb-3 font-semibold">Services</h2>
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>Price</Th>
              <Th>Active</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(services ?? []).map((s) => (
              <tr key={s.id}>
                <Td>{s.title}</Td>
                <Td>
                  {s.base_price != null ? `${s.base_price} ${s.currency_code}` : '—'}
                </Td>
                <Td>{s.is_active ? 'Yes' : 'No'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">Recent inquiries</h2>
          <Table>
            <thead>
              <tr>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(inquiries ?? []).map((i) => (
                <tr key={i.id}>
                  <Td>{i.status}</Td>
                  <Td>{formatDate(i.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <div>
          <h2 className="mb-3 font-semibold">Reviews</h2>
          <Table>
            <thead>
              <tr>
                <Th>Rating</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(reviews ?? []).map((r) => (
                <tr key={r.id}>
                  <Td>{r.rating}</Td>
                  <Td>{r.status}</Td>
                  <Td>{formatDate(r.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}

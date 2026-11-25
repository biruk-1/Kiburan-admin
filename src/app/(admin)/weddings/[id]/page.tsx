import Link from 'next/link';
import { notFound } from 'next/navigation';

import { deleteWedding, transferWeddingOwnership, updateWedding } from '@/app/(admin)/weddings/actions';
import { Badge, Button, Card, Input, Label, PageHeader, Select, Table, Td, Th } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function WeddingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin('support');
  const { id } = await params;
  const admin = createAdminClient();
  const canWrite = ctx.role === 'admin' || ctx.role === 'super_admin';
  const isSuper = ctx.role === 'super_admin';

  const [{ data: wedding }, { data: members }, { count: guestCount }] = await Promise.all([
    admin.from('admin_wedding_overview').select('*').eq('id', id).maybeSingle(),
    admin
      .from('wedding_members')
      .select('user_id, role, joined_at, profiles:profiles(display_name, phone)')
      .eq('wedding_id', id)
      .order('joined_at', { ascending: true }),
    admin.from('guests').select('*', { count: 'exact', head: true }).eq('wedding_id', id),
  ]);

  if (!wedding) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={wedding.title}
        description={`${wedding.partner_one_name} & ${wedding.partner_two_name}`}
        actions={
          <Link href="/weddings" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">
            Back to weddings
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge>{wedding.status}</Badge>
        <Badge>{wedding.member_count} members</Badge>
        <Badge>{guestCount ?? wedding.guest_count} guests</Badge>
        <Badge>{wedding.booking_count} bookings</Badge>
      </div>

      {canWrite ? (
        <Card>
          <h2 className="font-semibold">Edit wedding</h2>
          <form action={updateWedding} className="mt-3 grid max-w-lg gap-3">
            <input type="hidden" name="weddingId" value={wedding.id} />
            <div>
              <Label>Title</Label>
              <Input name="title" defaultValue={wedding.title} required />
            </div>
            <div>
              <Label>City</Label>
              <Input name="city" defaultValue={wedding.city ?? ''} />
            </div>
            <div>
              <Label>Wedding date</Label>
              <Input name="weddingDate" type="date" defaultValue={wedding.wedding_date ?? ''} />
            </div>
            <div>
              <Label>Status</Label>
              <Select name="status" defaultValue={wedding.status}>
                <option value="planning">planning</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
                <option value="archived">archived</option>
              </Select>
            </div>
            <Button type="submit">Save changes</Button>
          </form>
        </Card>
      ) : null}

      <Card>
        <h2 className="font-semibold">Members</h2>
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Role</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(members ?? []).map((m) => {
              const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              return (
                <tr key={m.user_id}>
                  <Td>
                    <Link href={`/users/${m.user_id}`} className="font-medium hover:underline">
                      {p?.display_name ?? m.user_id}
                    </Link>
                    <div className="text-xs text-zinc-500">{p?.phone ?? '—'}</div>
                  </Td>
                  <Td>
                    <Badge tone={m.role === 'owner' ? 'success' : 'neutral'}>{m.role}</Badge>
                  </Td>
                  <Td>{formatDate(m.joined_at)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {canWrite ? (
        <Card>
          <h2 className="font-semibold">Transfer ownership</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Updates <code className="text-xs">created_by</code> and sets the new user as wedding owner member.
          </p>
          <form action={transferWeddingOwnership} className="mt-3 flex max-w-lg flex-wrap items-end gap-2">
            <input type="hidden" name="weddingId" value={wedding.id} />
            <div className="min-w-[240px] flex-1">
              <Label>New owner user id</Label>
              <Input name="newOwnerId" placeholder="UUID" required />
            </div>
            <Button type="submit" variant="secondary">
              Transfer
            </Button>
          </form>
        </Card>
      ) : null}

      {isSuper ? (
        <Card className="border-rose-200">
          <h2 className="font-semibold text-rose-800">Delete wedding</h2>
          <form action={deleteWedding} className="mt-3 max-w-sm space-y-2">
            <input type="hidden" name="weddingId" value={wedding.id} />
            <Label>Type DELETE to confirm</Label>
            <Input name="confirm" placeholder="DELETE" />
            <Button type="submit" variant="danger">
              Delete wedding
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
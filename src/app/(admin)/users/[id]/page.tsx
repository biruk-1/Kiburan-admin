import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  banUser,
  deleteUser,
  sendPasswordReset,
  unbanUser,
  updateUserProfile,
} from '@/app/(admin)/users/actions';
import { Badge, Button, Card, Input, Label, PageHeader, Textarea } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin('support');
  const { id } = await params;
  const admin = createAdminClient();
  const canWrite = ctx.role === 'admin' || ctx.role === 'super_admin';
  const isSuper = ctx.role === 'super_admin';

  const [{ data: profile }, authUser, weddings, vendors] = await Promise.all([
    admin.from('profiles').select('*').eq('id', id).maybeSingle(),
    admin.auth.admin.getUserById(id),
    admin.from('wedding_members').select('wedding_id, role, weddings:weddings(title)').eq('user_id', id),
    admin.from('vendors').select('id, business_name, verification_status, listing_status').eq('owner_user_id', id),
  ]);

  if (!profile) notFound();

  const email = authUser.data.user?.email ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile.display_name || 'User'}
        description={email ?? profile.id}
        actions={
          <Link href="/users" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">
            Back to users
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        {profile.is_banned ? <Badge tone="danger">banned</Badge> : <Badge tone="success">active</Badge>}
        <Badge>Joined {formatDate(profile.created_at)}</Badge>
      </div>

      {canWrite ? (
        <Card>
          <h2 className="font-semibold">Edit profile</h2>
          <form action={updateUserProfile} className="mt-3 grid max-w-lg gap-3">
            <input type="hidden" name="userId" value={profile.id} />
            <div>
              <Label>Display name</Label>
              <Input name="displayName" defaultValue={profile.display_name} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input name="phone" defaultValue={profile.phone ?? ''} />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Wedding memberships</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {(weddings.data ?? []).length === 0 ? (
              <li className="text-zinc-500">No weddings</li>
            ) : (
              weddings.data?.map((m) => {
                const w = Array.isArray(m.weddings) ? m.weddings[0] : m.weddings;
                return (
                  <li key={m.wedding_id}>
                    <Link href={`/weddings/${m.wedding_id}`} className="font-medium hover:underline">
                      {w?.title ?? m.wedding_id}
                    </Link>
                    <span className="text-zinc-500"> · {m.role}</span>
                  </li>
                );
              })
            )}
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">Owned vendors</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {(vendors.data ?? []).length === 0 ? (
              <li className="text-zinc-500">No vendor businesses</li>
            ) : (
              vendors.data?.map((v) => (
                <li key={v.id}>
                  <Link href={`/vendors/${v.id}`} className="font-medium hover:underline">
                    {v.business_name}
                  </Link>
                  <span className="text-zinc-500">
                    {' '}
                    · {v.verification_status} / {v.listing_status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      {canWrite ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {!profile.is_banned ? (
            <Card>
              <h2 className="font-semibold">Ban user</h2>
              <form action={banUser} className="mt-3 space-y-2">
                <input type="hidden" name="userId" value={profile.id} />
                <Textarea name="reason" placeholder="Reason (optional)" rows={2} />
                <Button type="submit" variant="danger">
                  Ban account
                </Button>
              </form>
            </Card>
          ) : (
            <Card>
              <h2 className="font-semibold">Unban user</h2>
              <form action={unbanUser} className="mt-3">
                <input type="hidden" name="userId" value={profile.id} />
                <Button type="submit">Remove ban</Button>
              </form>
            </Card>
          )}

          {email ? (
            <Card>
              <h2 className="font-semibold">Password reset</h2>
              <p className="mt-1 text-sm text-zinc-500">Sends Supabase recovery email to {email}</p>
              <form action={sendPasswordReset} className="mt-3">
                <input type="hidden" name="userId" value={profile.id} />
                <input type="hidden" name="email" value={email} />
                <Button type="submit" variant="secondary">
                  Send reset email
                </Button>
              </form>
            </Card>
          ) : null}
        </div>
      ) : null}

      {isSuper ? (
        <Card className="border-rose-200">
          <h2 className="font-semibold text-rose-800">Hard delete</h2>
          <p className="mt-1 text-sm text-zinc-600">Permanently removes auth user and cascaded data. Cannot be undone.</p>
          <form action={deleteUser} className="mt-3 space-y-2 max-w-sm">
            <input type="hidden" name="userId" value={profile.id} />
            <Label>Type DELETE to confirm</Label>
            <Input name="confirm" placeholder="DELETE" />
            <Button type="submit" variant="danger">
              Delete user
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
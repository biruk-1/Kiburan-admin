import { addPlatformAdmin, changeAdminRole, removePlatformAdmin } from '@/app/(admin)/admins/actions';
import { Badge, Button, Card, Input, Label, PageHeader, Select, Table, Td, Th } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function AdminsPage() {
  const ctx = await requireAdmin('super_admin');
  const admin = createAdminClient();

  const { data: rows, error } = await admin.from('platform_admins').select('*').order('created_at', { ascending: false });

  const enriched = await Promise.all(
    (rows ?? []).map(async (row) => {
      const [{ data: profile }, auth] = await Promise.all([
        admin.from('profiles').select('display_name, phone').eq('id', row.user_id).maybeSingle(),
        admin.auth.admin.getUserById(row.user_id),
      ]);
      return {
        ...row,
        display_name: profile?.display_name ?? null,
        email: auth.data.user?.email ?? null,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Platform admins" description="Super admins can grant or revoke access to kiburan-admin." />

      <Card>
        <h2 className="font-semibold">Add admin</h2>
        <form action={addPlatformAdmin} className="mt-3 grid gap-3 md:grid-cols-4">
          <div>
            <Label>User id (UUID)</Label>
            <Input name="userId" placeholder="Optional if email set" />
          </div>
          <div>
            <Label>Email lookup</Label>
            <Input name="email" type="email" placeholder="user@example.com" />
          </div>
          <div>
            <Label>Role</Label>
            <Select name="role" defaultValue="admin">
              <option value="support">support</option>
              <option value="admin">admin</option>
              <option value="super_admin">super_admin</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Card>

      {error ? <p className="text-sm text-rose-600">{error.message}</p> : null}
      <Table>
        <thead>
          <tr>
            <Th>User</Th>
            <Th>Role</Th>
            <Th>Added</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {enriched.map((row) => (
            <tr key={row.user_id}>
              <Td>
                <div className="font-medium">{row.display_name ?? row.email ?? row.user_id}</div>
                <div className="text-xs text-zinc-500">{row.email ?? row.user_id}</div>
              </Td>
              <Td>
                <Badge tone={row.role === 'super_admin' ? 'danger' : row.role === 'admin' ? 'info' : 'neutral'}>
                  {row.role}
                </Badge>
              </Td>
              <Td>{formatDate(row.created_at)}</Td>
              <Td>
                <div className="flex flex-col gap-2">
                  <form action={changeAdminRole} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={row.user_id} />
                    <Select name="role" defaultValue={row.role} className="py-1 text-xs">
                      <option value="support">support</option>
                      <option value="admin">admin</option>
                      <option value="super_admin">super_admin</option>
                    </Select>
                    <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
                      Save role
                    </Button>
                  </form>
                  {row.user_id !== ctx.userId ? (
                    <form action={removePlatformAdmin}>
                      <input type="hidden" name="userId" value={row.user_id} />
                      <Button type="submit" variant="danger" className="px-2 py-1 text-xs">
                        Remove
                      </Button>
                    </form>
                  ) : (
                    <span className="text-xs text-zinc-500">Current session</span>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
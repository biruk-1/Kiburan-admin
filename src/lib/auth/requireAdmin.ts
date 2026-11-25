import 'server-only';

import { redirect } from 'next/navigation';

import { type AdminRole, hasMinRole, isAdminRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSessionClient } from '@/lib/supabase/server';

export type AdminContext = {
  userId: string;
  email: string | undefined;
  role: AdminRole;
};

/**
 * Ensures the request has a signed-in user who is in platform_admins
 * with at least `minRole`. Uses the service client only after session check.
 */
export async function requireAdmin(minRole: AdminRole = 'support'): Promise<AdminContext> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from('platform_admins')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !row || !isAdminRole(row.role)) {
    redirect('/login?error=not_admin');
  }

  if (!hasMinRole(row.role, minRole)) {
    redirect('/dashboard?error=forbidden');
  }

  return {
    userId: user.id,
    email: user.email,
    role: row.role,
  };
}

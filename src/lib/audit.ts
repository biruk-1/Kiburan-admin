import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

type AuditInput = {
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
};

/** Persist an admin mutation. Failures are logged but do not roll back the action. */
export async function writeAudit(input: AuditInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('admin_audit_log').insert({
    admin_id: input.adminId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    reason: input.reason ?? null,
  });

  if (error) {
    console.error('[audit] failed to write', error.message, input.action);
  }
}

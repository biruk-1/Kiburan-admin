export type AdminRole = 'super_admin' | 'admin' | 'support';

const ROLE_RANK: Record<AdminRole, number> = {
  support: 1,
  admin: 2,
  super_admin: 3,
};

export function isAdminRole(value: string | null | undefined): value is AdminRole {
  return value === 'super_admin' || value === 'admin' || value === 'support';
}

export function hasMinRole(role: AdminRole, minRole: AdminRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

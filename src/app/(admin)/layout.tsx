import { Sidebar } from '@/components/Sidebar';
import { getAdminBadgeCounts } from '@/lib/adminBadges';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin('support');
  const badges = await getAdminBadgeCounts();

  return (
    <div className="flex min-h-screen bg-zinc-100">
      <Sidebar email={admin.email} role={admin.role} badges={badges} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}

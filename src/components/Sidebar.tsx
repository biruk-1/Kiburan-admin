'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import type { AdminBadgeCounts } from '@/lib/adminBadges';
import type { AdminRole } from '@/lib/auth/roles';
import { createBrowserSupabase } from '@/lib/supabase/client';

type NavItem = {
  href: string;
  label: string;
  minRole?: 'super_admin';
  badgeKey?: keyof AdminBadgeCounts;
};

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/vendors/queue', label: 'Verification queue', badgeKey: 'pendingVendors' },
  { href: '/users', label: 'Users' },
  { href: '/weddings', label: 'Weddings' },
  { href: '/pipeline', label: 'Inquiries & bookings', badgeKey: 'newInquiries' },
  { href: '/payments', label: 'Payments', badgeKey: 'failedPayments' },
  { href: '/reviews', label: 'Reviews', badgeKey: 'pendingReviews' },
  { href: '/catalog', label: 'Catalog' },
  { href: '/audit', label: 'Audit log' },
  { href: '/admins', label: 'Admins', minRole: 'super_admin' },
];

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function Sidebar({
  email,
  role,
  badges,
}: {
  email?: string;
  role: AdminRole;
  badges: AdminBadgeCounts;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  const attention =
    badges.pendingVendors +
    badges.pendingReviews +
    badges.failedPayments +
    badges.newInquiries +
    badges.pendingBookings;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-5 py-5">
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold tracking-tight">Kiburan Admin</p>
          {attention > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {attention > 99 ? '99+' : attention}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-zinc-400">{email ?? 'Admin'}</p>
        <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">{role.replace('_', ' ')}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.filter((item) => !item.minRole || role === 'super_admin').map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' &&
              pathname.startsWith(item.href) &&
              item.href !== '/vendors/queue' &&
              !(item.href === '/vendors' && pathname.startsWith('/vendors/queue')));
          const queueActive = item.href === '/vendors/queue' && pathname.startsWith('/vendors/queue');
          const isActive =
            item.href === '/vendors/queue'
              ? queueActive
              : active && !(item.href === '/vendors' && pathname.startsWith('/vendors/queue'));

          // Pipeline badge: new inquiries + pending bookings
          let badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
          if (item.href === '/pipeline') {
            badgeCount = badges.newInquiries + badges.pendingBookings;
          }
          if (item.href === '/payments') {
            badgeCount = badges.failedPayments + badges.pendingPayments;
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                isActive ? 'bg-white text-zinc-900' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <span className="truncate">{item.label}</span>
              <Badge count={badgeCount} />
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 p-3">
        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type AdminBadgeCounts = {
  pendingVendors: number;
  pendingReviews: number;
  pendingPayments: number;
  failedPayments: number;
  newInquiries: number;
  pendingBookings: number;
};

async function countEq(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  col: string,
  val: string,
): Promise<number> {
  const { count } = await admin.from(table).select('*', { count: 'exact', head: true }).eq(col, val);
  return count ?? 0;
}

/** Queue sizes for the admin sidebar badges. */
export async function getAdminBadgeCounts(): Promise<AdminBadgeCounts> {
  const admin = createAdminClient();
  const [pendingVendors, pendingReviews, pendingPayments, failedPayments, newInquiries, pendingBookings] =
    await Promise.all([
      countEq(admin, 'vendors', 'verification_status', 'pending'),
      countEq(admin, 'vendor_reviews', 'status', 'pending'),
      countEq(admin, 'booking_payments', 'status', 'pending'),
      countEq(admin, 'booking_payments', 'status', 'failed'),
      countEq(admin, 'vendor_inquiries', 'status', 'new'),
      countEq(admin, 'vendor_bookings', 'status', 'pending'),
    ]);

  return {
    pendingVendors,
    pendingReviews,
    pendingPayments,
    failedPayments,
    newInquiries,
    pendingBookings,
  };
}

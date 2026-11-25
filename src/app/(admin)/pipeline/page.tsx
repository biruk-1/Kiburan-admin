import Link from 'next/link';

import {
  updateBookingStatus,
  updateInquiryStatus,
  updateQuoteStatus,
} from '@/app/(admin)/pipeline/actions';
import { Badge, Button, EmptyState, PageHeader, Select, Table, Td, Th } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

type Search = Promise<{ tab?: string; status?: string }>;

const TABS = [
  { key: 'inquiries', label: 'Inquiries' },
  { key: 'quotes', label: 'Quotes' },
  { key: 'bookings', label: 'Bookings' },
] as const;

export default async function PipelinePage({ searchParams }: { searchParams: Search }) {
  const ctx = await requireAdmin('support');
  const params = await searchParams;
  const tab = params.tab === 'quotes' || params.tab === 'bookings' ? params.tab : 'inquiries';
  const admin = createAdminClient();
  const canWrite = ctx.role === 'admin' || ctx.role === 'super_admin';

  const content =
    tab === 'quotes'
      ? await loadQuotes(admin, params.status)
      : tab === 'bookings'
        ? await loadBookings(admin, params.status)
        : await loadInquiries(admin, params.status);

  return (
    <div>
      <PageHeader title="Inquiries & bookings" description="Moderate marketplace pipeline records across couples and vendors." />

      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/pipeline?tab=${t.key}`}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              tab === t.key ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-700 ring-1 ring-zinc-200'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap gap-2">
        <input type="hidden" name="tab" value={tab} />
        <Select name="status" defaultValue={params.status ?? ''} className="max-w-xs">
          <option value="">All statuses</option>
          {content.statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <button type="submit" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium">
          Filter
        </button>
      </form>

      {!content.rows.length ? (
        <EmptyState title="No records" description="Try another status filter." />
      ) : (
        <Table>
          <thead>
            <tr>
              {content.headers.map((h) => (
                <Th key={h}>{h}</Th>
              ))}
              {canWrite ? <Th>Action</Th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {content.rows.map((row) => (
              <tr key={row.id} className="hover:bg-zinc-50">
                {row.cells.map((cell, i) => (
                  <Td key={i}>{cell}</Td>
                ))}
                {canWrite ? (
                  <Td>
                    <form action={content.action} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={row.id} />
                      <Select name="status" defaultValue={row.status} className="min-w-[8rem] py-1 text-xs">
                        {content.statusOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                      <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
                        Update
                      </Button>
                    </form>
                  </Td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

async function loadInquiries(admin: ReturnType<typeof createAdminClient>, status?: string) {
  const statuses = ['new', 'replied', 'quoted', 'accepted', 'declined', 'closed'];
  let q = admin
    .from('vendor_inquiries')
    .select('id, status, message, created_at, vendor_id, wedding_id, vendors:vendors(business_name)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) q = q.eq('status', status);
  const { data } = await q;
  const rows = (data ?? []).map((r) => {
    const vendor = Array.isArray(r.vendors) ? r.vendors[0] : r.vendors;
    return {
      id: r.id,
      status: r.status,
      cells: [
        <Link key="v" href={`/vendors/${r.vendor_id}`} className="font-medium hover:underline">
          {vendor?.business_name ?? r.vendor_id}
        </Link>,
        <Link key="w" href={`/weddings/${r.wedding_id}`} className="text-xs hover:underline">
          wedding
        </Link>,
        <Badge key="s">{r.status}</Badge>,
        <span key="m" className="line-clamp-1 max-w-xs text-xs text-zinc-500">
          {r.message ?? '—'}
        </span>,
        formatDate(r.created_at),
      ],
    };
  });
  return {
    headers: ['Vendor', 'Wedding', 'Status', 'Message', 'Created'],
    statusOptions: statuses,
    action: updateInquiryStatus,
    rows,
  };
}

async function loadQuotes(admin: ReturnType<typeof createAdminClient>, status?: string) {
  const statuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
  let q = admin
    .from('vendor_quotes')
    .select('id, status, amount, currency_code, created_at, inquiry_id')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) q = q.eq('status', status);
  const { data } = await q;
  const rows = (data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    cells: [
      r.id.slice(0, 8),
      <Badge key="s">{r.status}</Badge>,
      formatMoney(r.amount, r.currency_code),
      formatDate(r.created_at),
      <span key="i" className="font-mono text-xs">
        {r.inquiry_id.slice(0, 8)}
      </span>,
    ],
  }));
  return {
    headers: ['Quote', 'Status', 'Amount', 'Created', 'Inquiry'],
    statusOptions: statuses,
    action: updateQuoteStatus,
    rows,
  };
}

async function loadBookings(admin: ReturnType<typeof createAdminClient>, status?: string) {
  const statuses = ['pending', 'confirmed', 'fulfilled', 'cancelled'];
  let q = admin
    .from('vendor_bookings')
    .select(
      'id, status, total_amount, currency_code, created_at, wedding_vendor_id, wedding_vendors:wedding_vendors(vendor_id, wedding_id, vendors:vendors(business_name))',
    )
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) q = q.eq('status', status);
  const { data } = await q;
  const rows = (data ?? []).map((r) => {
    const wv = Array.isArray(r.wedding_vendors) ? r.wedding_vendors[0] : r.wedding_vendors;
    const vendor = wv && (Array.isArray(wv.vendors) ? wv.vendors[0] : wv.vendors);
    return {
      id: r.id,
      status: r.status,
      cells: [
        vendor ? (
          <Link key="v" href={`/vendors/${wv?.vendor_id}`} className="font-medium hover:underline">
            {vendor.business_name}
          </Link>
        ) : (
          r.id.slice(0, 8)
        ),
        <Badge key="s">{r.status}</Badge>,
        formatMoney(r.total_amount, r.currency_code),
        formatDate(r.created_at),
        wv?.wedding_id ? (
          <Link key="w" href={`/weddings/${wv.wedding_id}`} className="text-xs hover:underline">
            wedding
          </Link>
        ) : (
          '—'
        ),
      ],
    };
  });
  return {
    headers: ['Vendor', 'Status', 'Total', 'Created', 'Wedding'],
    statusOptions: statuses,
    action: updateBookingStatus,
    rows,
  };
}
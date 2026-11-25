import Link from 'next/link';

import { reverifyChapaPayment, setPaymentStatus } from '@/app/(admin)/payments/actions';
import { Badge, Button, EmptyState, PageHeader, Select, Table, Td, Textarea, Th } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

type Search = Promise<{ status?: string }>;

function paymentTone(status: string) {
  switch (status) {
    case 'success':
      return 'success' as const;
    case 'failed':
      return 'danger' as const;
    case 'cancelled':
      return 'neutral' as const;
    default:
      return 'warning' as const;
  }
}

export default async function PaymentsPage({ searchParams }: { searchParams: Search }) {
  const ctx = await requireAdmin('support');
  const params = await searchParams;
  const admin = createAdminClient();
  const canWrite = ctx.role === 'admin' || ctx.role === 'super_admin';
  const chapaEnabled = Boolean(process.env.CHAPA_SECRET_KEY);

  let query = admin
    .from('booking_payments')
    .select('id, tx_ref, amount, currency_code, status, purpose, created_at, wedding_id, booking_id, payer_user_id')
    .order('created_at', { ascending: false })
    .limit(200);
  if (params.status) query = query.eq('status', params.status);

  const { data: payments, error } = await query;

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Booking payment ledger (Chapa). Admins can correct status or re-verify when configured."
      />

      <form className="mb-4 flex gap-2">
        <Select name="status" defaultValue={params.status ?? ''} className="max-w-xs">
          <option value="">All statuses</option>
          <option value="pending">pending</option>
          <option value="success">success</option>
          <option value="failed">failed</option>
          <option value="cancelled">cancelled</option>
        </Select>
        <button type="submit" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium">
          Filter
        </button>
      </form>

      {error ? <p className="text-sm text-rose-600">{error.message}</p> : null}
      {!payments?.length ? (
        <EmptyState title="No payments" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Tx ref</Th>
              <Th>Amount</Th>
              <Th>Purpose</Th>
              <Th>Status</Th>
              <Th>Wedding</Th>
              <Th>Created</Th>
              {canWrite ? <Th>Actions</Th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {payments.map((p) => (
              <tr key={p.id}>
                <Td className="font-mono text-xs">{p.tx_ref}</Td>
                <Td>{formatMoney(p.amount, p.currency_code)}</Td>
                <Td>{p.purpose}</Td>
                <Td>
                  <Badge tone={paymentTone(p.status)}>{p.status}</Badge>
                </Td>
                <Td>
                  <Link href={`/weddings/${p.wedding_id}`} className="text-xs hover:underline">
                    open
                  </Link>
                </Td>
                <Td>{formatDate(p.created_at)}</Td>
                {canWrite ? (
                  <Td>
                    <form action={setPaymentStatus} className="space-y-2">
                      <input type="hidden" name="paymentId" value={p.id} />
                      <Select name="status" defaultValue={p.status} className="py-1 text-xs">
                        <option value="success">success</option>
                        <option value="failed">failed</option>
                        <option value="cancelled">cancelled</option>
                        <option value="pending">pending</option>
                      </Select>
                      <Textarea name="reason" placeholder="Reason" rows={2} className="text-xs" />
                      <div className="flex flex-wrap gap-1">
                        <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
                          Set status
                        </Button>
                        {chapaEnabled ? (
                          <Button formAction={reverifyChapaPayment} variant="ghost" className="px-2 py-1 text-xs">
                            Re-verify Chapa
                          </Button>
                        ) : null}
                      </div>
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
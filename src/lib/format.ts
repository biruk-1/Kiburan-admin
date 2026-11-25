export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function formatMoney(amount: number | null | undefined, currency = 'ETB'): string {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

export function verificationTone(status: string) {
  switch (status) {
    case 'verified':
      return 'success' as const;
    case 'pending':
      return 'warning' as const;
    case 'rejected':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
}

export function listingTone(status: string) {
  switch (status) {
    case 'published':
      return 'success' as const;
    case 'suspended':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
}

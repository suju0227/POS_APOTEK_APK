const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('id-ID');

const percentFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 2,
  style: 'percent',
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Makassar',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Makassar',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatRupiah(value: number) {
  return rupiahFormatter.format(value).replace(/\s+/g, ' ');
}

export function formatDate(value: string | Date) {
  return dateFormatter.format(new Date(value));
}

export function formatDateTimeWita(value: string | Date) {
  const parts = dateTimeFormatter.formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';

  return `${part('day')} ${part('month')} ${part('year')}, ${part('hour')}.${part('minute')} WITA`;
}

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatPercent(value: number) {
  return percentFormatter.format(value);
}

export function formatQty(value: number, unit?: string | null) {
  const formatted = formatNumber(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

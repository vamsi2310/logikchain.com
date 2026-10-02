function validDate(value: string | Date): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid date: ${String(value)}`);
  }
  return date;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addHours(value: string | Date, hours: number): string {
  const date = validDate(value);
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  return date.toISOString();
}

export function addDays(value: string | Date, days: number): string {
  const date = validDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function addMonths(value: string | Date, months: number): string {
  const date = validDate(value);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString();
}

export function periodIdFor(value: string | Date = new Date()): string {
  return validDate(value).toISOString().slice(0, 7);
}

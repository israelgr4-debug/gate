const TZ = 'Asia/Jerusalem';

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

function partsIn(tz: string, date: Date): LocalParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: map.hour === '24' ? 0 : Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: weekdayMap[map.weekday ?? 'Sun'] ?? 0,
  };
}

export function localNow(date: Date = new Date()): LocalParts {
  return partsIn(TZ, date);
}

export function localDateISO(parts: LocalParts): string {
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${parts.year}-${m}-${d}`;
}

export function localTimeHMS(parts: LocalParts): string {
  const h = String(parts.hour).padStart(2, '0');
  const m = String(parts.minute).padStart(2, '0');
  const s = String(parts.second).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function timeInRange(t: string, from: string, to: string): boolean {
  if (from <= to) {
    return t >= from && t <= to;
  }
  return t >= from || t <= to;
}

export function dateInRange(d: string, from: string | null, to: string | null): boolean {
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

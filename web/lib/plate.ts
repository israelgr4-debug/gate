export function normalizePlate(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, '');
  if (digits.length < 7 || digits.length > 8) return null;
  return digits;
}

export function displayPlate(normalized: string): string {
  if (normalized.length === 7) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5, 7)}`;
  }
  if (normalized.length === 8) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 5)}-${normalized.slice(5, 8)}`;
  }
  return normalized;
}

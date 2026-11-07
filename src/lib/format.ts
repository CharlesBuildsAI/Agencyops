export function dollars(cents: number) {
  return `$${Math.round(cents / 100)}`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const value = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return value || "A";
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function phonePretty(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length !== 10) return value;
  return `+1 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

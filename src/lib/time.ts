export function monthKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

export function dayKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatClock(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(/\s?[AP]M$/i, "");
}

export function formatClockWithPeriod(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDayStamp(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(date);
}

export function statusStamp(iso: string, timeZone: string, live: boolean) {
  if (live) return "now";
  const date = new Date(iso);
  if (dayKey(date, timeZone) === dayKey(new Date(), timeZone)) {
    return formatClock(date, timeZone);
  }
  return formatDayStamp(date, timeZone);
}

export function formatDuration(startedAtIso: string, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAtIso).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function zonedDateTime(day: string, time: string, offset = "-07:00") {
  const [hour, minute] = time.split(":");
  return new Date(`${day}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00${offset}`);
}

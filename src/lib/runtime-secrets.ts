const overlay = new Map<string, string>();

/** Keys held in this process only. Electron also injects them as env after the OS keychain unlocks them. */
export function setRuntimeSecrets(values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) {
    if (value.trim()) overlay.set(key, value.trim());
  }
}

export function secret(name: string) {
  return overlay.get(name) || process.env[name] || "";
}

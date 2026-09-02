/**
 * ID generator. crypto.randomUUID is only available in secure contexts
 * (https / localhost); on a plain LAN http URL we fall back to Math.random.
 */
export function newId(prefix = ''): string {
  const c = globalThis.crypto;
  const raw =
    c && typeof c.randomUUID === 'function'
      ? c.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return prefix ? `${prefix}-${raw}` : raw;
}

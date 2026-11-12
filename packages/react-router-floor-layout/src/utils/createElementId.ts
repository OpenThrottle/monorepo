/**
 * Unique-id generation for floor elements. Prefers `crypto.randomUUID()`;
 * falls back to a monotonically-increasing counter in environments without the
 * Web Crypto API (older jsdom, non-secure contexts).
 */

let fallbackIdCounter = 0;

/**
 * Generate a unique id for a new floor element.
 */
export function createElementId(): string {
  const api = globalThis.crypto;
  if (api && typeof api.randomUUID === 'function') return api.randomUUID();
  fallbackIdCounter += 1;
  return `floor-element-${fallbackIdCounter}`;
}

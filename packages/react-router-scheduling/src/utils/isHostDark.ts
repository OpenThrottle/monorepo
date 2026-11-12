// Detect the host app's effective dark mode so the Schedule-X shadcn theme can
// track it. OpenThrottle's shadcn tokens flip via a `.dark` class on the
// document element (with an OS `prefers-color-scheme` fallback when no explicit
// `.dark`/`.light` class is set), so this mirrors that resolution order.

/**
 * Whether the host app is currently in dark mode: `.dark` on the document
 * element wins, then `.light` (forces light), otherwise the OS preference.
 * Returns `false` outside the browser.
 */
export function isHostDark(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const { classList } = document.documentElement;
  if (classList.contains('dark')) {
    return true;
  }

  if (classList.contains('light')) {
    return false;
  }

  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

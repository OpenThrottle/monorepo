/**
 * @description The Node version bundled into the locked Electron, which runs the embedded
 * developer server in a `utilityProcess`. The system Node never runs it, so the
 * root `engines.node` does not apply. Electron publishes this mapping only at
 * https://releases.electronjs.org/releases.json (the `node` field), not in the
 * npm package, so it is recorded here. `electron-bundled-node.test.ts` fails
 * when Electron moves without this being updated, and when this Node no longer
 * satisfies the `engines.node` of what the embedded server loads.
 */
export const ELECTRON_BUNDLED_NODE = {
  electron: '45.3.1',
  node: '24.22.2',
} as const;

export type ElectronBundledNodeKey = keyof typeof ELECTRON_BUNDLED_NODE;
export type ElectronBundledNodeValue =
  (typeof ELECTRON_BUNDLED_NODE)[ElectronBundledNodeKey];

/** @description Packages the embedded server loads whose `engines.node` it must satisfy. */
export const EMBEDDED_SERVER_RUNTIME_PACKAGES = [
  '@react-router/express',
  '@react-router/node',
  'express',
  'react-router',
] as const;

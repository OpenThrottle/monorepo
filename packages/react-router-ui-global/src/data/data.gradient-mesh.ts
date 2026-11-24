/**
 * @description Default color spots for the mesh. WebGL cannot read CSS
 * variables, so these are concrete values tuned to read well behind dark UI.
 * Override via `colors` to match a brand palette.
 */
export const DEFAULT_GRADIENT_MESH_COLORS = [
  '#0a0a23',
  '#1e3a8a',
  '#7c3aed',
  '#db2777',
  '#0ea5e9',
] as const;

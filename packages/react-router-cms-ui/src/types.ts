/**
 * @public
 * @description Debug-mode metadata every CMS component carries as a static
 * `debug` property. When the CMS renders in debug mode it applies `className`
 * on top of the component's own classes, so editors can see each block's
 * bounds. `undefined` means the component adds nothing in debug mode.
 */
export interface CmsComponentDebug {
  readonly className: string | undefined;
}

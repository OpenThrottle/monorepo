/**
 * @description Normalizing styles for server-rendered rich text, applied to
 * descendants so the CMS markup needs no classes of its own. Replaces the
 * upstream `wysiwyg.css`.
 */
export const WYSIWYG_CLASSES = [
  '[&_h1]:my-4 [&_h2]:my-4 [&_h3]:my-4 [&_h4]:my-4 [&_h5]:my-4 [&_h6]:my-4',
  '[&_h1]:text-2xl [&_h2]:text-2xl [&_h3]:text-2xl',
  '[&_h4]:text-2xl [&_h5]:text-2xl [&_h6]:text-2xl',
  '[&_p]:mb-4 [&_p:last-of-type]:mb-0',
  '[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-8',
  '[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-8',
  '[&_pre]:my-4 [&_pre]:overflow-auto [&_pre]:bg-foreground [&_pre]:p-2 [&_pre]:text-background',
  '[&_img]:mb-4',
] as const;

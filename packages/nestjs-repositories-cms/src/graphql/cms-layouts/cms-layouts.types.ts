/**
 * @description Who a layout read is for. `public` sees only ACTIVE layouts; `editor` (a caller
 * allowed to write cms content) also sees DRAFT and DISABLED ones. Soft-deleted layouts are
 * hidden from both. Decision: databases/cms/README.md § "Decision: who sees unpublished layouts".
 * @public
 */
export type CmsLayoutAudience = 'editor' | 'public';

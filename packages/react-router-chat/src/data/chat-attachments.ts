/** Resource route the composer uploads images to (`POST`). @public */
export const CHAT_ATTACHMENT_UPLOAD_ROUTE = '/resources/attachments';

/** Image types the server accepts; drives the file picker's `accept`. @public */
export const CHAT_ATTACHMENT_ACCEPT = `image/png,image/jpeg,image/gif,image/webp`;

/** Most images one message may carry (server limit). @public */
export const CHAT_ATTACHMENT_MAX_COUNT = 8;

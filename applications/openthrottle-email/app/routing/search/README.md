# Search routing area

This folder was created with `@tools/generators:folders` (routing/search) for the email app.

- **Route:** `/mail/search?q=...` is handled by `app/routes/_layout.mail.search.tsx`; loader uses `getMockSearchResults` from `~/global/data/mock.mail`. Replace with API when backend search is available.
- **UI:** Search results reuse `MessageList` from `~/routing/inbox/components` for consistency (shadcn-ui Table).
- **Future:** Add search-specific components here (e.g. suggestions popover, recent searches) using shadcn-ui; wire MailToolbar search input to navigate to `/mail/search?q=...`.

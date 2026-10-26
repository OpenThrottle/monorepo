/**
 * @description Single-sourced user-facing copy for the blog routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */
import type { GlobalFeatureOnboardingContent } from '@openthrottle/react-router-ui-global';
import type { LucideIcon } from 'lucide-react';
import {
  ArchiveIcon,
  BookOpenIcon,
  CalendarClockIcon,
  RadioIcon,
} from 'lucide-react';

import { BlogPostState } from '~/__generated__/graphql';

/** Page chrome, toolbar, table and pagination wording for `/blog`. */
export const BLOG_COPY = {
  agentBadge: `Agent`,
  agentBadgeHint: `Last edited by an agent`,
  columns: {
    author: `Author`,
    lastEditedBy: `Edited by`,
    published: `Published`,
    state: `State`,
    title: `Title`,
    updated: `Updated`,
  },
  firstPage: `First page`,
  goesLive: `goes live`,
  newPost: `New post`,
  nextPage: `Next page`,
  noValue: `—`,
  pageDescription: `Draft, schedule and review blog posts. Posts written by agents are marked so you can review them before anything goes live.`,
  pageTitle: `Blog`,
  pagination: `Pagination`,
  searchLabel: `Search posts`,
  searchPlaceholder: `Search title or slug…`,
  tabsLabel: `Post state`,
} as const;

/** Tab label for each post state. */
export const BLOG_STATE_LABELS: Record<BlogPostState, string> = {
  [BlogPostState.Archived]: `Archived`,
  [BlogPostState.Draft]: `Drafts`,
  [BlogPostState.Live]: `Live`,
  [BlogPostState.Scheduled]: `Scheduled`,
};

/** Singular state name for the per-row badge. */
export const BLOG_STATE_BADGE_LABELS: Record<BlogPostState, string> = {
  [BlogPostState.Archived]: `Archived`,
  [BlogPostState.Draft]: `Draft`,
  [BlogPostState.Live]: `Live`,
  [BlogPostState.Scheduled]: `Scheduled`,
};

/**
 * Empty-state copy for the tabs that have no onboarding pitch. Drafts is absent
 * on purpose: an empty Drafts tab renders {@link BLOG_ONBOARDING} instead.
 */
export const BLOG_EMPTY_COPY: Record<
  Exclude<BlogPostState, typeof BlogPostState.Draft>,
  {
    readonly description: string;
    readonly icon: LucideIcon;
    readonly title: string;
  }
> = {
  [BlogPostState.Archived]: {
    description: `Archived posts are hidden from the public blog but kept here.`,
    icon: ArchiveIcon,
    title: `Nothing archived`,
  },
  [BlogPostState.Live]: {
    description: `Published posts whose go-live time has passed show up here.`,
    icon: RadioIcon,
    title: `No live posts yet`,
  },
  [BlogPostState.Scheduled]: {
    description: `Posts with a future go-live time wait here until they publish.`,
    icon: CalendarClockIcon,
    title: `Nothing scheduled`,
  },
};

/** Shown when a search matches nothing in the active tab. */
export const BLOG_SEARCH_EMPTY_COPY = {
  clear: `Clear search`,
  description: `Try a different title or slug, or clear the search to see every post in this tab.`,
  title: `No posts match your search`,
} as const;

/**
 * @description Onboarding pitch for an empty, unfiltered Drafts tab. Conforms to
 * {@link GlobalFeatureOnboardingContent} and renders through the shared
 * `GlobalFeatureOnboarding` layout.
 */
export const BLOG_ONBOARDING = {
  cta: { label: `Write your first post`, to: `/blog/new` },
  icon: BookOpenIcon,
  internalUsage: `Agents draft posts through the OpenThrottle MCP; they can never publish. Every agent draft lands here, flagged as an agent edit, for a human to review, edit and publish.`,
  steps: [
    `Start a post here, or ask an agent to draft one through the MCP.`,
    `Review the draft — agent edits are marked so they stand out.`,
    `Schedule it or publish it; it moves to the Scheduled or Live tab.`,
  ],
  tagline: `Draft, review and publish blog posts, with agent drafts kept clearly separate from human edits.`,
  title: `Blog`,
  useCases: [
    `Let an agent draft a release post, then edit and publish it yourself.`,
    `Schedule a post for a launch and see exactly when it goes live, in your time zone.`,
    `Archive a post to take it off the public blog without losing it.`,
  ],
  whatItIs: `The authoring surface for the public blog. Posts move through Draft, Scheduled, Live and Archived, and only a person can publish.`,
} satisfies GlobalFeatureOnboardingContent;

/** `/blog/new`: the page reached by a plain link, and the create action's errors. */
export const BLOG_NEW_COPY = {
  createDraft: `Create draft`,
  creating: `Creating…`,
  description: `A new post starts as a private draft with a placeholder title and slug. Rename it, write it, then save.`,
  failed: `The draft could not be created.`,
  pageTitle: `New post`,
  slugConflict: `Could not find a free slug for the new draft. Try again.`,
  untitledTitle: `Untitled post`,
} as const;

/** Labels, hints and messages for the `/blog/:postId` editor. */
export const BLOG_EDITOR_COPY = {
  authorLabel: `Author`,
  bodyLabel: `Body (Markdown)`,
  coverAltHint: `Describe the image for screen readers. Required with a cover image.`,
  coverAltLabel: `Cover alt text`,
  coverAltRequired: `Add alt text for the cover image.`,
  coverLoadFailed: `This image could not be loaded. Check the URL.`,
  coverPreviewAlt: `Cover image preview`,
  coverUrlLabel: `Cover image URL`,
  coverUrlPlaceholder: `https://…`,
  detailsHeading: `Post details`,
  detailsToggle: `Show or hide post details`,
  editedBy: `Edited by`,
  editorLoading: `Loading editor…`,
  excerptHint: `Shown under the title and in post lists.`,
  excerptLabel: `Excerpt`,
  noAuthor: `No byline`,
  pageTitleFallback: `Post`,
  preview: `Preview`,
  previewEmptyBody: `Start writing in the editor and the post renders here.`,
  readOnlyDescription: `This post is no longer a draft. Only someone with publish access can edit it; you can still read it here.`,
  readOnlyTitle: `Only an admin can edit a published post`,
  save: `Save draft`,
  saveShortcut: `⌘S`,
  saved: `Saved`,
  saving: `Saving…`,
  seoDescriptionLabel: `SEO description`,
  seoHeading: `Search & sharing`,
  seoHint: `Leave empty to fall back to the title and excerpt.`,
  seoTitleLabel: `SEO title`,
  slugInvalid: `Use lowercase letters, digits and single hyphens, e.g. my-first-post.`,
  slugLabel: `Slug`,
  slugPrefix: `/blog/`,
  slugTaken: (slug: string): string => `The slug "${slug}" is already taken.`,
  tagsEmpty: `No tags yet.`,
  tagsLabel: `Tags`,
  tagsPlaceholder: `Choose tags`,
  tagsSearch: `Search tags…`,
  titleLabel: `Title`,
  titleRequired: `A post needs a title.`,
  unsaved: `Unsaved changes`,
} as const;

/** The stale-write dialog: the post changed on the server after it was loaded. */
export const BLOG_STALE_WRITE_COPY = {
  description: `Someone saved this post after you opened it. Reload to see their version and lose your edits, or overwrite their changes with yours.`,
  overwrite: `Overwrite`,
  overwriting: `Overwriting…`,
  reload: `Reload`,
  title: `This post changed since you opened it`,
} as const;

/** The leave-page guard shown when navigating away with unsaved edits. */
export const BLOG_UNSAVED_COPY = {
  description: `Your edits to this post have not been saved. Leave anyway and lose them?`,
  leave: `Leave without saving`,
  stay: `Keep editing`,
  title: `Discard unsaved changes?`,
} as const;

/** Publish, schedule, unpublish and archive controls of the editor header. */
export const BLOG_LIFECYCLE_COPY = {
  actions: {
    archive: `Archive`,
    moveToDraft: `Move to draft`,
    publish: `Publish`,
    reschedule: `Reschedule`,
    unpublish: `Unpublish`,
  },
  confirm: {
    archive: {
      confirm: `Archive post`,
      description: `The post is hidden from the site. Its publish date is kept, and you can publish it again later.`,
      title: `Archive this post?`,
    },
    cancel: `Cancel`,
    moveToDraft: {
      confirm: `Move to draft`,
      description: `The post goes back to draft, its publish date is cleared, and it stays off the site until you publish it again.`,
      title: `Move this post to draft?`,
    },
    unpublish: {
      confirm: `Unpublish post`,
      description: `The post goes back to draft and disappears from the site immediately. Its publish date is cleared.`,
      title: `Unpublish this post?`,
    },
  },
  errors: {
    past: `Pick a time in the future.`,
    required: `Choose a date and time.`,
  },
  popover: {
    publishNow: `Publish now`,
    publishNowHint: `Goes live on the site immediately.`,
    scheduleHeading: `Schedule for…`,
    scheduleLabel: `Go-live date and time`,
    scheduleSubmit: `Schedule`,
    timeZoneHint: (timeZone: string): string => `Your local time (${timeZone})`,
  },
  saveFirst: `Save your changes first`,
  scheduledFor: (when: string, timeZone: string): string =>
    `Scheduled for ${when} (${timeZone})`,
  toasts: {
    archived: `Post archived`,
    published: `Post published`,
    scheduled: `Post scheduled`,
    unpublished: `Post moved back to draft`,
  },
} as const;

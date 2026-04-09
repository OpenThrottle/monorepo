/**
 * @description Mock case studies for the /case-studies section. Replace with MDX/CMS when wired.
 */

import type { CaseStudyDetail, CaseStudyListItem } from '../types';

/** Static list + detail entries for case studies. */
export const MOCK_CASE_STUDIES: readonly CaseStudyDetail[] = [
  {
    body: `OpenThrottle helped our team ship features 40% faster by automating routine PR reviews and keeping our plans in sync with GitHub. We use the developer portal daily.`,
    company: 'Acme Corp',
    ctaLabel: 'Start free trial',
    ctaUrl: '/contact',
    excerpt: `How Acme Corp cut cycle time and kept plans in sync with the developer portal.`,
    id: 'acme-corp',
    metrics: [
      { label: 'Faster ship time', value: '40%' },
      { label: 'PRs auto-reviewed', value: '500+' },
    ],
    slug: 'acme-corp',
    tags: ['CI/CD', 'OpenThrottle', 'GitHub'],
    testimonial: {
      author: 'Jane Doe',
      company: 'Acme Corp',
      quote: `OpenThrottle changed how we coordinate between product and engineering.`,
      role: 'VP Engineering',
    },
    title: 'Faster shipping with automated PR workflows',
  },
  {
    body: `We adopted OpenThrottle for plan-driven development. Ralph and the queues gave us visibility into tasks and reduced context switching.`,
    company: 'StartupXYZ',
    excerpt: `StartupXYZ uses OpenThrottle plans and queues to keep engineering aligned.`,
    id: 'startup-xyz',
    slug: 'startup-xyz',
    tags: ['Plans', 'Queues', 'Ralph'],
    title: 'Plan-driven development at scale',
  },
] as const;

/** List items for the case-studies index (cards). */
export const MOCK_CASE_STUDY_LIST_ITEMS: readonly CaseStudyListItem[] =
  MOCK_CASE_STUDIES.map(
    ({
      body: _b,
      ctaLabel: _c,
      ctaUrl: _u,
      metrics: _m,
      testimonial: _t,
      ...rest
    }) => rest,
  );

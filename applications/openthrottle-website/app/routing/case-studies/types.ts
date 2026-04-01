/**
 * @description Content model types for the case-studies section. See docs/openthrottle/case-studies-content-model.md.
 */

/** Single metric (e.g. "Faster builds", "40%") for a case study detail. */
export interface CaseStudyMetric {
  readonly label: string;
  readonly value: string;
}

/** Testimonial quote and attribution for a case study detail. */
export interface CaseStudyTestimonial {
  readonly author: string;
  readonly company?: string;
  readonly quote: string;
  readonly role?: string;
}

/** List item shape for /case-studies index (cards, grid). */
export interface CaseStudyListItem {
  readonly company: string;
  readonly excerpt: string;
  readonly id: string;
  readonly logoUrl?: string;
  readonly publishedAt?: string;
  readonly slug: string;
  readonly tags?: readonly string[];
  readonly title: string;
}

/** Detail shape for /case-studies/:slug (full case study page). */
export interface CaseStudyDetail extends CaseStudyListItem {
  readonly body: string;
  readonly ctaLabel?: string;
  readonly ctaUrl?: string;
  readonly metrics?: readonly CaseStudyMetric[];
  readonly testimonial?: CaseStudyTestimonial;
}

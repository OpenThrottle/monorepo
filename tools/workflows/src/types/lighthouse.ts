export type LighthouseDeviceType = 'desktop' | 'mobile';

export interface LighthouseAuditConfig {
  readonly deviceType: LighthouseDeviceType;
  readonly url: string;
}

export interface LighthouseAuditIssue {
  readonly auditId: string;
  readonly description: string;
  readonly details?: {
    readonly items?: readonly unknown[];
    readonly overallSavingsBytes?: number;
    readonly overallSavingsMs?: number;
  };
  readonly displayValue?: string;
  readonly score: number | null;
  readonly title: string;
}

export interface LighthouseBaselineResult {
  readonly audits?: readonly LighthouseAuditIssue[];
  readonly deviceType: LighthouseDeviceType;
  readonly metrics: {
    readonly cls: number | null; // Cumulative Layout Shift (unitless)
    readonly inp: number | null; // Interaction to Next Paint (milliseconds)
    readonly lcp: number | null; // Largest Contentful Paint (seconds)
  };
  readonly performanceScore: number | null;
  readonly timestamp: string;
  readonly url: string;
}

export interface LighthouseBaselineResultsFile {
  readonly metadata: {
    readonly createdAt: string;
    readonly lastUpdated: string;
    readonly totalAudits: number;
  };
  readonly results: LighthouseBaselineResult[];
}

export type LighthouseCWVStatus = 'good' | 'needs-improvement' | 'poor';

export interface LighthouseCWVThresholds {
  readonly cls: {
    readonly good: number;
    readonly poor: number;
  };
  readonly inp: {
    readonly good: number;
    readonly poor: number;
  };
  readonly lcp: {
    readonly good: number;
    readonly poor: number;
  };
}

export interface LighthouseCWVReport {
  readonly cls: {
    readonly status: LighthouseCWVStatus;
    readonly value: number | null;
  };
  readonly deviceType: LighthouseDeviceType;
  readonly inp: {
    readonly status: LighthouseCWVStatus;
    readonly value: number | null;
  };
  readonly lcp: {
    readonly status: LighthouseCWVStatus;
    readonly value: number | null;
  };
  readonly url: string;
}

export interface LighthouseCWVSummaryReport {
  readonly pagesNeedingImprovement: {
    readonly cls: readonly string[];
    readonly inp: readonly string[];
    readonly lcp: readonly string[];
  };
  readonly reports: LighthouseCWVReport[];
  readonly timestamp: string;
}

export type LighthouseCWVImpact = 'lcp' | 'inp' | 'cls' | 'general';

export interface LighthouseActionableInsight {
  readonly auditId: string;
  readonly cwvImpact: readonly LighthouseCWVImpact[];
  readonly description: string;
  readonly deviceType: LighthouseDeviceType;
  readonly displayValue?: string;
  readonly priority: 'high' | 'medium' | 'low';
  readonly recommendation: string;
  readonly savings?: {
    readonly bytes?: number;
    readonly ms?: number;
  };
  readonly title: string;
  readonly url: string;
}

export interface LighthouseActionableInsightsReport {
  readonly insights: LighthouseActionableInsight[];
  readonly summary: {
    readonly highPriority: number;
    readonly lowPriority: number;
    readonly mediumPriority: number;
    readonly total: number;
  };
  readonly timestamp: string;
}

export interface LighthouseImageOptimizationIssue {
  readonly auditId: string;
  readonly description: string;
  readonly deviceType: LighthouseDeviceType;
  readonly displayValue?: string;
  readonly savings?: {
    readonly bytes?: number;
    readonly ms?: number;
  };
  readonly score: number | null;
  readonly title: string;
  readonly url: string;
}

export interface LighthouseImageOptimizationReport {
  readonly issues: LighthouseImageOptimizationIssue[];
  readonly summary: {
    readonly formatIssues: number;
    readonly lazyLoadingIssues: number;
    readonly optimizationIssues: number;
    readonly responsiveIssues: number;
    readonly sizingIssues: number;
    readonly total: number;
  };
  readonly timestamp: string;
}

export interface LighthouseCachingHeaderIssue {
  readonly auditId: string;
  readonly description: string;
  readonly deviceType: LighthouseDeviceType;
  readonly displayValue?: string;
  readonly savings?: {
    readonly bytes?: number;
    readonly ms?: number;
  };
  readonly score: number | null;
  readonly title: string;
  readonly url: string;
}

export interface LighthouseCachingHeadersReport {
  readonly issues: LighthouseCachingHeaderIssue[];
  readonly summary: {
    readonly total: number;
  };
  readonly timestamp: string;
}

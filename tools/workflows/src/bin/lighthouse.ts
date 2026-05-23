#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as chromeLauncher from 'chrome-launcher';
import { Command } from 'commander';
import lighthouse from 'lighthouse';
import type { Flags } from 'lighthouse';
import type {
  LighthouseActionableInsight,
  LighthouseActionableInsightsReport,
  LighthouseAuditConfig,
  LighthouseAuditIssue,
  LighthouseBaselineResult,
  LighthouseBaselineResultsFile,
  LighthouseCachingHeaderIssue,
  LighthouseCachingHeadersReport,
  LighthouseCWVImpact,
  LighthouseCWVReport,
  LighthouseCWVStatus,
  LighthouseCWVSummaryReport,
  LighthouseCWVThresholds,
  LighthouseDeviceType,
  LighthouseImageOptimizationIssue,
  LighthouseImageOptimizationReport,
} from '../types/lighthouse';

/**
 * @description Gets Lighthouse configuration for a specific device type
 */
const getLighthouseConfig = (deviceType: LighthouseDeviceType): Flags => {
  const baseConfig: Flags = {
    logLevel: 'info',
    onlyCategories: ['performance'],
    output: ['json', 'html'],
  };

  if (deviceType === 'mobile') {
    return {
      ...baseConfig,
      formFactor: 'mobile',
      screenEmulation: {
        deviceScaleFactor: 2.625,
        height: 823,
        mobile: true,
        width: 412,
      },
      throttling: {
        cpuSlowdownMultiplier: 4,
        rttMs: 150,
        throughputKbps: 1638.4,
      },
    } as Flags;
  }

  // Desktop configuration
  return {
    ...baseConfig,
    formFactor: 'desktop',
    screenEmulation: {
      deviceScaleFactor: 1,
      height: 940,
      mobile: false,
      width: 1350,
    },
    throttling: {
      cpuSlowdownMultiplier: 1,
      rttMs: 40,
      throughputKbps: 10240,
    },
  } as Flags;
};

/**
 * @description Gets Chrome flags for a specific device type
 */
const getChromeFlags = (deviceType: LighthouseDeviceType): string[] => {
  const baseFlags = ['--headless', '--no-sandbox', '--disable-gpu'];

  if (deviceType === 'mobile') {
    return [
      ...baseFlags,
      '--user-agent=Mozilla/5.0 (Linux; Android 10; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36',
    ];
  }

  return [
    ...baseFlags,
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  ];
};

/**
 * @description Gets CWV thresholds based on Google's recommended values
 */
const getCWVThresholds = (): LighthouseCWVThresholds => {
  return {
    cls: {
      good: 0.1,
      poor: 0.25,
    },
    inp: {
      good: 200, // milliseconds
      poor: 500, // milliseconds
    },
    lcp: {
      good: 2.5, // seconds
      poor: 4.0, // seconds
    },
  };
};

/**
 * @description Determines CWV status based on value and thresholds
 */
const getCWVStatus = (
  value: number | null,
  thresholds: { readonly good: number; readonly poor: number },
): LighthouseCWVStatus => {
  if (value === null) {
    return 'poor';
  }

  if (value <= thresholds.good) {
    return 'good';
  }

  if (value <= thresholds.poor) {
    return 'needs-improvement';
  }

  return 'poor';
};

/**
 * @description Gets the baseline results file path
 */
const getBaselineResultsPath = (): string => {
  const resultsDir = path.join(process.cwd(), 'tools', 'workflows', 'results');

  // Ensure results directory exists
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  return path.join(resultsDir, 'baseline-results.json');
};

/**
 * @description Gets the CWV report file path
 */
const getCWVReportPath = (): string => {
  const resultsDir = path.join(process.cwd(), 'tools', 'workflows', 'results');

  // Ensure results directory exists
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  return path.join(resultsDir, 'cwv-report.json');
};

/**
 * @description Gets the actionable insights report file path
 */
const getInsightsReportPath = (): string => {
  const resultsDir = path.join(process.cwd(), 'tools', 'workflows', 'results');

  // Ensure results directory exists
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  return path.join(resultsDir, 'actionable-insights.json');
};

/**
 * @description Gets the image optimization report file path
 */
const getImageOptimizationReportPath = (): string => {
  const resultsDir = path.join(process.cwd(), 'tools', 'workflows', 'results');

  // Ensure results directory exists
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  return path.join(resultsDir, 'image-optimization-report.json');
};

/**
 * @description Gets the caching headers report file path
 */
const getCachingHeadersReportPath = (): string => {
  const resultsDir = path.join(process.cwd(), 'tools', 'workflows', 'results');

  // Ensure results directory exists
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  return path.join(resultsDir, 'caching-headers-report.json');
};

/**
 * @description Maps Lighthouse audit IDs to their CWV impact
 */
const getAuditCWVImpact = (auditId: string): readonly LighthouseCWVImpact[] => {
  // Audits that primarily impact LCP
  const lcpAudits = new Set([
    'largest-contentful-paint',
    'render-blocking-resources',
    'unused-css-rules',
    'unused-javascript',
    'modern-image-formats',
    'uses-optimized-images',
    'uses-text-compression',
    'uses-responsive-images',
    'server-response-time',
    'preload-lcp-image',
    'efficient-animated-content',
    'offscreen-images',
    'unminified-css',
    'unminified-javascript',
  ]);

  // Audits that primarily impact INP
  const inpAudits = new Set([
    'interaction-to-next-paint',
    'long-tasks',
    'total-blocking-time',
    'mainthread-work-breakdown',
    'dom-size',
    'third-party-summary',
    'bootup-time',
    'unused-javascript',
    'unminified-javascript',
    'legacy-javascript',
  ]);

  // Audits that primarily impact CLS
  const clsAudits = new Set([
    'cumulative-layout-shift',
    'layout-shift-elements',
    'image-size-responsive',
    'unsized-images',
    'preload-fonts',
    'font-display',
  ]);

  const impacts: LighthouseCWVImpact[] = [];

  if (lcpAudits.has(auditId)) {
    impacts.push('lcp');
  }

  if (inpAudits.has(auditId)) {
    impacts.push('inp');
  }

  if (clsAudits.has(auditId)) {
    impacts.push('cls');
  }

  // If no specific CWV impact, mark as general performance
  if (impacts.length === 0) {
    impacts.push('general');
  }

  return impacts;
};

/**
 * @description Determines priority based on score and CWV impact
 */
const getInsightPriority = (
  score: number | null,
  cwvImpact: readonly LighthouseCWVImpact[],
): 'high' | 'medium' | 'low' => {
  // High priority: failing audits (score < 0.5) that impact CWV
  if (score !== null && score < 0.5) {
    const hasCWVImpact =
      cwvImpact.includes('lcp') ||
      cwvImpact.includes('inp') ||
      cwvImpact.includes('cls');

    if (hasCWVImpact) {
      return 'high';
    }

    return 'medium';
  }

  // Medium priority: needs improvement (0.5 <= score < 0.9) with CWV impact
  if (score !== null && score < 0.9) {
    const hasCWVImpact =
      cwvImpact.includes('lcp') ||
      cwvImpact.includes('inp') ||
      cwvImpact.includes('cls');

    if (hasCWVImpact) {
      return 'medium';
    }
  }

  return 'low';
};

/**
 * @description Generates actionable recommendation based on audit
 */
const generateRecommendation = (
  auditId: string,
  _title: string,
  description: string,
  _displayValue?: string,
): string => {
  // Common recommendations based on audit ID
  const recommendations: Record<string, string> = {
    'bootup-time': `Reduce JavaScript bootup time by code splitting, removing unused code, and optimizing bundle size.`,
    'dom-size': `Reduce DOM size by removing unnecessary elements or using virtual scrolling for long lists.`,
    'font-display': `Use font-display: swap or optional to prevent invisible text during font loading.`,
    'image-size-responsive': `Ensure images have proper width and height attributes to prevent layout shifts during loading.`,
    'layout-shift-elements': `Fix layout shifts by setting explicit dimensions on images, videos, and other dynamic content.`,
    'legacy-javascript': `Update to modern JavaScript syntax and remove polyfills for browsers that no longer need them.`,
    'long-tasks': `Break up long JavaScript tasks into smaller chunks. Use requestIdleCallback or Web Workers for heavy computations.`,
    'modern-image-formats': `Convert images to modern formats (WebP, AVIF) for better compression and faster loading.`,
    'offscreen-images': `Lazy load images that are below the fold to reduce initial page load time.`,
    'preload-fonts': `Preload critical fonts to prevent layout shifts when fonts load.`,
    'preload-lcp-image': `Preload the LCP image to prioritize its loading. Add <link rel="preload"> for the LCP image.`,
    'render-blocking-resources': `Remove or defer render-blocking resources. Consider inlining critical CSS or using resource hints (preload, preconnect).`,
    'server-response-time': `Improve server response time. Consider using a CDN, optimizing database queries, or upgrading hosting.`,
    'third-party-summary': `Review and optimize third-party scripts. Consider lazy loading or removing non-essential third-party code.`,
    'total-blocking-time': `Reduce JavaScript execution time. Code split, defer non-critical scripts, and optimize bundle size.`,
    'unminified-css': `Minify CSS files to reduce file size and improve load time.`,
    'unminified-javascript': `Minify JavaScript files to reduce file size and improve load time.`,
    'unsized-images': `Add explicit width and height attributes to images to prevent cumulative layout shift.`,
    'unused-css-rules': `Remove unused CSS rules or split CSS into critical and non-critical stylesheets. Use CSS purging tools.`,
    'unused-javascript': `Remove unused JavaScript code. Use code splitting and dynamic imports to load only what is needed.`,
    'uses-optimized-images': `Optimize images by compressing them without significant quality loss. Use tools like imagemin or similar.`,
    'uses-responsive-images': `Serve appropriately sized images for different screen sizes using srcset and sizes attributes.`,
    'uses-text-compression': `Enable text compression (gzip or brotli) on your server to reduce transfer sizes.`,
  };

  // Return specific recommendation if available
  if (recommendations[auditId]) {
    return recommendations[auditId];
  }

  // Generic recommendation based on description
  return `${description}. Review the audit details for specific optimization opportunities.`;
};

/**
 * @description Reads existing baseline results from file
 */
const readBaselineResults = (): LighthouseBaselineResultsFile | null => {
  const filePath = getBaselineResultsPath();

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content) as LighthouseBaselineResultsFile;

    return parsed;
  } catch {
    return null;
  }
};

/**
 * @description Saves baseline result to file
 */
const saveBaselineResult = (result: LighthouseBaselineResult): void => {
  const filePath = getBaselineResultsPath();
  const existing = readBaselineResults();
  const now = new Date().toISOString();

  let baselineFile: LighthouseBaselineResultsFile;

  if (existing) {
    // Append to existing results
    baselineFile = {
      metadata: {
        ...existing.metadata,
        lastUpdated: now,
        totalAudits: existing.results.length + 1,
      },
      results: [...existing.results, result],
    };
  } else {
    // Create new baseline file
    baselineFile = {
      metadata: {
        createdAt: now,
        lastUpdated: now,
        totalAudits: 1,
      },
      results: [result],
    };
  }

  fs.writeFileSync(
    filePath,
    JSON.stringify(baselineFile, null, 2) + '\n',
    'utf-8',
  );

  console.log(
    `💾 Baseline result saved to: ${path.relative(process.cwd(), filePath)}`,
  );
};

/**
 * @description Runs a Lighthouse audit for a specific URL and device type
 */
const runAudit = async (config: LighthouseAuditConfig): Promise<void> => {
  const { deviceType, url } = config;

  console.log(`🔍 Running Lighthouse audit for ${deviceType}...`);
  console.log(`📍 URL: ${url}`);

  const chromeFlags = getChromeFlags(deviceType);
  const lighthouseConfig = getLighthouseConfig(deviceType);

  const chrome = await chromeLauncher.launch({
    chromeFlags,
  });

  try {
    const runnerResult = await lighthouse(url, {
      ...lighthouseConfig,
      port: chrome.port,
    });

    const report = runnerResult?.lhr ?? null;

    if (report) {
      const performanceScore = report.categories?.performance?.score
        ? Math.round(report.categories.performance.score * 100)
        : null;

      console.log(`✅ ${deviceType.toUpperCase()} audit completed for ${url}`);
      console.log(
        `📊 Performance Score: ${performanceScore !== null ? `${performanceScore}/100` : 'N/A'}`,
      );

      // Extract Core Web Vitals
      const metrics = report.audits;
      const lcp = metrics['largest-contentful-paint']?.numericValue ?? null;
      const inp = metrics['interaction-to-next-paint']?.numericValue ?? null;
      const cls = metrics['cumulative-layout-shift']?.numericValue ?? null;

      console.log(`📈 Core Web Vitals:`);

      if (cls !== null) console.log(`   CLS: ${cls.toFixed(3)}`);
      if (inp !== null) console.log(`   INP: ${inp.toFixed(0)}ms`);
      if (lcp !== null) console.log(`   LCP: ${(lcp / 1000).toFixed(2)}s`);

      // Extract audit issues for actionable insights
      const auditIssues = extractAuditIssues(report.audits);

      // Save baseline result
      // Note: LCP is stored in seconds, INP in milliseconds, CLS as-is
      const baselineResult: LighthouseBaselineResult = {
        audits: auditIssues,
        deviceType,
        metrics: {
          cls,
          inp: inp !== null ? inp : null, // Keep INP in milliseconds
          lcp: lcp !== null ? lcp / 1000 : null, // Convert LCP to seconds
        },
        performanceScore,
        timestamp: new Date().toISOString(),
        url,
      };

      saveBaselineResult(baselineResult);

      console.log(`🔦 Full report available in output`);
    } else {
      console.warn(`⚠️  No report generated for ${url}`);
    }
  } catch (error) {
    const isError = error instanceof Error;
    const errorMessage = isError ? error.message : String(error);

    console.error(`🚨 Error running audit for ${url}:`, errorMessage);
    throw error;
  } finally {
    await chrome.kill();
  }
};

/**
 * @description Runs audits for both mobile and desktop device types
 */
const runAuditsForAllDevices = async (url: string): Promise<void> => {
  const deviceTypes: LighthouseDeviceType[] = ['mobile', 'desktop'];

  // Sequential execution is intentional to avoid resource contention
  for (const deviceType of deviceTypes) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await runAudit({ deviceType, url });
      console.log(''); // Add spacing between audits
    } catch (error) {
      const isError = error instanceof Error;
      const errorMessage = isError ? error.message : String(error);

      console.error(`🚨 Failed to run ${deviceType} audit:`, errorMessage);
      // Continue with next device type even if one fails
    }
  }
};

/**
 * @description Extracts audit issues from Lighthouse report
 */
const extractAuditIssues = (
  audits: Record<string, unknown>,
): readonly LighthouseAuditIssue[] => {
  const issues: LighthouseAuditIssue[] = [];

  for (const [auditId, audit] of Object.entries(audits)) {
    if (
      audit &&
      typeof audit === 'object' &&
      'score' in audit &&
      'title' in audit
    ) {
      const auditObj = audit as {
        readonly description?: string;
        readonly details?: {
          readonly items?: readonly unknown[];
          readonly overallSavingsBytes?: number;
          readonly overallSavingsMs?: number;
        };
        readonly displayValue?: string;
        readonly score: number | null;
        readonly title: string;
      };

      // Only include audits that have issues (score < 1.0 or null)
      if (auditObj.score === null || auditObj.score < 1.0) {
        issues.push({
          auditId,
          description: auditObj.description ?? '',
          details: auditObj.details,
          displayValue: auditObj.displayValue,
          score: auditObj.score,
          title: auditObj.title,
        });
      }
    }
  }

  return issues;
};

/**
 * @description Generates actionable insights from baseline results
 */
const generateActionableInsights =
  (): LighthouseActionableInsightsReport | null => {
    const baselineResults = readBaselineResults();

    if (!baselineResults || baselineResults.results.length === 0) {
      return null;
    }

    const insights: LighthouseActionableInsight[] = [];

    for (const result of baselineResults.results) {
      if (!result.audits || result.audits.length === 0) {
        continue;
      }

      for (const audit of result.audits) {
        const cwvImpact = getAuditCWVImpact(audit.auditId);
        const priority = getInsightPriority(audit.score, cwvImpact);
        const recommendation = generateRecommendation(
          audit.auditId,
          audit.title,
          audit.description,
          audit.displayValue,
        );

        insights.push({
          auditId: audit.auditId,
          cwvImpact,
          description: audit.description,
          deviceType: result.deviceType,
          displayValue: audit.displayValue,
          priority,
          recommendation,
          savings: audit.details
            ? {
                bytes: audit.details.overallSavingsBytes,
                ms: audit.details.overallSavingsMs,
              }
            : undefined,
          title: audit.title,
          url: result.url,
        });
      }
    }

    // Sort by priority (high > medium > low) and then by potential savings
    insights.sort((a, b) => {
      const priorityOrder = { high: 3, low: 1, medium: 2 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // Within same priority, sort by potential savings (ms first, then bytes)
      const aSavings = a.savings?.ms ?? a.savings?.bytes ?? 0;
      const bSavings = b.savings?.ms ?? b.savings?.bytes ?? 0;

      return bSavings - aSavings;
    });

    const highPriority = insights.filter((i) => i.priority === 'high').length;
    const mediumPriority = insights.filter(
      (i) => i.priority === 'medium',
    ).length;
    const lowPriority = insights.filter((i) => i.priority === 'low').length;

    return {
      insights,
      summary: {
        highPriority,
        lowPriority,
        mediumPriority,
        total: insights.length,
      },
      timestamp: new Date().toISOString(),
    };
  };

/**
 * @description Saves actionable insights report to file
 */
const saveInsightsReport = (
  report: LighthouseActionableInsightsReport,
): void => {
  const filePath = getInsightsReportPath();

  fs.writeFileSync(filePath, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  console.log(
    `💾 Actionable insights report saved to: ${path.relative(process.cwd(), filePath)}`,
  );
};

/**
 * @description Formats and displays actionable insights report
 */
const displayActionableInsights = (
  report: LighthouseActionableInsightsReport,
): void => {
  console.log('\n' + '='.repeat(80));
  console.log('💡 ACTIONABLE INSIGHTS & RECOMMENDATIONS');
  console.log('='.repeat(80) + '\n');

  console.log('📊 Summary:');
  console.log(`   Total Issues: ${report.summary.total}`);
  console.log(`   🔴 High Priority: ${report.summary.highPriority}`);
  console.log(`   🟡 Medium Priority: ${report.summary.mediumPriority}`);
  console.log(`   🟢 Low Priority: ${report.summary.lowPriority}`);
  console.log('');

  // Group insights by priority
  const highPriorityInsights = report.insights.filter(
    (i) => i.priority === 'high',
  );
  const mediumPriorityInsights = report.insights.filter(
    (i) => i.priority === 'medium',
  );
  const lowPriorityInsights = report.insights.filter(
    (i) => i.priority === 'low',
  );

  // Display high priority insights
  if (highPriorityInsights.length > 0) {
    console.log('🔴 HIGH PRIORITY ISSUES (Address First):\n');

    for (const insight of highPriorityInsights) {
      console.log(`📍 ${insight.url} (${insight.deviceType.toUpperCase()})`);
      console.log(`   ${insight.title}`);
      if (insight.displayValue) {
        console.log(`   Impact: ${insight.displayValue}`);
      }
      if (insight.savings) {
        if (insight.savings.ms) {
          console.log(`   Potential Savings: ${insight.savings.ms}ms`);
        }
        if (insight.savings.bytes) {
          const kb = (insight.savings.bytes / 1024).toFixed(2);
          console.log(`   Potential Savings: ${kb} KB`);
        }
      }
      const cwvLabels = insight.cwvImpact
        .map((impact) => impact.toUpperCase())
        .join(', ');
      console.log(`   CWV Impact: ${cwvLabels}`);
      console.log(`   💡 Recommendation: ${insight.recommendation}`);
      console.log('');
    }
  }

  // Display medium priority insights
  if (mediumPriorityInsights.length > 0) {
    console.log('🟡 MEDIUM PRIORITY ISSUES:\n');

    for (const insight of mediumPriorityInsights.slice(0, 10)) {
      // Limit to top 10 medium priority
      console.log(`📍 ${insight.url} (${insight.deviceType.toUpperCase()})`);
      console.log(`   ${insight.title}`);
      if (insight.displayValue) {
        console.log(`   Impact: ${insight.displayValue}`);
      }
      const cwvLabels = insight.cwvImpact
        .map((impact) => impact.toUpperCase())
        .join(', ');
      console.log(`   CWV Impact: ${cwvLabels}`);
      console.log(`   💡 Recommendation: ${insight.recommendation}`);
      console.log('');
    }

    if (mediumPriorityInsights.length > 10) {
      console.log(
        `   ... and ${mediumPriorityInsights.length - 10} more medium priority issues\n`,
      );
    }
  }

  // Display low priority insights summary
  if (lowPriorityInsights.length > 0) {
    console.log(
      `🟢 LOW PRIORITY ISSUES: ${lowPriorityInsights.length} additional optimization opportunities\n`,
    );
    console.log(
      '   (See actionable-insights.json for complete list of all issues)',
    );
  }

  console.log('='.repeat(80) + '\n');
};

/**
 * @description Generates CWV report from baseline results
 */
const generateCWVReport = (): LighthouseCWVSummaryReport | null => {
  const baselineResults = readBaselineResults();

  if (!baselineResults || baselineResults.results.length === 0) {
    return null;
  }

  const thresholds = getCWVThresholds();
  const reports: LighthouseCWVReport[] = [];

  for (const result of baselineResults.results) {
    const lcpStatus = getCWVStatus(result.metrics.lcp, thresholds.lcp);
    const inpStatus = getCWVStatus(result.metrics.inp, thresholds.inp);
    const clsStatus = getCWVStatus(result.metrics.cls, thresholds.cls);

    reports.push({
      cls: {
        status: clsStatus,
        value: result.metrics.cls,
      },
      deviceType: result.deviceType,
      inp: {
        status: inpStatus,
        value: result.metrics.inp,
      },
      lcp: {
        status: lcpStatus,
        value: result.metrics.lcp,
      },
      url: result.url,
    });
  }

  // Identify pages needing improvement
  const pagesNeedingImprovement = {
    cls: reports
      .filter(
        (report) =>
          report.cls.status === 'needs-improvement' ||
          report.cls.status === 'poor',
      )
      .map((report) => `${report.url} (${report.deviceType})`),
    inp: reports
      .filter(
        (report) =>
          report.inp.status === 'needs-improvement' ||
          report.inp.status === 'poor',
      )
      .map((report) => `${report.url} (${report.deviceType})`),
    lcp: reports
      .filter(
        (report) =>
          report.lcp.status === 'needs-improvement' ||
          report.lcp.status === 'poor',
      )
      .map((report) => `${report.url} (${report.deviceType})`),
  };

  return {
    pagesNeedingImprovement,
    reports,
    timestamp: new Date().toISOString(),
  };
};

/**
 * @description Saves CWV report to file
 */
const saveCWVReport = (report: LighthouseCWVSummaryReport): void => {
  const filePath = getCWVReportPath();

  fs.writeFileSync(filePath, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  console.log(
    `💾 CWV report saved to: ${path.relative(process.cwd(), filePath)}`,
  );
};

/**
 * @description Formats and displays CWV summary report
 */
const displayCWVReport = (report: LighthouseCWVSummaryReport): void => {
  const thresholds = getCWVThresholds();

  console.log('\n' + '='.repeat(80));
  console.log('📊 CORE WEB VITALS SUMMARY REPORT');
  console.log('='.repeat(80) + '\n');

  // Display individual reports
  console.log('📈 Individual Page Metrics:\n');

  for (const pageReport of report.reports) {
    console.log(
      `📍 ${pageReport.url} (${pageReport.deviceType.toUpperCase()})`,
    );

    // LCP
    if (pageReport.lcp.value !== null) {
      const lcpEmoji =
        pageReport.lcp.status === 'good'
          ? '✅'
          : pageReport.lcp.status === 'needs-improvement'
            ? '⚠️'
            : '❌';
      console.log(
        `   ${lcpEmoji} LCP: ${pageReport.lcp.value.toFixed(2)}s (${pageReport.lcp.status}) [Good: ≤${thresholds.lcp.good}s, Poor: >${thresholds.lcp.poor}s]`,
      );
    } else {
      console.log('   ❌ LCP: N/A (not measured)');
    }

    // INP (stored in milliseconds)
    if (pageReport.inp.value !== null) {
      const inpEmoji =
        pageReport.inp.status === 'good'
          ? '✅'
          : pageReport.inp.status === 'needs-improvement'
            ? '⚠️'
            : '❌';
      console.log(
        `   ${inpEmoji} INP: ${Math.round(pageReport.inp.value)}ms (${pageReport.inp.status}) [Good: ≤${thresholds.inp.good}ms, Poor: >${thresholds.inp.poor}ms]`,
      );
    } else {
      console.log('   ❌ INP: N/A (not measured)');
    }

    // CLS
    if (pageReport.cls.value !== null) {
      const clsEmoji =
        pageReport.cls.status === 'good'
          ? '✅'
          : pageReport.cls.status === 'needs-improvement'
            ? '⚠️'
            : '❌';
      console.log(
        `   ${clsEmoji} CLS: ${pageReport.cls.value.toFixed(3)} (${pageReport.cls.status}) [Good: ≤${thresholds.cls.good}, Poor: >${thresholds.cls.poor}]`,
      );
    } else {
      console.log('   ❌ CLS: N/A (not measured)');
    }

    console.log('');
  }

  // Display pages needing improvement
  console.log('🔧 Pages Needing Improvement:\n');

  if (report.pagesNeedingImprovement.lcp.length > 0) {
    console.log('   ⚠️  LCP (Largest Contentful Paint):');
    for (const page of report.pagesNeedingImprovement.lcp) {
      console.log(`      - ${page}`);
    }
    console.log('');
  } else {
    console.log('   ✅ LCP: All pages meet good thresholds\n');
  }

  if (report.pagesNeedingImprovement.inp.length > 0) {
    console.log('   ⚠️  INP (Interaction to Next Paint):');
    for (const page of report.pagesNeedingImprovement.inp) {
      console.log(`      - ${page}`);
    }
    console.log('');
  } else {
    console.log('   ✅ INP: All pages meet good thresholds\n');
  }

  if (report.pagesNeedingImprovement.cls.length > 0) {
    console.log('   ⚠️  CLS (Cumulative Layout Shift):');
    for (const page of report.pagesNeedingImprovement.cls) {
      console.log(`      - ${page}`);
    }
    console.log('');
  } else {
    console.log('   ✅ CLS: All pages meet good thresholds\n');
  }

  console.log('='.repeat(80) + '\n');
};

/**
 * @description Generates image optimization report from baseline results
 */
const generateImageOptimizationReport =
  (): LighthouseImageOptimizationReport | null => {
    const baselineResults = readBaselineResults();

    if (!baselineResults || baselineResults.results.length === 0) {
      return null;
    }

    // Image-related audit IDs
    const imageAuditIds = new Set([
      'modern-image-formats',
      'uses-optimized-images',
      'uses-responsive-images',
      'offscreen-images',
      'image-size-responsive',
      'unsized-images',
    ]);

    const issues: LighthouseImageOptimizationIssue[] = [];

    for (const result of baselineResults.results) {
      if (!result.audits || result.audits.length === 0) {
        continue;
      }

      for (const audit of result.audits) {
        if (imageAuditIds.has(audit.auditId)) {
          // Only include audits with issues (score < 1.0 or null)
          if (audit.score === null || audit.score < 1.0) {
            issues.push({
              auditId: audit.auditId,
              description: audit.description,
              deviceType: result.deviceType,
              displayValue: audit.displayValue,
              savings: audit.details
                ? {
                    bytes: audit.details.overallSavingsBytes,
                    ms: audit.details.overallSavingsMs,
                  }
                : undefined,
              score: audit.score,
              title: audit.title,
              url: result.url,
            });
          }
        }
      }
    }

    // Categorize issues
    const formatIssues = issues.filter(
      (issue) => issue.auditId === 'modern-image-formats',
    ).length;
    const optimizationIssues = issues.filter(
      (issue) => issue.auditId === 'uses-optimized-images',
    ).length;
    const responsiveIssues = issues.filter(
      (issue) => issue.auditId === 'uses-responsive-images',
    ).length;
    const lazyLoadingIssues = issues.filter(
      (issue) => issue.auditId === 'offscreen-images',
    ).length;
    const sizingIssues = issues.filter(
      (issue) =>
        issue.auditId === 'image-size-responsive' ||
        issue.auditId === 'unsized-images',
    ).length;

    return {
      issues,
      summary: {
        formatIssues,
        lazyLoadingIssues,
        optimizationIssues,
        responsiveIssues,
        sizingIssues,
        total: issues.length,
      },
      timestamp: new Date().toISOString(),
    };
  };

/**
 * @description Saves image optimization report to file
 */
const saveImageOptimizationReport = (
  report: LighthouseImageOptimizationReport,
): void => {
  const filePath = getImageOptimizationReportPath();

  fs.writeFileSync(filePath, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  console.log(
    `💾 Image optimization report saved to: ${path.relative(process.cwd(), filePath)}`,
  );
};

/**
 * @description Formats and displays image optimization report
 */
const displayImageOptimizationReport = (
  report: LighthouseImageOptimizationReport,
): void => {
  console.log('\n' + '='.repeat(80));
  console.log('🖼️  IMAGE OPTIMIZATION REPORT');
  console.log('='.repeat(80) + '\n');

  console.log('📊 Summary:');
  console.log(`   Total Issues: ${report.summary.total}`);
  console.log(`   Format Issues: ${report.summary.formatIssues}`);
  console.log(`   Optimization Issues: ${report.summary.optimizationIssues}`);
  console.log(`   Responsive Image Issues: ${report.summary.responsiveIssues}`);
  console.log(`   Lazy Loading Issues: ${report.summary.lazyLoadingIssues}`);
  console.log(`   Sizing Issues: ${report.summary.sizingIssues}`);
  console.log('');

  if (report.issues.length === 0) {
    console.log('✅ No image optimization issues found!\n');
    console.log('='.repeat(80) + '\n');

    return;
  }

  // Group issues by type
  const formatIssues = report.issues.filter(
    (issue) => issue.auditId === 'modern-image-formats',
  );
  const optimizationIssues = report.issues.filter(
    (issue) => issue.auditId === 'uses-optimized-images',
  );
  const responsiveIssues = report.issues.filter(
    (issue) => issue.auditId === 'uses-responsive-images',
  );
  const lazyLoadingIssues = report.issues.filter(
    (issue) => issue.auditId === 'offscreen-images',
  );
  const sizingIssues = report.issues.filter(
    (issue) =>
      issue.auditId === 'image-size-responsive' ||
      issue.auditId === 'unsized-images',
  );

  // Display format issues
  if (formatIssues.length > 0) {
    console.log('📸 Image Format Issues:\n');
    for (const issue of formatIssues) {
      console.log(`📍 ${issue.url} (${issue.deviceType.toUpperCase()})`);
      console.log(`   ${issue.title}`);
      if (issue.displayValue) {
        console.log(`   Impact: ${issue.displayValue}`);
      }
      if (issue.savings) {
        if (issue.savings.bytes) {
          const kb = (issue.savings.bytes / 1024).toFixed(2);
          console.log(`   Potential Savings: ${kb} KB`);
        }
        if (issue.savings.ms) {
          console.log(`   Potential Savings: ${issue.savings.ms}ms`);
        }
      }
      console.log(`   💡 Recommendation: ${issue.description}`);
      console.log('');
    }
  }

  // Display optimization issues
  if (optimizationIssues.length > 0) {
    console.log('⚡ Image Optimization Issues:\n');
    for (const issue of optimizationIssues) {
      console.log(`📍 ${issue.url} (${issue.deviceType.toUpperCase()})`);
      console.log(`   ${issue.title}`);
      if (issue.displayValue) {
        console.log(`   Impact: ${issue.displayValue}`);
      }
      if (issue.savings) {
        if (issue.savings.bytes) {
          const kb = (issue.savings.bytes / 1024).toFixed(2);
          console.log(`   Potential Savings: ${kb} KB`);
        }
        if (issue.savings.ms) {
          console.log(`   Potential Savings: ${issue.savings.ms}ms`);
        }
      }
      console.log(`   💡 Recommendation: ${issue.description}`);
      console.log('');
    }
  }

  // Display responsive image issues
  if (responsiveIssues.length > 0) {
    console.log('📱 Responsive Image Issues:\n');
    for (const issue of responsiveIssues) {
      console.log(`📍 ${issue.url} (${issue.deviceType.toUpperCase()})`);
      console.log(`   ${issue.title}`);
      if (issue.displayValue) {
        console.log(`   Impact: ${issue.displayValue}`);
      }
      console.log(`   💡 Recommendation: ${issue.description}`);
      console.log('');
    }
  }

  // Display lazy loading issues
  if (lazyLoadingIssues.length > 0) {
    console.log('😴 Lazy Loading Issues:\n');
    for (const issue of lazyLoadingIssues) {
      console.log(`📍 ${issue.url} (${issue.deviceType.toUpperCase()})`);
      console.log(`   ${issue.title}`);
      if (issue.displayValue) {
        console.log(`   Impact: ${issue.displayValue}`);
      }
      if (issue.savings) {
        if (issue.savings.bytes) {
          const kb = (issue.savings.bytes / 1024).toFixed(2);
          console.log(`   Potential Savings: ${kb} KB`);
        }
        if (issue.savings.ms) {
          console.log(`   Potential Savings: ${issue.savings.ms}ms`);
        }
      }
      console.log(`   💡 Recommendation: ${issue.description}`);
      console.log('');
    }
  }

  // Display sizing issues
  if (sizingIssues.length > 0) {
    console.log('📏 Image Sizing Issues:\n');
    for (const issue of sizingIssues) {
      console.log(`📍 ${issue.url} (${issue.deviceType.toUpperCase()})`);
      console.log(`   ${issue.title}`);
      if (issue.displayValue) {
        console.log(`   Impact: ${issue.displayValue}`);
      }
      console.log(`   💡 Recommendation: ${issue.description}`);
      console.log('');
    }
  }

  console.log('='.repeat(80) + '\n');
};

/**
 * @description Generates caching headers report from baseline results
 */
const generateCachingHeadersReport =
  (): LighthouseCachingHeadersReport | null => {
    const baselineResults = readBaselineResults();

    if (!baselineResults || baselineResults.results.length === 0) {
      return null;
    }

    // Caching-related audit IDs
    const cachingAuditIds = new Set(['uses-long-cache-ttl']);

    const issues: LighthouseCachingHeaderIssue[] = [];

    for (const result of baselineResults.results) {
      if (!result.audits || result.audits.length === 0) {
        continue;
      }

      for (const audit of result.audits) {
        if (cachingAuditIds.has(audit.auditId)) {
          // Only include audits with issues (score < 1.0 or null)
          if (audit.score === null || audit.score < 1.0) {
            issues.push({
              auditId: audit.auditId,
              description: audit.description,
              deviceType: result.deviceType,
              displayValue: audit.displayValue,
              savings: audit.details
                ? {
                    bytes: audit.details.overallSavingsBytes,
                    ms: audit.details.overallSavingsMs,
                  }
                : undefined,
              score: audit.score,
              title: audit.title,
              url: result.url,
            });
          }
        }
      }
    }

    return {
      issues,
      summary: {
        total: issues.length,
      },
      timestamp: new Date().toISOString(),
    };
  };

/**
 * @description Saves caching headers report to file
 */
const saveCachingHeadersReport = (
  report: LighthouseCachingHeadersReport,
): void => {
  const filePath = getCachingHeadersReportPath();

  fs.writeFileSync(filePath, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  console.log(
    `💾 Caching headers report saved to: ${path.relative(process.cwd(), filePath)}`,
  );
};

/**
 * @description Formats and displays caching headers report
 */
const displayCachingHeadersReport = (
  report: LighthouseCachingHeadersReport,
): void => {
  console.log('\n' + '='.repeat(80));
  console.log('💾 CACHING HEADERS REPORT');
  console.log('='.repeat(80) + '\n');

  console.log('📊 Summary:');
  console.log(`   Total Issues: ${report.summary.total}`);
  console.log('');

  if (report.issues.length === 0) {
    console.log('✅ No caching header issues found!\n');
    console.log('='.repeat(80) + '\n');

    return;
  }

  console.log('⚠️  Caching Header Issues:\n');

  for (const issue of report.issues) {
    console.log(`📍 ${issue.url} (${issue.deviceType.toUpperCase()})`);
    console.log(`   ${issue.title}`);
    if (issue.displayValue) {
      console.log(`   Impact: ${issue.displayValue}`);
    }
    if (issue.savings) {
      if (issue.savings.bytes) {
        const kb = (issue.savings.bytes / 1024).toFixed(2);
        console.log(`   Potential Savings: ${kb} KB`);
      }
      if (issue.savings.ms) {
        console.log(`   Potential Savings: ${issue.savings.ms}ms`);
      }
    }
    console.log(`   💡 Recommendation: ${issue.description}`);
    console.log('');
  }

  console.log('='.repeat(80) + '\n');
};

/**
 * @description Validates if a string is a valid URL
 */
const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const DEFAULT_URLS = [
  'https://mattscholta.com',
  'https://mattscholta.com/blog',
  'https://mattscholta.com/blog/boilerplate-to-generators',
];

/**
 * @description Resolves URLs from Commander options or returns default URLs
 */
const resolveUrls = (urlOpts: readonly string[]): string[] => {
  if (urlOpts.length === 0) {
    return [...DEFAULT_URLS];
  }

  const valid: string[] = [];
  for (const urlArg of urlOpts) {
    if (isValidUrl(urlArg)) {
      valid.push(urlArg);
    } else {
      console.warn(`⚠️  Invalid URL skipped: ${urlArg}`);
    }
  }

  if (valid.length === 0) {
    console.warn('⚠️  No valid URLs provided, using default URLs');

    return [...DEFAULT_URLS];
  }

  return valid;
};

/**
 * @description Runs audits for all URLs and device types
 */
const runAuditsForAllUrlsAndDevices = async (
  urls: string[],
  deviceType?: LighthouseDeviceType,
): Promise<void> => {
  console.log(`🔍 Running audits for ${urls.length} URL(s)...\n`);

  // Sequential execution is intentional to avoid resource contention
  for (const url of urls) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 Processing URL: ${url}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      if (deviceType && (deviceType === 'mobile' || deviceType === 'desktop')) {
        // Run audit for specific device type
        // eslint-disable-next-line no-await-in-loop
        await runAudit({ deviceType, url });
      } else {
        // Run audits for both device types
        // eslint-disable-next-line no-await-in-loop
        await runAuditsForAllDevices(url);
      }
    } catch (error) {
      const isError = error instanceof Error;
      const errorMessage = isError ? error.message : String(error);

      console.error(`🚨 Failed to process URL ${url}:`, errorMessage);
      // Continue with next URL even if one fails
    }

    console.log(''); // Add spacing between URLs
  }

  // Generate and display CWV report after all audits complete
  const cwvReport = generateCWVReport();

  if (cwvReport) {
    displayCWVReport(cwvReport);
    saveCWVReport(cwvReport);
  } else {
    console.log(
      '⚠️  No baseline results found. Run audits first to generate CWV report.',
    );
  }

  // Generate and display actionable insights after all audits complete
  const insightsReport = generateActionableInsights();

  if (insightsReport) {
    displayActionableInsights(insightsReport);
    saveInsightsReport(insightsReport);
  } else {
    console.log(
      '⚠️  No audit data found. Run audits first to generate actionable insights.',
    );
  }

  // Generate and display image optimization report after all audits complete
  const imageOptimizationReport = generateImageOptimizationReport();

  if (imageOptimizationReport) {
    displayImageOptimizationReport(imageOptimizationReport);
    saveImageOptimizationReport(imageOptimizationReport);
  } else {
    console.log(
      '⚠️  No baseline results found. Run audits first to generate image optimization report.',
    );
  }

  // Generate and display caching headers report after all audits complete
  const cachingHeadersReport = generateCachingHeadersReport();

  if (cachingHeadersReport) {
    displayCachingHeadersReport(cachingHeadersReport);
    saveCachingHeadersReport(cachingHeadersReport);
  } else {
    console.log(
      '⚠️  No baseline results found. Run audits first to generate caching headers report.',
    );
  }
};

interface LighthouseOptions {
  device: 'both' | 'desktop' | 'mobile';
  url: string[];
}

/**
 * @description Main entry point
 */
const main = async (): Promise<void> => {
  const program = new Command();

  program
    .name('workflow-lighthouse')
    .description('Lighthouse performance audits')
    .option(
      '-u, --url <url>',
      'URL(s) to audit (can be repeated); defaults to mattscholta.com if omitted',
      (v: string, prev: string[]) => (prev ?? []).concat(v),
      [] as string[],
    )
    .option(
      '-d, --device <type>',
      'Device type: mobile, desktop, or both',
      'both',
    )
    .action(async (options: LighthouseOptions) => {
      const device = options.device.toLowerCase();
      if (device !== 'both' && device !== 'mobile' && device !== 'desktop') {
        program.error(
          `Invalid --device: ${options.device}. Use mobile, desktop, or both.`,
          { exitCode: 1 },
        );
      }

      const urls = resolveUrls(options.url);
      const deviceType: LighthouseDeviceType | undefined =
        device === 'both' ? undefined : (device as LighthouseDeviceType);

      await runAuditsForAllUrlsAndDevices(urls, deviceType);
      process.exit(0);
    });

  await program.parseAsync();
};

main().catch((error) => {
  console.error(`🚨 Fatal error:`, error);
  process.exit(1);
});

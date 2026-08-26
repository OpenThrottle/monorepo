#!/usr/bin/env node

/**
 * @description The automated half of the publish checklist: scan everything a video
 * puts in front of a viewer for secrets and real identities, and fail on a hit.
 *
 *   pnpm exec tsx scan/leak-scan.ts --script 03-first-plan
 *
 * Scans the per-beat page-text dumps the runner writes (`output/<slug>/text/*.txt`),
 * plus the caption sidecar and the upload metadata — because those ship too, and a
 * description or a caption can leak just as easily as a frame.
 *
 * Why DOM text and not OCR: the DOM already knows exactly what was rendered, with no
 * transcription errors and no tesseract dependency. It cannot see text baked into an
 * image, which is a real gap and is called out in the checklist as a human item.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { captureDir, takeDir } from '../runner/format';
import { getEpisode, resolveVariant } from '../episodes/registry';
import { scanText } from './scan-text';
import type { ScanKind } from './rules';

const argValue = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);

  return index === -1 ? undefined : process.argv[index + 1];
};

const main = (): void => {
  const slug = argValue('script');

  if (!slug) {
    console.error('leak-scan: --script <slug> is required');
    process.exit(1);
  }

  // The per-beat text dumps belong to the capture, which every variant shares.
  // The .srt and metadata.json belong to one take.
  const variant = resolveVariant(getEpisode(slug), argValue('variant'));
  const outputDir = captureDir(slug);
  const takeRoot = takeDir(slug, variant.id);
  const sources: { kind: ScanKind; name: string; text: string }[] = [];

  for (const textDir of [
    join(outputDir, 'text'),
    join(outputDir, 'portrait', 'text'),
  ]) {
    if (!existsSync(textDir)) {
      continue;
    }

    for (const file of readdirSync(textDir).filter((name) =>
      name.endsWith('.txt'),
    )) {
      const label = textDir.includes('portrait') ? `portrait/${file}` : file;
      sources.push({
        kind: 'frame',
        name: label,
        text: readFileSync(join(textDir, file), 'utf8'),
      });
    }
  }

  for (const extra of [`${slug}.srt`, 'metadata.json']) {
    const path = join(takeRoot, extra);

    if (existsSync(path)) {
      sources.push({
        kind: 'shipped',
        name: extra,
        text: readFileSync(path, 'utf8'),
      });
    }
  }

  if (sources.length === 0) {
    console.error(
      `leak-scan: nothing to scan for '${slug}' — record the flow first so the per-beat text dumps exist`,
    );
    process.exit(1);
  }

  const findings = sources.flatMap((source) =>
    scanText(source.name, source.text, source.kind),
  );
  const errors = findings.filter((finding) => finding.severity === 'error');
  const warnings = findings.filter((finding) => finding.severity === 'warn');

  // Deduplicate for the report: the same token across twelve beats is one problem.
  const seen = new Set<string>();

  for (const finding of [...errors, ...warnings]) {
    const key = `${finding.severity}:${finding.rule}:${finding.match}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    const label = finding.severity === 'error' ? 'FAIL' : 'warn';
    console.log(`leak-scan: ${label} [${finding.rule}] ${finding.match}`);
    console.log(`             in ${finding.source} — ${finding.because}`);
  }

  console.log(
    `leak-scan: scanned ${String(sources.length)} source(s): ${String(errors.length)} error(s), ${String(warnings.length)} warning(s)`,
  );

  if (errors.length > 0) {
    console.error(
      'leak-scan: refusing to pass. Fix the recording (or the denylist, if the hit is genuinely fictional) before publishing.',
    );
    process.exit(1);
  }
};

main();

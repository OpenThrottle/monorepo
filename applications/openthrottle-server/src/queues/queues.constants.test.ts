import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { SERVER_QUEUE_NAMES } from './queues.constants.ts';

/**
 * @description Drift gate for {@link SERVER_QUEUE_NAMES}: scans the server source for every
 * `registerQueue(...)` call and fails when the queue it registers is missing from the list. The
 * argument is either a string literal or an `*_QUEUE_NAME` constant, which is resolved to its
 * string by finding its `export const` declaration in the source.
 */

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..');

const REGISTER_QUEUE_REGEX =
  /registerQueue\(\s*(?:'(?<literal>[^']+)'|(?<identifier>[A-Z][A-Z0-9_]*))\s*\)/g;

const findSourceFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findSourceFiles(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      out.push(full);
    }
  }

  return out;
};

const sources = findSourceFiles(srcDir).map((file) => {
  return { file, text: readFileSync(file, 'utf8') };
});

const resolveConstant = (identifier: string): string | undefined => {
  const declaration = new RegExp(
    `export const ${identifier} = '(?<value>[^']+)'`,
  );
  for (const source of sources) {
    const value = declaration.exec(source.text)?.groups?.['value'];
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
};

const registrations = sources.flatMap((source) => {
  return Array.from(source.text.matchAll(REGISTER_QUEUE_REGEX), (match) => {
    const identifier = match.groups?.['identifier'];
    const literal = match.groups?.['literal'];
    const name =
      literal ??
      (identifier === undefined ? undefined : resolveConstant(identifier));

    return {
      argument: literal ?? identifier ?? '',
      file: relative(srcDir, source.file),
      name,
    };
  });
});

describe('SERVER_QUEUE_NAMES', () => {
  test('discovers the registerQueue calls', () => {
    // Guard against a broken scan silently passing the gate.
    expect(registrations.length).toBeGreaterThanOrEqual(18);
  });

  test('resolves every registerQueue argument to a queue name', () => {
    const unresolved = registrations.filter((registration) => {
      return registration.name === undefined;
    });

    expect(unresolved).toEqual([]);
  });

  test('lists every queue the server registers', () => {
    const listed = new Set<string>(SERVER_QUEUE_NAMES);
    const missing = registrations.filter((registration) => {
      return registration.name !== undefined && !listed.has(registration.name);
    });

    expect(missing).toEqual([]);
  });

  test('lists only queues the server registers, each once', () => {
    const registered = new Set(
      registrations.map((registration) => {
        return registration.name;
      }),
    );

    expect(new Set(SERVER_QUEUE_NAMES).size).toBe(SERVER_QUEUE_NAMES.length);
    expect(
      SERVER_QUEUE_NAMES.filter((name) => {
        return !registered.has(name);
      }),
    ).toEqual([]);
  });
});

# @openthrottle/nodejs-utils

Zero-dependency, runtime-agnostic TypeScript helpers shared by OpenThrottle server
and client code: type guards, error-message extraction and `sleep`. Import them
from here instead of re-declaring them inline.

## Installation

Install with your preferred package manager (list pnpm first in this monorepo):

**pnpm:**

```bash
pnpm add @openthrottle/nodejs-utils
```

**npm:**

```bash
npm install @openthrottle/nodejs-utils
```

## Usage

```ts
import {
  isErrorWithCode,
  isRecord,
  isStringArray,
  sleep,
  toErrorMessage,
} from '@openthrottle/nodejs-utils';

const parsed: unknown = JSON.parse(raw);
if (isRecord(parsed) && isStringArray(parsed.tags)) {
  // parsed.tags is string[]
}

try {
  await readFile(path, 'utf8');
} catch (error) {
  if (isErrorWithCode(error) && error.code === 'ENOENT') return undefined;
  logger.warn(toErrorMessage(error));
}

await sleep(250);
```

| Export            | What it does                                                                  |
| ----------------- | ----------------------------------------------------------------------------- |
| `isRecord`        | Non-null, non-array object → `Record<string, unknown>`                        |
| `isStringArray`   | Array whose every element is a string                                         |
| `isErrorWithCode` | `Error` with a string `code` (Node system errors and the like)                |
| `toErrorMessage`  | `error.message` or `String(error)`; an optional fallback replaces a blank one |
| `sleep`           | Resolves after `ms`; immediately for `ms <= 0`                                |

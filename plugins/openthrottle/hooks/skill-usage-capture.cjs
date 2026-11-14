#!/usr/bin/env node

// GENERATED — DO NOT EDIT. Source: packages/agentic-hooks/scripts/bundle-hooks.ts
// Runs ../dist/skill-usage-capture.cjs when it has been built, and otherwise exits 0 without a word:
// a hook that is not there must never break the tool call it was meant to observe.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const target = path.join(__dirname, '..', 'dist', "skill-usage-capture.cjs");

if (fs.existsSync(target)) {
  process.argv[1] = target;
  require(target);
} else {
  process.exitCode = 0;
}

#!/usr/bin/env node

// GENERATED — DO NOT EDIT. Source: packages/agentic-hooks/scripts/bundle-hooks.ts
// Runs ../dist/skill-usage-drain.cjs when it has been built, and otherwise exits 0 without a word:
// a hook that is not there must never break the tool call it was meant to observe.
// Below Node 22 it re-runs the bundle on a newer installed Node, never the host repo's.

'use strict';

var fs = require('fs');
var path = require('path');

var target = path.join(__dirname, '..', 'dist', "skill-usage-drain.cjs");
var MIN_MAJOR = 22;

function major(version) {
  return parseInt(String(version).replace(/^v/, ''), 10) || 0;
}

function isFile(candidate) {
  try {
    return fs.statSync(candidate).isFile();
  } catch (error) {
    return false;
  }
}

function versionOf(candidate) {
  var result = require('child_process').spawnSync(candidate, ['--version'], { encoding: 'utf8' });
  return result.status === 0 ? String(result.stdout).trim() : '';
}

function newestNvmNode() {
  var root = path.join(process.env.NVM_DIR || path.join(process.env.HOME || '', '.nvm'), 'versions', 'node');
  var best = null;
  var names = [];
  try {
    names = fs.readdirSync(root);
  } catch (error) {
    return null;
  }
  for (var i = 0; i < names.length; i++) {
    var parts = names[i].replace(/^v/, '').split('.');
    var rank = [parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, parseInt(parts[2], 10) || 0];
    var bin = path.join(root, names[i], 'bin', 'node');
    if (rank[0] < MIN_MAJOR || !isFile(bin)) continue;
    if (!best || rank[0] > best.rank[0] || (rank[0] === best.rank[0] && (rank[1] > best.rank[1] || (rank[1] === best.rank[1] && rank[2] > best.rank[2])))) {
      best = { bin: bin, rank: rank };
    }
  }
  return best ? best.bin : null;
}

function pathNode() {
  var dirs = String(process.env.PATH || '').split(path.delimiter);
  var name = process.platform === 'win32' ? 'node.exe' : 'node';
  for (var i = 0; i < dirs.length; i++) {
    var candidate = path.join(dirs[i], name);
    if (dirs[i] && candidate !== process.execPath && isFile(candidate) && major(versionOf(candidate)) >= MIN_MAJOR) {
      return candidate;
    }
  }
  return null;
}

function compatibleNode() {
  var explicit = process.env.OT_NODE || '';
  if (explicit && explicit.indexOf('$') === -1 && isFile(explicit)) return explicit;
  return newestNvmNode() || pathNode();
}

if (!fs.existsSync(target)) {
  process.exitCode = 0;
} else if (major(process.versions.node) >= MIN_MAJOR) {
  process.argv[1] = target;
  require(target);
} else {
  var node = compatibleNode();
  if (node) {
    var result = require('child_process').spawnSync(node, [target].concat(process.argv.slice(2)), { stdio: 'inherit' });
    process.exitCode = typeof result.status === 'number' ? result.status : 0;
  } else {
    process.exitCode = 0;
  }
}

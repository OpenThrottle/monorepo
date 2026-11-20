---
group: 04. Troubleshooting
order: 1
title: Why does npm or yarn install fail?
---

This is a **pnpm-only** workspace; a `preinstall` guard rejects other package managers. Enable pnpm with `corepack enable` (on Node 25+, `npm install --global corepack` first), then run `pnpm install`.

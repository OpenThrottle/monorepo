---
# allowed-tools: Bash(git:*) Bash(jq:*) Read
# compatibility: Requires Python 3.14+ and uv
description: Clear cut rules for where to write new code, where it goes, how to name things and how to maintain it.
name: ot-folders
metadata:
  author: OpenThrottle
  version: '1.0'
---

# OpenThrottle Folders

Use this skill when adding, moving, modifying code. This codebase will evolve very quickly and we'll work continuously to refine the patterns. While machines may be writing more and more code, humans still have to maintain it.

## Technology Overview

In this NX monorepo we're typically dealing with `4` distinct tech stacks

1. nestjs: We have applications and modules which many NestJS applications may consume
1. nodejs: Server/Client agnostic, these package are meant to be consumed by API and Client side applications
1. react: Client side code that makes use of react or other react-\* packages. These packages should NOT import from `react-router`
1. react-router: Client side code that is coupled to the react-router framework specifically. As soon as we're importing react + react-router it falls into this bucket.

## Project (Applications & Packages)

**React Router Applications:**

**NestJS Applications:**

**Packages:**

- src
  - index.ts
- tests

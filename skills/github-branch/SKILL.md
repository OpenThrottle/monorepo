---
name: github-branch
description: Create and push a feature branch with a conventional name via GitHub CLI. USE WHEN the user runs /github/branch, asks for a new branch for current work, or needs to fork work before opening a PR. Follows github.mdc; pushes the branch and returns a clickable URL.
disable-model-invocation: true
source: external
---

Your job is to fork a new branch of work using the GitHub CLI.

## Rules

- **ALWAYS** follow the rules in `.cursor/rules/commands/github.mdc`
- **ALWAYS** Create a reasonable branch name based on the contents
  - ex: `git checkout -b __type__/__feature__`
- **ALWAYS** Push this branch up using the `/github/pull-request` command
- **ALWAYS** echo back a "clickable" URL for the user upon completion

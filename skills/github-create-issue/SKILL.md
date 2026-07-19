---
name: github-create-issue
description: Create GitHub issues from user-provided content (max 3 issues per request). USE WHEN the user runs /github/create-issue, wants to track a feature or bug as an issue, or needs tickets filed from a description or PRD snippet. Follows github.mdc and conventional issue formatting.
disable-model-invocation: true
---

Your job is to take the content you're given and to create GitHub issue(s) around the feature(s) or issue(s) described.

## Rules

- **ALWAYS** follow the rules in `.cursor/rules/commands/github.mdc`
- **ALWAYS** create no more than 3 tickets per request making use of the body for more detailed info

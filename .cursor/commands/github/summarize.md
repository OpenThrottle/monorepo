# Instructions

Your job is to look at all commits on the current branch and summarize them into 5 - 10 bullet points (each a single line) of conventional commits around this PR. These will be used as in the squash and merge description.

## Rules

- **ALWAYS** follow the rules in `.cursor/rules/commands/github.mdc`
- **ALWAYS** If there are unstaged commits run `/github/commit` first
- **ALWAYS** format the output as a code fence block with each bullet point on its own line starting with "- "
- **ALWAYS** output ONLY the bullet points in the code fence, no additional commentary or explanation before or after

---
name: github-worktree
description: Instructions
disable-model-invocation: true
---

# Instructions

Your job is to use a reserved worktree to create a new branch and open it in Cursor. This allows you to work on multiple branches simultaneously without switching between them.

## Reserved Worktrees

This monorepo maintains four reserved worktrees that are pre-configured and ready to use:

- `monorepo` - Default branch and installation
- `monorepo-hotfix` - Reserved for hotfixes and urgent one-off fixes
- `monorepo-worktree-one` - For feature branches and general development
- `monorepo-worktree-two` - For feature branches and general development
- `monorepo-worktree-three` - For feature branches and general development

## Workflow

1. **List available reserved worktrees**
   - Check which reserved worktrees exist and their current branch status
   - Use `git worktree list` to see all worktrees and their checked-out branches

2. **Present worktree options to the user**
   - Show the user which reserved worktrees are available
   - For each worktree, indicate:
     - The worktree name
     - The current branch (if any)
     - Whether it's available (on a reserved branch like `monorepo-worktree-one`) or in use (on a feature branch)
   - Present options in a clear format:

     ```txt
     1. monorepo-worktree-one (currently on: monorepo-worktree-one) - Available
     2. monorepo-worktree-two (currently on: monorepo-worktree-two) - Available
     3. monorepo-worktree-three (currently on: monorepo-worktree-three) - Available
     4. monorepo-hotfix (currently on: monorepo-hotfix) - Available
     ```

3. **Wait for user selection**
   - Ask the user which worktree they'd like to use
   - Accept their choice (1, 2, 3, or 4, or the worktree name)

4. **Check worktree availability**
   - If the selected worktree is on a reserved branch (e.g., `monorepo-worktree-one`), it's available
   - If the selected worktree is on a feature branch, inform the user and ask if they want to:
     - Switch to a different worktree
     - Checkout a different branch in the selected worktree (this will require handling uncommitted changes if any)

5. **Navigate to the selected worktree**
   - Change directory to the selected worktree: `cd ../monorepo-worktree-one` (or two, three, or hotfix)
   - Verify you're in the correct directory

6. **Create a new branch using /github/branch command**
   - **ALWAYS** use the `/github/branch` cursor command to create the new branch
   - This will create a properly named branch and push it to the remote
   - The branch will be checked out in the worktree

7. **Open Cursor window**
   - Open a new Cursor window from the worktree directory
   - Use the full absolute path to the worktree
   - Provide the user with the full path and confirmation

## Syncing with Main

When syncing a branch with main, **ALWAYS** follow this workflow:

1. **Pull main first** to ensure it's current:

   ```bash
   git fetch origin main
   git pull origin main
   ```

2. **Rebase your branch** onto the updated main:
   ```bash
   git rebase origin/main
   ```

**Important:**

- **ALWAYS** pull main first before rebasing
- **ALWAYS** use rebase, never merge when syncing with main
- This ensures a clean, linear history

## Rules

- **ALWAYS** follow the rules in `.cursor/rules/commands/github.mdc`
- **ALWAYS** present worktree options clearly before proceeding
- **ALWAYS** wait for user confirmation of which worktree to use
- **ALWAYS** use the `/github/branch` command to create the branch (don't use `git checkout -b` directly)
- **ALWAYS** verify the worktree directory exists before navigating to it
- **ALWAYS** provide the user with the full absolute path to the worktree directory
- **NEVER** proceed without user selection of which worktree to use
- **NEVER** skip the branch creation step - always use `/github/branch`

## Worktree Paths

The reserved worktrees are located at:

- `/Users/matt/Development/monorepo-worktree-one`
- `/Users/matt/Development/monorepo-worktree-two`
- `/Users/matt/Development/monorepo-worktree-three`
- `/Users/matt/Development/monorepo-hotfix`

## Error Handling

- If a worktree is already in use (on a feature branch), inform the user and offer alternatives
- If the worktree directory doesn't exist, inform the user and suggest running setup
- If `/github/branch` fails, report the error and suggest solutions
- If opening Cursor fails, provide the path so the user can open it manually

## Output

Upon successful completion, provide:

- The selected worktree name
- The new branch name that was created
- The full absolute path to the worktree directory
- Confirmation that Cursor was opened (or instructions to open it manually)
- A clickable link to the branch on GitHub (if available from the branch command)

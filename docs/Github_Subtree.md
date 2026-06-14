# 🌳 Git Subtress

```bash
# git subtree add --prefix=<dir_name> <repo_url> <branch_name> --squash


# git subtree add --prefix=<dir_name> \
#   <repo_url> \
#   <branch_name> \
#   --squash

# 1. Add the remote
git remote add openthrottle git@github.com:OpenThrottle/OpenThrottle.git

# 3. Add a shortcut
"sync:openthrottle": "git subtree push --prefix=applications/openthrottle openthrottle main",


# 2. Add the remote
# Register the subtree / remote
git subtree add --prefix=applications/openthrottle \
  git@github.com:OpenThrottle/OpenThrottle.git \
  main \
  --squash
```

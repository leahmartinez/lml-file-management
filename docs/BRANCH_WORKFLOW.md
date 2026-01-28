# Git Workflow - LML Project

## Branch Strategy

### Main Branches

- **`main`** - Production-ready code (currently deployed to Azure)
- **`dev`** - Development/testing branch (for staging)
- **`feature/*`** - Feature branches (for new features)

## Current Development

### Feature: Server-Side Authentication

**Branch**: `feature/server-side-auth`  
**Status**: Backend complete, frontend pending  
**Created**: November 8, 2025

#### What's in This Branch

- Complete Azure Functions REST API
- bcrypt password hashing
- JWT authentication
- Azure Table Storage integration
- API documentation
- Deployment guides

#### What's Not in This Branch (Yet)

- Frontend updates to use the API
- Local development setup
- Integration tests

## Workflow

### Working on Features

1. **Create feature branch from main**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and commit**:
   ```bash
   git add .
   git commit -m "descriptive message"
   ```

3. **Push to remote**:
   ```bash
   git push -u origin feature/your-feature-name
   ```

### Testing Before Merge

1. **Merge main into feature** (keep feature up to date):
   ```bash
   git checkout feature/your-feature-name
   git merge main
   # Resolve any conflicts
   git push
   ```

2. **Test thoroughly**:
   - Run all tests: `npm run test:run`
   - Test locally: `npm run dev`
   - Check linter: `npm run lint`

3. **Create Pull Request** on GitHub:
   - Compare: `feature/your-feature-name` → `main`
   - Add description
   - Request review (if working with team)

### Merging to Main

```bash
# Option 1: Merge via GitHub PR (recommended)
# - Go to GitHub
# - Create/approve PR
# - Merge using "Squash and merge" or "Create merge commit"

# Option 2: Merge locally
git checkout main
git merge feature/your-feature-name
git push origin main

# Clean up feature branch
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

### Emergency Hotfix

For urgent fixes to production:

```bash
git checkout main
git checkout -b hotfix/fix-description
# Make fix
git commit -m "hotfix: description"
git checkout main
git merge hotfix/fix-description
git push origin main
git branch -d hotfix/fix-description
```

## Current Branch Status

```
main (deployed)
  └── v1.0.0 (tagged)
       ├── Client-side auth
       ├── Working admin portal
       └── CSV data from blob storage

feature/server-side-auth (in development)
  └── Server-side API
       ├── Azure Functions backend
       ├── Database integration
       └── Ready to deploy separately
```

## Best Practices

1. **Keep main stable** - only merge tested code
2. **Small, focused commits** - easier to review and revert
3. **Descriptive commit messages** - explain why, not just what
4. **Test before merging** - run full test suite
5. **Update documentation** - keep docs in sync with code
6. **Delete merged branches** - keep repository clean

## Commit Message Format

```
type: short description

Longer explanation if needed.
Can include multiple paragraphs.

- Bullet points for changes
- Another change
- Another change
```

**Types**:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, no logic change)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples**:
```bash
git commit -m "feat: add password reset endpoint"
git commit -m "fix: resolve CORS issue in auth API"
git commit -m "docs: update deployment guide"
```

## Useful Commands

```bash
# Check current branch
git branch

# See all branches
git branch -a

# Switch branches
git checkout branch-name

# See changes
git status
git diff

# See commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard local changes
git checkout -- file-name

# Pull latest from remote
git pull origin branch-name

# Force push (use carefully!)
git push origin branch-name --force
```

## Troubleshooting

### Merge Conflicts

```bash
# When you see merge conflicts:
# 1. Open conflicted files
# 2. Look for <<<<<<< HEAD markers
# 3. Decide which changes to keep
# 4. Remove conflict markers
# 5. Save and commit

git add .
git commit -m "resolve merge conflicts"
```

### Accidentally Committed to Wrong Branch

```bash
# Create new branch from current state
git branch feature/correct-branch

# Reset current branch to remote
git fetch origin
git reset --hard origin/main

# Switch to new branch
git checkout feature/correct-branch
```

### Need to Sync Fork

```bash
# Add upstream remote (only once)
git remote add upstream https://github.com/original-repo.git

# Fetch and merge
git fetch upstream
git merge upstream/main
git push origin main
```

---

**Last Updated**: November 8, 2025  
**Current Branch**: `feature/server-side-auth`  
**Next Step**: Test and merge to main when ready



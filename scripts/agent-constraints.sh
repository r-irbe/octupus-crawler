#!/usr/bin/env bash
# agent-constraints.sh — Runtime constraint verification for agent-generated PRs
# Checks file count bounds, directory scope, dependency additions, API surface
# REQ-AGENT-070

set -euo pipefail

FAILED=0
BASE_BRANCH="${1:-main}"

echo "=== Agent Constraint Checks (vs $BASE_BRANCH) ==="

# 1. File count bounds — agent PRs should not touch too many files
CHANGED_FILES=$(git diff --name-only "$BASE_BRANCH"...HEAD 2>/dev/null | wc -l | tr -d ' ')
echo "Changed files: $CHANGED_FILES"
if [[ "$CHANGED_FILES" -gt 50 ]]; then
  echo "FAIL: PR touches $CHANGED_FILES files (max 50 for agent PRs)"
  FAILED=1
fi

# 2. Directory scope — verify changes are within expected directories
UNEXPECTED=$(git diff --name-only "$BASE_BRANCH"...HEAD 2>/dev/null | grep -v "^apps/" | grep -v "^packages/" | grep -v "^docs/" | grep -v "^.claude/" | grep -v "^.github/" | grep -v "^scripts/" | grep -v "^infra/" | grep -v "^AGENTS.md" | grep -v "^CLAUDE.md" | grep -v "^.gitignore" || true)
if [[ -n "$UNEXPECTED" ]]; then
  echo "WARN: Changes outside expected directories:"
  echo "$UNEXPECTED"
fi

# 3. Dependency additions — flag new dependencies
NEW_DEPS=$(git diff "$BASE_BRANCH"...HEAD -- "**/package.json" 2>/dev/null | grep "^+" | grep -v "^+++" | grep '"dependencies\|"devDependencies' || true)
if [[ -n "$NEW_DEPS" ]]; then
  echo "WARN: New dependencies detected — verify against ADR-001 approved list:"
  echo "$NEW_DEPS"
fi

# 4. API surface changes — flag route additions
NEW_ROUTES=$(git diff "$BASE_BRANCH"...HEAD -- "apps/api-gateway/**" 2>/dev/null | grep "^+" | grep -i "route\|endpoint\|controller\|@Get\|@Post\|@Put\|@Delete" || true)
if [[ -n "$NEW_ROUTES" ]]; then
  echo "INFO: API surface changes detected:"
  echo "$NEW_ROUTES"
fi

# Summary
echo ""
if [[ "$FAILED" -ne 0 ]]; then
  echo "RESULT: FAILED"
  exit 1
else
  echo "RESULT: PASSED"
  exit 0
fi

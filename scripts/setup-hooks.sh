#!/usr/bin/env bash
# setup-hooks.sh — Configure git to use .githooks/ directory for hooks
# Run once after clone: pnpm run prepare
# This ensures all agents (Copilot, Claude, terminal) hit the same pre-commit gates.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)

git config core.hooksPath "$REPO_ROOT/.githooks"
chmod +x "$REPO_ROOT/.githooks/"*

echo "✓ Git hooks configured: .githooks/ (pre-commit gates active)"

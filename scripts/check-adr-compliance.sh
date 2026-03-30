#!/usr/bin/env bash
# ADR compliance scan — advisory (non-blocking) check
# Implements: T-CICD-022 (REQ-CICD-023)
# Checks that code follows decisions documented in ADRs.
set -uo pipefail

WARNINGS=0

warn() {
  echo "::warning::$1"
  WARNINGS=$((WARNINGS + 1))
}

# --- ADR-001: Monorepo + pnpm ---
# Verify pnpm lockfile exists
if [ ! -f "pnpm-lock.yaml" ]; then
  warn "ADR-001: pnpm-lock.yaml not found — monorepo should use pnpm"
fi

# --- ADR-007: Vitest, not Jest ---
JEST_FILES=$(find packages/ -name "jest.config.*" -not -path "*/node_modules/*" 2>/dev/null | head -5)
if [ -n "$JEST_FILES" ]; then
  warn "ADR-007: Found Jest config files (should use Vitest): $JEST_FILES"
fi

# --- ADR-009: cockatiel for resilience ---
for pkg in packages/*/package.json; do
  if grep -q '"retry"' "$pkg" 2>/dev/null; then
    if ! grep -q '"cockatiel"' "$pkg" 2>/dev/null; then
      warn "ADR-009: $pkg uses 'retry' dep — should use cockatiel"
    fi
  fi
done

# --- ADR-013: No direct process.env access ---
DIRECT_ENV=$(grep -rn "process\.env\.\w" --include="*.ts" packages/ 2>/dev/null \
  | grep -v "node_modules" \
  | grep -v ".test.ts" \
  | grep -v "packages/config/" \
  | grep -v "// ADR-013 exception" \
  | head -5)
if [ -n "$DIRECT_ENV" ]; then
  warn "ADR-013: Direct process.env access outside packages/config/:"
  echo "$DIRECT_ENV"
fi

# --- ADR-015: No barrel imports ---
BARREL_IMPORTS=$(grep -rn "from '\.\./index'" --include="*.ts" packages/ 2>/dev/null \
  | grep -v "node_modules" \
  | head -5)
if [ -n "$BARREL_IMPORTS" ]; then
  warn "ADR-015: Barrel imports found (use direct imports):"
  echo "$BARREL_IMPORTS"
fi

# --- ADR-016: No 'any' type ---
ANY_USAGE=$(grep -rn ": any\b\|as any\b\|<any>" --include="*.ts" packages/ 2>/dev/null \
  | grep -v "node_modules" \
  | grep -v ".d.ts" \
  | grep -v "eslint-disable" \
  | grep -v ".test.ts" \
  | head -5)
if [ -n "$ANY_USAGE" ]; then
  warn "ADR-016: Found 'any' type usage (use unknown + Zod):"
  echo "$ANY_USAGE"
fi

# --- ADR-018: File size limits ---
while IFS= read -r file; do
  LINES=$(wc -l < "$file")
  if [ "$LINES" -gt 300 ]; then
    warn "ADR-018: $file exceeds 300-line hard limit ($LINES lines)"
  fi
done < <(find packages/ -name "*.ts" -not -path "*/node_modules/*" -not -name "*.d.ts" 2>/dev/null)

# --- ADR-020: Feature folders should have specs ---
for feature_dir in apps/*/src/features/*/; do
  if [ -d "$feature_dir" ]; then
    if [ ! -f "${feature_dir}requirements.md" ]; then
      warn "ADR-020: Feature $feature_dir missing requirements.md"
    fi
  fi
done

# --- Summary ---
echo ""
echo "=== ADR Compliance Scan ==="
echo "Warnings: $WARNINGS"
echo "Status: advisory (non-blocking)"

# Always exit 0 — advisory only
exit 0

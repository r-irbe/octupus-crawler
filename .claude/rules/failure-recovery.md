# Failure Recovery Rules

## Failure Taxonomy

Classify every failure before attempting recovery:

| Type | Description | Recovery |
| --- | --- | --- |
| Specification | Wrong requirement interpreted, missing edge case | Re-read spec, ask user for clarification |
| Format | Syntax error, wrong file location, malformed output | Fix format, retry same logic |
| Logic | Correct spec + format but wrong algorithm/approach | Analyze root cause, try alternative approach |
| Tool/Infra | External tool failure, network, container timeout | Retry with backoff (max 2), then escalate |

## Recovery Protocol

1. **Classify** the failure using the taxonomy above
2. **Log** the failure type, error message, and affected files in state tracker
3. **Apply** the type-specific recovery strategy
4. **Re-run** guard functions after fix
5. **Escalate** if recovery fails (3 total attempts: 1 initial + 2 retries)

## Escalation Protocol

After 3 total attempts on the same failure:

1. **STOP** immediately — do not attempt further fixes
2. **Report** to user with:
   - Failure type (from taxonomy)
   - What was attempted (all 3 attempts)
   - Error output from each attempt
   - Suggested next steps
3. **Wait** for user guidance before proceeding

## Ambiguity Detection

When requirements are unclear or contradictory:

- **Ask first** — never guess at ambiguous requirements
- Silent progress on ambiguous requirements reduces resolve rates from 48.8% to 28%
- Frame clarifying questions with: what you understood, what's ambiguous, your proposed interpretation
- If two ADRs conflict → STOP, present both to user

## Context Degradation Signals

Watch for these signs that context is degrading:

- Repeating instructions already given in the conversation
- Contradicting earlier decisions without acknowledging the change
- Forgetting file paths or variable names from earlier in the session
- Generating code that violates rules stated at the beginning
- Response length deviating >25% from task complexity

When detected: re-read state tracker, re-anchor on AGENTS.md boundaries section, recommend fresh session if signals persist.

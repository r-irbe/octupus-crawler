---
description: Create a conventional commit with provenance trailers
agent: edit
---

Create a git commit with:

1. **Conventional commit message**: `<type>(<scope>): <description>`
2. **Provenance trailers** in the commit body:
   - `Agent: <agent-name>` — which agent made this change
   - `Requirement: <REQ-ID>` — which requirement this satisfies
   - `Tool: <tool-name>` — which tool was used (e.g., claude-code, copilot)

Example:

```
feat(crawler): add URL validation with RFC 6890 blocking

Implement SSRF protection by validating all crawl target URLs
against RFC 6890 reserved IP ranges before fetching.

Agent: Implementation
Requirement: REQ-CRAWL-042
Tool: claude-code
```

Context: Apply this to the current staged changes on branch `{currentBranch}`.

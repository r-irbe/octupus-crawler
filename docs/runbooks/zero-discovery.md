# Runbook: Zero Discovery

**Alert**: `ZeroDiscovery` (warning)
**Condition**: No URLs discovered despite successful fetches and frontier > 100 for 10 minutes

## Symptoms

- `urls_discovered_total` rate is zero
- `fetches_total{status="success"}` rate is positive
- Frontier still contains URLs

## Diagnosis

1. Check what's being fetched: are pages returning content?
2. Check HTML parsing: are pages JS-rendered (need Playwright)?
3. Check link extraction: are discovered URLs being filtered out?
4. Check if crawl has reached a dead end (all links already visited)
5. Check `ALLOWED_DOMAINS`: new links may be outside allowed scope

## Remediation

| Root Cause | Action |
| --- | --- |
| Crawl naturally exhausted | This is expected — crawl may be complete |
| JavaScript-rendered pages | Enable Playwright for affected domains |
| Over-aggressive URL filtering | Review normalization and dedup rules |
| All links outside allowed scope | Expand `ALLOWED_DOMAINS` if appropriate |

## Escalation

If combined with growing frontier: investigate — something is wrong with the pipeline.

# K8s E2E Testing — Requirements

> EARS-format requirements for local Kubernetes E2E testing, web simulator, and automated cluster management.
> Source: [REQUIREMENTS-AGNOSTIC.md](../../research/REQUIREMENTS-AGNOSTIC.md) §11, [ADR-005](../../adr/ADR-005-local-kubernetes.md), [ADR-007](../../adr/ADR-007-testing-strategy.md)

---

## 1. Local Cluster Automation

**REQ-K8E-001** (Ubiquitous)
The system shall provide a script (`scripts/setup-local.sh`) that creates a k3d cluster with a local registry, configurable node count, and port mappings.

**REQ-K8E-002** (Ubiquitous)
The setup script shall create a k3d registry at `k3d-ipf-registry.localhost:5111` before cluster creation.

**REQ-K8E-003** (Ubiquitous)
The setup script shall be idempotent: running it when a cluster already exists shall skip creation or tear down and recreate.

**REQ-K8E-004** (Ubiquitous)
A matching teardown script (`scripts/teardown-local.sh`) shall delete the cluster and registry, releasing all resources.

**REQ-K8E-005** (State-driven)
While the k3d cluster is running, all Kustomize base manifests shall deploy successfully without modification.

**REQ-K8E-006** (Event-driven)
When the setup script completes, the cluster shall have all nodes in `Ready` state within 60 seconds.

### Acceptance Criteria — Cluster Automation

```gherkin
Given no k3d cluster exists
When scripts/setup-local.sh runs
Then a k3d cluster "ipf-local" is created
And a local registry "k3d-ipf-registry.localhost:5111" is reachable
And kubectl get nodes shows all nodes Ready

Given an existing k3d cluster "ipf-local"
When scripts/setup-local.sh runs
Then the existing cluster is deleted and recreated
And no orphaned resources remain

Given a running k3d cluster
When scripts/teardown-local.sh runs
Then the cluster and registry are deleted
And docker ps shows no k3d containers
```

## 2. Image Build & Push

**REQ-K8E-007** (Ubiquitous)
The E2E pipeline shall build the crawler Docker image and push it to the local k3d registry.

**REQ-K8E-008** (Ubiquitous)
The pushed image tag shall include the git short SHA for traceability.

**REQ-K8E-009** (Event-driven)
When the image is pushed to the local registry, the Kustomize dev overlay shall reference the local registry image.

### Acceptance Criteria — Image Build

```gherkin
Given a running k3d cluster with local registry
When the E2E image build runs
Then the image is tagged with the git short SHA
And the image is pushed to k3d-ipf-registry.localhost:5111
And kubectl can pull the image from the local registry
```

## 3. Web Simulator (Mock Internet)

**REQ-K8E-010** (Ubiquitous)
The system shall provide a web simulator — an HTTP server with configurable routes that serves deterministic responses for E2E crawl testing.

**REQ-K8E-011** (Ubiquitous)
The web simulator shall support static HTML responses with configurable links to other simulated pages, forming crawlable site graphs.

**REQ-K8E-012** (Ubiquitous)
The web simulator shall support dynamic handler functions for custom response behavior (delays, errors, redirects, streaming).

**REQ-K8E-013** (Ubiquitous)
The web simulator shall provide built-in scenarios for common test cases: slow responses (configurable delay), HTTP error codes (4xx, 5xx), connection resets, redirect chains, and link traps (infinite depth pages).

**REQ-K8E-014** (Ubiquitous)
The web simulator shall support `robots.txt` serving with configurable `Disallow` rules per path.

**REQ-K8E-015** (Event-driven)
When the web simulator starts, it shall bind to a random available port and report the bound address.

**REQ-K8E-016** (Ubiquitous)
The web simulator shall be deployable both in-process (for integration tests) and as a K8s Pod (for E2E tests).

### Acceptance Criteria — Web Simulator

```gherkin
Given a web simulator with a 3-page site graph (A → B → C)
When a crawler fetches page A
Then the response contains links to B and C
And fetching B and C returns valid HTML

Given a web simulator configured with a 2-second delay on /slow
When a client requests /slow
Then the response arrives after approximately 2 seconds

Given a web simulator with robots.txt disallowing /private
When a client fetches /robots.txt
Then it returns "User-agent: *\nDisallow: /private"

Given a web simulator configured with a redirect chain /a → /b → /c
When a client follows redirects from /a
Then it arrives at /c after 2 redirects

Given a web simulator with a link trap at /trap
When a crawler fetches /trap
Then each page contains a link to /trap?depth=N+1
And the crawler's max-depth setting prevents infinite descent
```

## 4. E2E Test Scenarios

**REQ-K8E-017** (Event-driven)
When the crawler pod is deployed to k3d with a seed URL pointing to the web simulator, the system shall crawl the simulated site graph and enqueue discovered URLs into the frontier.

**REQ-K8E-018** (Event-driven)
When the crawler pod receives SIGTERM during an active crawl, the system shall drain in-flight jobs and shut down gracefully within the configured timeout.

**REQ-K8E-019** (Event-driven)
When the web simulator serves a page with SSRF-targeted links (e.g., `http://169.254.169.254/`), the system shall reject those URLs and not attempt to fetch them.

**REQ-K8E-020** (Event-driven)
When the crawler pod starts in k3d, the `/health` and `/readyz` endpoints shall return 200 within the liveness/readiness probe timeout periods.

**REQ-K8E-021** (Event-driven)
When the crawler completes processing all reachable URLs in a bounded site graph, the Prometheus metrics endpoint shall report the total pages crawled matching the expected count.

**REQ-K8E-022** (State-driven)
While multiple crawler replicas are running, URL deduplication shall prevent the same URL from being processed more than once.

**REQ-K8E-023** (Ubiquitous)
E2E tests shall complete within 5 minutes, including cluster setup, image build, deployment, and test execution.

### Acceptance Criteria — E2E Scenarios

```gherkin
Given a k3d cluster with crawler deployed and web simulator running
When the crawler is seeded with the simulator's root URL
Then all reachable pages in the site graph are fetched
And discovered URLs appear in the Redis frontier

Given a running crawler pod processing jobs
When SIGTERM is sent to the pod
Then in-flight jobs complete before the pod exits
And the exit code is 0

Given a web simulator page containing a link to http://169.254.169.254/
When the crawler processes the page
Then the SSRF URL is rejected
And no HTTP request is made to 169.254.169.254

Given a crawler pod deployed to k3d
When the liveness probe fires
Then /health returns 200
And /readyz returns 200 within 5 seconds of startup

Given a 10-page bounded site graph in the web simulator
When the crawler finishes processing
Then the Prometheus metric crawl_pages_total equals 10

Given 2 crawler replicas and a 5-page site graph
When both replicas process jobs concurrently
Then each URL is processed exactly once across both replicas
```

## 5. CI Integration

**REQ-K8E-024** (Event-driven)
When a PR targets `main`, the CI pipeline shall optionally run E2E tests on a k3d cluster created in the GitHub Actions runner.

**REQ-K8E-025** (Ubiquitous)
E2E tests in CI shall use the same setup-local.sh script as local development to ensure parity.

### Acceptance Criteria — CI

```gherkin
Given a GitHub Actions runner with Docker available
When the E2E CI job runs
Then scripts/setup-local.sh creates a k3d cluster
And E2E tests execute against the cluster
And scripts/teardown-local.sh cleans up after tests
```

---

> Extended requirements (REQ-K8E-026–042): see [requirements-extended.md](requirements-extended.md)

## Requirement Count

| Domain | Count |
| --- | --- |
| Sections 1–5 (001–025) | 25 |
| Extended Sections 6–11 (026–042) | 17 |
| **Total** | **42** |

---

> **Provenance**: Created 2025-07-21. Extended 2025-07-21. Split for 300-line limit.


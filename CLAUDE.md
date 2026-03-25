# CLAUDE.md — AI Assistant Instructions for IPF Crawler

> This file contains **Claude Code-specific** instructions. It extends [AGENTS.md](AGENTS.md) (the project-wide AI coding instructions shared by all tools) with Claude's agent framework, orchestration, and workflow capabilities.

## Canonical Instructions

Read [AGENTS.md](AGENTS.md) for all coding rules, naming conventions, architecture decisions, package layout, and key patterns. Those rules are **binding** — everything in this file is additive.

## Documentation-First Workflow

**Before making any change**, consult the relevant ADR and documentation. After completing a major set of tasks, execute the memory promotion workflow.

## Task Routing

When receiving a task, identify its domain and consult the appropriate documents BEFORE starting work.

### Architecture & Design Decisions

| Topic | Primary Document | Related Documents |
| --- | --- | --- |
| Monorepo structure, packages, build | [ADR-001](docs/adr/ADR-001-monorepo-tooling.md) | ADR-015, ADR-016 |
| Job queue, BullMQ, Redis, Dragonfly | [ADR-002](docs/adr/ADR-002-job-queue-system.md) | ADR-009, ADR-017 |
| Infrastructure as Code, Pulumi | [ADR-003](docs/adr/ADR-003-infrastructure-as-code.md) | ADR-004, ADR-005 |
| Deployment, GitOps, ArgoCD, Kustomize | [ADR-004](docs/adr/ADR-004-gitops-deployment.md) | ADR-003, ADR-012 |
| Local K8s, k3d, dev environment | [ADR-005](docs/adr/ADR-005-local-kubernetes.md) | ADR-003, ADR-004 |
| Observability, metrics, traces, logs, Pino | [ADR-006](docs/adr/ADR-006-observability-stack.md) | ADR-009, ADR-011, ADR-016 |
| Testing, Vitest, Testcontainers, Pact, k6 | [ADR-007](docs/adr/ADR-007-testing-strategy.md) | ADR-001, ADR-012, ADR-016 |
| HTTP fetching, HTML parsing, Playwright | [ADR-008](docs/adr/ADR-008-http-parsing-stack.md) | ADR-009, ADR-002 |
| Resilience, circuit breakers, shutdown | [ADR-009](docs/adr/ADR-009-resilience-patterns.md) | ADR-002, ADR-006, ADR-016 |
| Database, PostgreSQL, S3, Prisma, Drizzle | [ADR-010](docs/adr/ADR-010-data-layer.md) | ADR-005, ADR-003, ADR-015 |
| API, Fastify, NestJS, routes | [ADR-011](docs/adr/ADR-011-api-framework.md) | ADR-013, ADR-006, ADR-015, ADR-017 |
| CI/CD, GitHub Actions, Changesets | [ADR-012](docs/adr/ADR-012-ci-cd-pipeline.md) | ADR-001, ADR-004, ADR-016 |
| Configuration, env vars, secrets | [ADR-013](docs/adr/ADR-013-configuration-management.md) | ADR-004, ADR-011 |
| Automation, pipelines, triggers, SLOs | [ADR-014](docs/adr/ADR-014-automation-strategy.md) | ADR-006, ADR-007, ADR-009, ADR-012, ADR-015, ADR-016, ADR-018 |
| Architecture patterns, DDD, Hexagonal+VSA | [ADR-015](docs/adr/ADR-015-application-architecture-patterns.md) | ADR-001, ADR-008, ADR-009, ADR-010, ADR-011, ADR-016, ADR-017, ADR-018 |
| Coding standards, CUPID, FOOP, neverthrow | [ADR-016](docs/adr/ADR-016-coding-standards-principles.md) | ADR-001, ADR-007, ADR-011, ADR-012, ADR-013, ADR-015, ADR-017, ADR-018 |
| Service communication, tRPC, TypeSpec, Temporal, Sagas | [ADR-017](docs/adr/ADR-017-service-communication.md) | ADR-002, ADR-006, ADR-008, ADR-009, ADR-011, ADR-015, ADR-016 |
| Agentic coding, Guard Functions, context rot, SDD | [ADR-018](docs/adr/ADR-018-agentic-coding-conventions.md) | ADR-001, ADR-007, ADR-012, ADR-013, ADR-015, ADR-016, ADR-020 |
| Ideation, anti-sycophancy, reasoning frameworks | [ADR-019](docs/adr/ADR-019-ideation-decision-protocols.md) | ADR-014, ADR-015, ADR-018 |
| Spec-driven dev, EARS, contract-first, quality gates | [ADR-020](docs/adr/ADR-020-spec-driven-development.md) | ADR-007, ADR-011, ADR-014, ADR-016, ADR-017, ADR-018 |

### Processes & Conventions

| Topic | Document |
| --- | --- |
| PR reviews, council process | [PR Review Council](docs/conventions/pr-review-council.md) |
| Documentation format, provenance | [Documentation Standards](docs/guidelines/documentation-standards.md) |
| Memory capture, validation, promotion | [Memory Promotion Workflow](docs/guidelines/memory-promotion-workflow.md) |

### Automation

| Topic | Document |
| --- | --- |
| Automation architecture, pipelines, metrics | [Automation Index](docs/automation/index.md) |
| Event triggers, payloads, routing | [Trigger Catalog](docs/automation/triggers.md) |
| SLOs, dashboards, alerting | [Metrics & SLOs](docs/automation/metrics.md) |
| Full SDLC automation | [Development Lifecycle](docs/automation/pipelines/development-lifecycle.md) |
| Automated quality enforcement | [Quality Gates](docs/automation/pipelines/quality-gates.md) |
| Doc maintenance automation | [Documentation Lifecycle](docs/automation/pipelines/documentation-lifecycle.md) |
| Continuous learning system | [Self-Improvement Loop](docs/automation/pipelines/self-improvement-loop.md) |
| Agent health and performance | [Agent Management](docs/automation/pipelines/agent-management.md) |
| Automated deployment | [Release Pipeline](docs/automation/pipelines/release-pipeline.md) |
| Continuous security scanning | [Security Pipeline](docs/automation/pipelines/security-pipeline.md) |

## Agent Framework

When working on this project, the AI assistant operates through a system of agents, skills, and instructions. The **Gateway Agent** is the entry point for all tasks.

### Agent Selection

| Request Type | Primary Agent | Supporting Agents | Key Skills |
| --- | --- | --- | --- |
| System design, tech choices | [Architect](docs/agents/architect.md) | Research | codebase-analysis, adr-management, evidence-gathering |
| Write/modify code | [Implementation](docs/agents/implementation.md) | Test, Debug | code-generation, git-safety, adr-compliance |
| Write/modify tests | [Test](docs/agents/test.md) | Implementation | test-generation, codebase-analysis |
| Review PR/code | [Review](docs/agents/review.md) | all voting council | pr-council-review, adr-compliance, evidence-gathering |
| Investigate problem | [Research](docs/agents/research.md) | Architect | evidence-gathering, codebase-analysis |
| Debug issue | [Debug](docs/agents/debug.md) | Implementation | debug-analysis, codebase-analysis |
| CI/CD, K8s, Docker, IaC | [DevOps](docs/agents/devops.md) | SRE | infrastructure-management, git-safety |
| Reliability, SLOs, alerts | [SRE](docs/agents/sre.md) | DevOps | observability, codebase-analysis |
| Security audit, OWASP | [Security](docs/agents/security.md) | Review | security-analysis, codebase-analysis |
| Docs, memory, indexes | [Documentation](docs/agents/documentation.md) | — | doc-maintenance, memory-promotion, adr-management |
| Complex/multi-domain task | [Gateway](docs/agents/gateway.md) | any combination | git-safety, memory-promotion |
| Automation, pipeline execution | [Gateway](docs/agents/gateway.md) | all agents | automation-orchestration, quality-gate-enforcement |
| Quality gate violation | [Implementation](docs/agents/implementation.md) | Test | quality-gate-enforcement, code-generation |
| Self-improvement analysis | [Documentation](docs/agents/documentation.md) | Gateway | self-improvement, memory-promotion |
| Automated pre-review | [Review](docs/agents/review.md) | Security | automated-review, pr-council-review |

### Instruction Binding

ALL agents MUST follow these instructions at all times:

| Instruction | Summary | Document |
| --- | --- | --- |
| Belief Threshold | Stop and ask user when confidence < 80% | [belief-threshold.md](docs/instructions/belief-threshold.md) |
| Engineering Discipline | 8 principles for quality work | [engineering-discipline.md](docs/instructions/engineering-discipline.md) |
| Decision Transparency | Show work, present alternatives, disclose uncertainty | [decision-transparency.md](docs/instructions/decision-transparency.md) |
| User Collaboration | When/how to engage user, question quality standards | [user-collaboration.md](docs/instructions/user-collaboration.md) |
| Git Safety Protocol | Branch naming, forbidden actions, merge strategy | [git-safety-protocol.md](docs/instructions/git-safety-protocol.md) |
| Parallel Work Protocol | Multi-agent coordination, conflict prevention | [parallel-work-protocol.md](docs/instructions/parallel-work-protocol.md) |

### Orchestration

All inter-agent coordination goes through the [Gateway Agent](docs/agents/gateway.md) following the [Orchestration Protocol](docs/agents/orchestration-protocol.md). Agents NEVER communicate directly.

**Orchestration patterns** (defined in Gateway):

- **Sequential Pipeline** — ordered handoff chain (design → implement → test → review)
- **Parallel Fan-Out** — independent parallel work on separate branches, fan-in merge
- **Collaborative Pair** — two agents work same domain, Gateway mediates
- **Advisory Council** — specialist agents advise, one agent decides
- **Escalation Chain** — automated escalation: agent → Gateway → Architect → User

## Required Workflows

### Before Starting Work

1. Read the relevant ADR(s) for the task domain
2. Load the relevant agent definition and its skills
3. Load ALL instructions (they are always active)
4. Check `docs/memory/short-term/` and `docs/memory/long-term/` for related learnings
5. Check `docs/worklogs/` for recent related work

### During Work

1. Create a session memory file: `docs/memory/session/YYYY-MM-DD-topic.md`
2. Log observations, decisions, problems, and solutions as you work
3. Reference ADR decisions in your implementation

### After Completing a Major Task Set

1. **Review session learnings**: Read through `docs/memory/session/` files from this work
2. **Promote validated learnings**: Move confirmed insights to `docs/memory/short-term/`
3. **Collate patterns**: If multiple short-term memories form a pattern, promote to `docs/memory/long-term/`
4. **Update documentation**: If long-term memory reveals gaps, update ADRs, guidelines, or conventions
5. **Update indexes**: Ensure all `index.md` files in docs/ subdirectories are current
6. **Create worklog entry**: `docs/worklogs/YYYY-MM-DD-topic.md` summarizing what was done

### When Reviewing PRs

Follow the [PR Review Council Convention](docs/conventions/pr-review-council.md):

1. **Round 1**: Specialists analyze — gather evidence from code, ADRs, and memory
2. **Round 2**: Voting members deliberate — debate findings with specialist input
3. **Round 3**: Vote on each finding — >75% threshold for sustained findings
4. Document the review output in the PR
5. Capture session learnings from the review process

## Code Conventions

See [AGENTS.md](AGENTS.md) for the full package structure, shared packages, coding rules (MUST/SHOULD/NEVER), error handling patterns, naming conventions, common commands, and Guard Function chain.

### Key Patterns (Quick Reference)

- **Hexagonal + VSA**: Clean Architecture at bounded context boundaries; vertical slices within (ADR-015)
- **Three-tier errors**: neverthrow `Result<T,E>` for domain, `try/catch` at HTTP boundary (ADR-016)
- **Guard Functions**: tsc → eslint → vitest chain, max 3 total attempts before escalation (ADR-018)
- **Schema-first**: Zod schemas define contracts (ADR-013, ADR-018)
- **Spec-Driven Development**: EARS requirements in `requirements.md` → `design.md` → `tasks.md` before implementation (ADR-020)
- **Contract-first API**: TypeSpec → OpenAPI 3.1 → Spectral lint → Dredd validation → Pact consumer tests (ADR-020)
- **EARS → property tests**: EARS requirements derive fast-check property-based tests (ADR-020 + ADR-007)
- **Evidence-driven quality gates**: 5-dimension framework (task success, context preservation, latency, safety, evidence coverage) (ADR-020)
- **Formal methods (selective)**: TLA+ for rate limiting, circuit breaker, distributed locking (ADR-020)
- **Real infra tests**: Testcontainers, not mocks (ADR-007)
- **tRPC internal, TypeSpec/OpenAPI external** (ADR-017)
- **Temporal orchestration**: Durable workflows + Saga compensation (ADR-017)
- **Domain events**: Redis Streams + discriminated unions with versioning (ADR-017)
- **File size ≤200 lines target, 300 hard limit** (ADR-018)

## When In Doubt

1. **Belief < 80%?** → STOP and ask the user ([belief-threshold.md](docs/instructions/belief-threshold.md))
2. Check if an ADR exists for the topic → follow it
3. Check long-term memory for related patterns → apply them
4. Check short-term memory for recent insights → consider them
5. If no guidance exists → propose a new ADR or guideline
6. If conflicting guidance exists → raise in PR review council
7. If multiple agents disagree → Gateway presents both positions to user

---

> **Provenance**: Created 2026-03-24; updated 2026-03-25 with ADR-015/016/017/018/020 routing, agentic coding key patterns, SDD methodology, and research integration from ai_coding.md + spec.md. Restructured 2026-03-25 to extend AGENTS.md (shared tool-agnostic instructions) with Claude Code-specific agent framework and workflows.

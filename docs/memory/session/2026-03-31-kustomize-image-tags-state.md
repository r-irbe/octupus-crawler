# State Tracker: Kustomize Image Tag Update

## Branch

`work/kustomize-image-tags`

## Tasks

| Task | Status | Commit |
| ---- | ------ | ------ |
| T-CICD-019: Add Kustomize image tag update step in release workflow | done | 8a60643 |

## Current State

G1-G8 complete. RALPH: 8 sustained findings (2 Critical + 4 Major + 2 Minor) all resolved. G9-G11 + merge pending.

## Decisions

- Add `update-kustomize` job to release.yml after `build-and-publish`
- Use `kustomize edit set image` to update base kustomization.yml
- Match SHA tag format from docker/metadata-action (`sha-<7chars>`)
- Job commits updated kustomization.yml back to main for ArgoCD sync

## Problems

(none yet)

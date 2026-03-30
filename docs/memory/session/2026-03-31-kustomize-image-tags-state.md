# State Tracker: Kustomize Image Tag Update

## Branch

`work/kustomize-image-tags`

## Tasks

| Task | Status | Commit |
| ---- | ------ | ------ |
| T-CICD-019: Add Kustomize image tag update step in release workflow | done | aeda060 |

## Current State

G1-G7 complete. Pending G8 RALPH, G9-G11 + merge.

## Decisions

- Add `update-kustomize` job to release.yml after `build-and-publish`
- Use `kustomize edit set image` to update base kustomization.yml
- Match SHA tag format from docker/metadata-action (`sha-<7chars>`)
- Job commits updated kustomization.yml back to main for ArgoCD sync

## Problems

(none yet)

#!/bin/bash
# scripts/build-and-push.sh — Build and push images to local k3d registry
# Implements: REQ-K8E-007, REQ-K8E-008, REQ-K8E-016
# Design: docs/specs/k8s-e2e/design.md §3.3

set -euo pipefail

REGISTRY="k3d-ipf-registry.localhost:5111"
TAG="${1:-$(git rev-parse --short HEAD)}"

echo "=== Building and pushing images (tag: $TAG) ==="

echo "Building crawler image..."
docker build -f infra/docker/Dockerfile -t "${REGISTRY}/ipf-crawler:${TAG}" .
docker push "${REGISTRY}/ipf-crawler:${TAG}"

echo "Building web simulator image..."
docker build -f infra/docker/Dockerfile.web-simulator \
  -t "${REGISTRY}/ipf-web-simulator:${TAG}" .
docker push "${REGISTRY}/ipf-web-simulator:${TAG}"

echo ""
echo "=== Images pushed ==="
echo "  ${REGISTRY}/ipf-crawler:${TAG}"
echo "  ${REGISTRY}/ipf-web-simulator:${TAG}"

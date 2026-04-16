#!/usr/bin/env bash
# scripts/build-and-push.sh — Build and push images to local k3d registry
# Implements: REQ-K8E-007, REQ-K8E-008, REQ-K8E-016
# Design: docs/specs/k8s-e2e/design.md §3.3

set -euo pipefail

REGISTRY_NAME="${K3D_REGISTRY_NAME:-ipf-registry.localhost}"
REGISTRY_PORT="${K3D_REGISTRY_PORT:-5111}"
REGISTRY="k3d-${REGISTRY_NAME}:${REGISTRY_PORT}"
TAG="${1:-$(git rev-parse --short HEAD)}"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Build & Push Images                    ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Registry: $REGISTRY"
echo "Tag:      $TAG"
echo ""

START_TIME=$(date +%s)

echo "▸ Building crawler image..."
docker build -f infra/docker/Dockerfile -t "${REGISTRY}/ipf-crawler:${TAG}" .
echo "  Pushing crawler image..."
docker push "${REGISTRY}/ipf-crawler:${TAG}"
echo "  ✓ ipf-crawler:${TAG}"
echo ""

echo "▸ Building web simulator image..."
docker build -f infra/docker/Dockerfile.web-simulator \
  -t "${REGISTRY}/ipf-web-simulator:${TAG}" .
echo "  Pushing web simulator image..."
docker push "${REGISTRY}/ipf-web-simulator:${TAG}"
echo "  ✓ ipf-web-simulator:${TAG}"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "═══════════════════════════════════════════"
echo "  ✓ All images pushed (${DURATION}s)"
echo "    ${REGISTRY}/ipf-crawler:${TAG}"
echo "    ${REGISTRY}/ipf-web-simulator:${TAG}"
echo "═══════════════════════════════════════════"

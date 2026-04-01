#!/usr/bin/env bash
# scripts/create-dashboard-configmap.sh — Create Grafana dashboards ConfigMap for k8s
# Loads JSON dashboard files into a ConfigMap that Grafana mounts
set -euo pipefail

NAMESPACE="${NAMESPACE:-ipf}"
DASHBOARD_DIR="infra/monitoring/dashboards"

if [ ! -d "$DASHBOARD_DIR" ]; then
  echo "ERROR: Dashboard directory not found: $DASHBOARD_DIR" >&2
  exit 1
fi

echo "Creating grafana-dashboards ConfigMap from $DASHBOARD_DIR..."

# Build --from-file args for each JSON dashboard
ARGS=()
for f in "$DASHBOARD_DIR"/*.json; do
  [ -f "$f" ] && ARGS+=("--from-file=$f")
done

if [ ${#ARGS[@]} -eq 0 ]; then
  echo "ERROR: No dashboard JSON files found" >&2
  exit 1
fi

kubectl create configmap grafana-dashboards \
  -n "$NAMESPACE" \
  "${ARGS[@]}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Created ConfigMap with ${#ARGS[@]} dashboards"

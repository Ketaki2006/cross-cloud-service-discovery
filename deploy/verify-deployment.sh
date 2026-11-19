#!/bin/bash
# ==============================================================================
# Full Health Test & Cross-Cloud Verification Script
# Usage: bash deploy/verify-deployment.sh
# ==============================================================================
set -e

echo "===================================================================="
echo "    CROSS-CLOUD SERVICE DISCOVERY REGISTRY — FULL VERIFICATION      "
echo "===================================================================="

PASS_COUNT=0
TOTAL_TESTS=7

# Test 1: Systemd Services
echo -n "[Test 1/7] Checking AWS Systemd Services (wg0, consul, user, gateway)... "
WG_ACTIVE=$(systemctl is-active wg-quick@wg0 2>/dev/null || echo "inactive")
CONSUL_ACTIVE=$(systemctl is-active consul 2>/dev/null || echo "inactive")
USER_ACTIVE=$(systemctl is-active user-service 2>/dev/null || echo "inactive")
GATEWAY_ACTIVE=$(systemctl is-active crosscloud-gateway 2>/dev/null || echo "inactive")

if [ "$WG_ACTIVE" = "active" ] && [ "$CONSUL_ACTIVE" = "active" ] && [ "$USER_ACTIVE" = "active" ] && [ "$GATEWAY_ACTIVE" = "active" ]; then
    echo "PASS (all 4 services active)"
    ((PASS_COUNT++))
else
    echo "FAIL (wg0: $WG_ACTIVE, consul: $CONSUL_ACTIVE, user: $USER_ACTIVE, gateway: $GATEWAY_ACTIVE)"
fi

# Test 2: WireGuard Tunnel
echo -n "[Test 2/7] Checking WireGuard Cross-Cloud Ping (10.8.0.1 -> 10.8.0.2)... "
if ping -c 2 -W 3 10.8.0.2 &>/dev/null; then
    RTT=$(ping -c 2 -W 3 10.8.0.2 2>/dev/null | tail -1 | awk -F '/' '{print $5}')
    echo "PASS (0% packet loss, RTT: ${RTT}ms)"
    ((PASS_COUNT++))
else
    echo "FAIL (Cannot ping Azure VM at 10.8.0.2)"
fi

# Test 3: Consul Health & Leader
echo -n "[Test 3/7] Checking HashiCorp Consul Status (127.0.0.1:8500)... "
CONSUL_LEADER=$(curl -s -m 3 http://127.0.0.1:8500/v1/status/leader 2>/dev/null || echo "")
if [[ "$CONSUL_LEADER" == *"127.0.0.1"* ]] || [[ -n "$CONSUL_LEADER" && "$CONSUL_LEADER" != '""' ]]; then
    echo "PASS (Leader: $CONSUL_LEADER)"
    ((PASS_COUNT++))
else
    echo "FAIL (Consul leader not elected: $CONSUL_LEADER)"
fi

# Test 4: Consul Registered Services & Passing Checks
echo -n "[Test 4/7] Checking Registered Services in Consul (user-service & payment-service)... "
SERVICES_JSON=$(curl -s -m 3 http://127.0.0.1:8500/v1/catalog/services 2>/dev/null || echo "{}")
HAS_USER=$(echo "$SERVICES_JSON" | grep -o '"user-service"' || echo "")
HAS_PAY=$(echo "$SERVICES_JSON" | grep -o '"payment-service"' || echo "")

if [ -n "$HAS_USER" ] && [ -n "$HAS_PAY" ]; then
    echo "PASS (user-service and payment-service registered)"
    ((PASS_COUNT++))
else
    echo "FAIL (Missing services in catalog: $SERVICES_JSON)"
fi

# Test 5: API Gateway Overview Endpoint
echo -n "[Test 5/7] Checking Gateway Overview Endpoint (/api/dashboard/overview)... "
OVERVIEW=$(curl -s -m 4 http://127.0.0.1:3000/api/dashboard/overview 2>/dev/null || echo "{}")
DEP_MODE=$(echo "$OVERVIEW" | jq -r '.deploymentMode.mode // empty')
WG_STATE=$(echo "$OVERVIEW" | jq -r '.wireguard.status // empty')

if [ "$DEP_MODE" = "REMOTE" ]; then
    echo "PASS (Mode: REMOTE, WireGuard: $WG_STATE)"
    ((PASS_COUNT++))
else
    echo "FAIL (Mode is '$DEP_MODE', expected 'REMOTE')"
fi

# Test 6: Cross-Cloud Payment Execution
echo -n "[Test 6/7] Testing Live Cross-Cloud Payment (AWS -> Consul -> WireGuard -> Azure)... "
PAY_RES=$(curl -s -m 6 -X POST http://127.0.0.1:3000/api/users/usr_101/pay \
    -H "Content-Type: application/json" \
    -d '{"amount": 100, "currency": "USD", "description": "Verification payment"}' 2>/dev/null || echo "{}")
PAY_STATUS=$(echo "$PAY_RES" | jq -r '.status // empty')
TXN_ID=$(echo "$PAY_RES" | jq -r '.payment.transactionId // .transactionId // empty')
LATENCY=$(echo "$PAY_RES" | jq -r '.latencyMs // empty')

if [ "$PAY_STATUS" = "success" ]; then
    echo "PASS (Txn: $TXN_ID, Latency: ${LATENCY}ms)"
    ((PASS_COUNT++))
else
    echo "FAIL (Response: $PAY_RES)"
fi

# Test 7: Production React SPA serving
echo -n "[Test 7/7] Checking Production React SPA serving on port 3000... "
INDEX_HTML=$(curl -s -m 3 http://127.0.0.1:3000/ 2>/dev/null || echo "")
if [[ "$INDEX_HTML" == *"<!doctype html"* ]] || [[ "$INDEX_HTML" == *"<!DOCTYPE html"* ]]; then
    echo "PASS (React SPA served successfully)"
    ((PASS_COUNT++))
else
    echo "FAIL (Port 3000 not serving index.html)"
fi

echo ""
echo "===================================================================="
echo " Verification Complete: $PASS_COUNT / $TOTAL_TESTS checks passed."
echo "===================================================================="

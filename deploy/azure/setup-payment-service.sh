#!/bin/bash
# ==============================================================================
# Azure VM Setup: Payment Microservice (Node.js Express)
# Private WireGuard IP: 10.8.0.2 | Port: 8001 | Region: Central India
# Registers with Consul Server on AWS EC2 over WireGuard (or SSH-forwarded locally on AWS)
# ==============================================================================
set -e

echo "[1/4] Installing Node.js 20 LTS & Git on Azure VM..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
sudo apt-get install -y git jq curl

echo "[2/4] Setting up Project Directory..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$APP_DIR"
npm install --omit=dev

echo "[3/4] Configuring systemd service /etc/systemd/system/payment-service.service..."
cat <<EOF | sudo tee /etc/systemd/system/payment-service.service
[Unit]
Description=Azure Payment Microservice (Cross-Cloud Mesh)
After=network-online.target wg-quick@wg0.service

[Service]
Type=simple
User=${SUDO_USER:-$USER}
WorkingDirectory=$APP_DIR
Environment=PAYMENT_PORT=8001
Environment=CLOUD_PROVIDER=AZURE
Environment="CLOUD_REGION=Central India"
ExecStart=/usr/bin/node payment-service.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable payment-service
sudo systemctl restart payment-service

echo "[4/4] Verifying local Azure Payment Service health..."
sleep 2
curl -s http://127.0.0.1:8001/health | jq .

echo ""
echo "NOTE: Because Consul on AWS EC2 is bound securely to 127.0.0.1:8500,"
echo "register this Azure node on AWS EC2 by running:"
echo "curl -X PUT http://127.0.0.1:8500/v1/agent/service/register -H 'Content-Type: application/json' -d '{\"ID\":\"payment-service-azure-1\",\"Name\":\"payment-service\",\"Tags\":[\"AZURE\",\"central-india\"],\"Address\":\"10.8.0.2\",\"Port\":8001,\"Check\":{\"HTTP\":\"http://10.8.0.2:8001/health\",\"Interval\":\"10s\",\"Timeout\":\"3s\"}}'"

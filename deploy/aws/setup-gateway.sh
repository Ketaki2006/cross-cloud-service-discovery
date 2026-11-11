#!/bin/bash
# ==============================================================================
# AWS EC2 Setup: Express Gateway & Built React Frontend (Port 3000)
# Proxies Consul (127.0.0.1:8500) & User Service (127.0.0.1:8002) securely
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$APP_DIR"

echo "[1/3] Installing backend & frontend dependencies and building React SPA..."
npm install --omit=dev
npm --prefix frontend install
npm --prefix frontend run build

echo "[2/3] Creating systemd unit /etc/systemd/system/crosscloud-gateway.service..."
cat <<EOF | sudo tee /etc/systemd/system/crosscloud-gateway.service
[Unit]
Description=Cross-Cloud Service Discovery Express Gateway & React SPA
After=network-online.target consul.service user-service.service wg-quick@wg0.service

[Service]
Type=simple
User=${SUDO_USER:-$USER}
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=CONSUL_URL=http://127.0.0.1:8500
Environment=USER_SERVICE_URL=http://127.0.0.1:8002
Environment=AWS_REGION=us-east-1
Environment="AZURE_REGION=Central India"
Environment=AWS_WG_IP=10.8.0.1
Environment=AZURE_WG_IP=10.8.0.2
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "[3/3] Enabling and starting crosscloud-gateway service..."
sudo systemctl daemon-reload
sudo systemctl enable crosscloud-gateway
sudo systemctl restart crosscloud-gateway

sleep 2
sudo systemctl status crosscloud-gateway --no-pager | head -n 12
echo ""
curl -s http://127.0.0.1:3000/api/dashboard/overview | head -c 400
echo ""

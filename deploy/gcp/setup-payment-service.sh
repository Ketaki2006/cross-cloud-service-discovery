#!/bin/bash
# ==============================================================================
# GCP Compute Engine Setup: Payment Service (Node.js Express)
# Private WireGuard IP: 10.8.0.2 | Port: 8001
# Communicates with Consul Server at 10.8.0.1:8500 over WireGuard
# ==============================================================================
set -e

echo "[1/4] Installing Node.js 20 LTS & Git on GCP VM..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git jq

echo "[2/4] Setting up Project Directory..."
APP_DIR="/opt/cross-cloud-service-discovery"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Copy application files (or git clone)
cp -r . $APP_DIR/ || true
cd $APP_DIR
npm install --production

echo "[3/4] Configuring systemd service for Payment Service..."
cat <<EOF | sudo tee /etc/systemd/system/payment-service.service
[Unit]
Description=GCP Payment Service (Cross-Cloud Mesh)
After=network.target wg-quick@wg0.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
Environment=PAYMENT_PORT=8001
Environment=CLOUD_PROVIDER=GCP
ExecStart=/usr/bin/node payment-service.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable payment-service
sudo systemctl restart payment-service

echo "[4/4] Registering Payment Service with Consul Server at 10.8.0.1:8500..."
sleep 2

# Verify Consul connectivity over WireGuard tunnel
if ! curl -s --connect-timeout 5 http://10.8.0.1:8500/v1/status/leader > /dev/null; then
    echo "ERROR: Cannot reach Consul Server at http://10.8.0.1:8500 over WireGuard."
    echo "Verify WireGuard connection with: ping 10.8.0.1"
    exit 1
fi

curl -s -X PUT http://10.8.0.1:8500/v1/agent/service/register \
  -H "Content-Type: application/json" \
  -d '{
    "ID": "payment-service-gcp-1",
    "Name": "payment-service",
    "Tags": ["GCP", "us-central1", "production"],
    "Address": "10.8.0.2",
    "Port": 8001,
    "Check": {
      "HTTP": "http://10.8.0.2:8001/health",
      "Interval": "10s",
      "Timeout": "3s"
    }
  }'

echo ""
echo "Payment Service successfully registered from GCP into Consul!"
curl -s http://127.0.0.1:8001/health | jq .

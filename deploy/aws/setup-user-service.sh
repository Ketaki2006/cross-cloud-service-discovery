#!/bin/bash
# ==============================================================================
# AWS EC2 Setup: User Service (Node.js Express)
# Private WireGuard IP: 10.8.0.1 | Port: 8002
# ==============================================================================
set -e

echo "[1/4] Installing Node.js 20 LTS & Git..."
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

echo "[3/4] Configuring systemd service for User Service..."
cat <<EOF | sudo tee /etc/systemd/system/user-service.service
[Unit]
Description=AWS User Service (Cross-Cloud Mesh)
After=network.target wg-quick@wg0.service consul.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
Environment=USER_PORT=8002
Environment=CLOUD_PROVIDER=AWS
Environment=CONSUL_URL=http://127.0.0.1:8500
Environment=TARGET_SERVICE_NAME=payment-service
ExecStart=/usr/bin/node user-service.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable user-service
sudo systemctl restart user-service

echo "[4/4] Registering User Service with Consul (Private WireGuard IP: 10.8.0.1)..."
sleep 2

curl -s -X PUT http://127.0.0.1:8500/v1/agent/service/register \
  -H "Content-Type: application/json" \
  -d '{
    "ID": "user-service-aws-1",
    "Name": "user-service",
    "Tags": ["AWS", "us-east-1", "production"],
    "Address": "10.8.0.1",
    "Port": 8002,
    "Check": {
      "HTTP": "http://10.8.0.1:8002/health",
      "Interval": "10s",
      "Timeout": "3s"
    }
  }'

echo ""
echo "User Service successfully registered with Consul on AWS!"
curl -s http://127.0.0.1:8002/health | jq .

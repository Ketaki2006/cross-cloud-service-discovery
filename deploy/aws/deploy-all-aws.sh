#!/bin/bash
# ==============================================================================
# Master Automated Deployment Script for AWS EC2 (Cross-Cloud Mesh Gateway)
# Run with: sudo bash deploy/aws/deploy-all-aws.sh [OPTIONAL_AZURE_PUBLIC_IP]
# ==============================================================================
set -e

AZURE_PUBLIC_IP="${1:-20.197.56.115}"
AZURE_PUBKEY="FO/zjIFxc3vd3je5DJySFVFo1FoH1+t3hpSdfWkK8Cg="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$APP_DIR"

echo "===================================================================="
echo "   CROSS-CLOUD SERVICE DISCOVERY REGISTRY — AWS EC2 DEPLOYMENT     "
echo "===================================================================="
echo "Repository Directory: $APP_DIR"
echo "Target Azure Endpoint: $AZURE_PUBLIC_IP:51820"
echo ""

# 1. System packages
echo "[1/8] Updating package index and verifying base dependencies..."
sudo apt-get update -y
sudo apt-get install -y curl jq unzip git wireguard wireguard-tools

# 2. Node.js check
echo "[2/8] Verifying Node.js 20+ LTS installation..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node version: $(node -v) | npm version: $(npm -v)"

# 3. HashiCorp Consul check
echo "[3/8] Verifying HashiCorp Consul installation..."
CONSUL_VERSION="1.15.4"
if ! command -v consul &> /dev/null; then
    wget -q "https://releases.hashicorp.com/consul/${CONSUL_VERSION}/consul_${CONSUL_VERSION}_linux_amd64.zip"
    unzip -o "consul_${CONSUL_VERSION}_linux_amd64.zip"
    sudo mv consul /usr/local/bin/
    rm -f "consul_${CONSUL_VERSION}_linux_amd64.zip"
fi
echo "Consul version: $(consul version | head -n 1)"

# 4. WireGuard configuration
echo "[4/8] Configuring WireGuard VPN tunnel (/etc/wireguard/wg0.conf)..."
sudo mkdir -p /etc/wireguard
cd /etc/wireguard
umask 077
if [ ! -f /etc/wireguard/aws_private.key ]; then
    wg genkey | sudo tee /etc/wireguard/aws_private.key | wg pubkey | sudo tee /etc/wireguard/aws_public.key > /dev/null
fi
AWS_PRIV=$(sudo cat /etc/wireguard/aws_private.key)
AWS_PUB=$(sudo cat /etc/wireguard/aws_public.key)

cat <<EOF | sudo tee /etc/wireguard/wg0.conf > /dev/null
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = $AWS_PRIV
SaveConfig = false

# Peer: Microsoft Azure VM (Central India)
[Peer]
PublicKey = $AZURE_PUBKEY
Endpoint = $AZURE_PUBLIC_IP:51820
AllowedIPs = 10.8.0.2/32
PersistentKeepalive = 25
EOF

cd "$APP_DIR"

# 5. Consul Server configuration & persistent service definitions
echo "[5/8] Configuring HashiCorp Consul (/etc/consul.d/)..."
sudo mkdir -p /etc/consul.d
sudo mkdir -p /var/lib/consul

cat <<EOF | sudo tee /etc/consul.d/consul.hcl > /dev/null
datacenter = "aws-us-east-1"
data_dir = "/var/lib/consul"
log_level = "INFO"
node_name = "aws-consul-server"
server = true
bootstrap_expect = 1
bind_addr = "127.0.0.1"
client_addr = "127.0.0.1"

ports {
  http = 8500
  dns  = 8600
}

ui_config {
  enabled = true
}
EOF

cat <<EOF | sudo tee /etc/consul.d/user-service.json > /dev/null
{
  "service": {
    "id": "user-service-aws-1",
    "name": "user-service",
    "tags": ["AWS", "us-east-1", "production"],
    "address": "10.8.0.1",
    "port": 8002,
    "check": {
      "id": "user-service-check",
      "name": "AWS User Service Health Check",
      "http": "http://10.8.0.1:8002/health",
      "interval": "10s",
      "timeout": "3s"
    }
  }
}
EOF

cat <<EOF | sudo tee /etc/consul.d/payment-service.json > /dev/null
{
  "service": {
    "id": "payment-service-azure-1",
    "name": "payment-service",
    "tags": ["AZURE", "central-india"],
    "address": "10.8.0.2",
    "port": 8001,
    "check": {
      "id": "payment-service-check",
      "name": "Azure Payment Service Health Check",
      "http": "http://10.8.0.2:8001/health",
      "interval": "10s",
      "timeout": "3s"
    }
  }
}
EOF

# 6. Systemd Units configuration
echo "[6/8] Configuring systemd units for auto-start on boot..."

# Unit A: Consul Service
cat <<EOF | sudo tee /etc/systemd/system/consul.service > /dev/null
[Unit]
Description=HashiCorp Consul Agent
Requires=network-online.target
After=network-online.target wg-quick@wg0.service

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/consul agent -config-dir=/etc/consul.d
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Unit B: User Service
cat <<EOF | sudo tee /etc/systemd/system/user-service.service > /dev/null
[Unit]
Description=AWS User Service (Cross-Cloud Mesh)
After=network-online.target wg-quick@wg0.service consul.service
Wants=network-online.target wg-quick@wg0.service consul.service

[Service]
Type=simple
User=${SUDO_USER:-$USER}
WorkingDirectory=$APP_DIR
Environment=USER_PORT=8002
Environment=CLOUD_PROVIDER=AWS
Environment=CLOUD_REGION=us-east-1
Environment=CONSUL_URL=http://127.0.0.1:8500
Environment=TARGET_SERVICE_NAME=payment-service
ExecStart=/usr/bin/node user-service.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Unit C: CrossCloud Gateway
cat <<EOF | sudo tee /etc/systemd/system/crosscloud-gateway.service > /dev/null
[Unit]
Description=Cross-Cloud Service Discovery Express Gateway & React SPA
After=network-online.target consul.service user-service.service wg-quick@wg0.service
Wants=network-online.target consul.service user-service.service wg-quick@wg0.service

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

# 7. Build React SPA and install dependencies
echo "[7/8] Installing dependencies and building production React SPA..."
npm install --omit=dev
npm --prefix frontend install
npm --prefix frontend run build

# 8. Enable & Start Services in order
echo "[8/8] Enabling and restarting all services..."
sudo systemctl daemon-reload

sudo systemctl enable wg-quick@wg0
sudo systemctl enable consul
sudo systemctl enable user-service
sudo systemctl enable crosscloud-gateway

sudo systemctl restart wg-quick@wg0
sleep 1
sudo systemctl restart consul
sleep 2
sudo systemctl restart user-service
sleep 1
sudo systemctl restart crosscloud-gateway
sleep 2

# Verification
echo ""
echo "===================================================================="
echo "                   VERIFICATION & STATUS CHECK                      "
echo "===================================================================="
echo "AWS WireGuard Public Key: $AWS_PUB"
echo ""

echo "--- Systemd Service Status ---"
sudo systemctl is-active wg-quick@wg0 consul user-service crosscloud-gateway || true
echo ""

echo "--- Local API Gateway Endpoint Tests ---"
echo -n "GET /api/health: "
curl -s http://127.0.0.1:3000/api/health | jq -r '.status // .message' || echo "FAIL"

echo -n "GET /api/consul/status: "
curl -s http://127.0.0.1:3000/api/consul/status | jq -r '"Connected: " + (.connected|tostring) + ", Leader: " + (.leader|tostring)' || echo "FAIL"

echo -n "GET /api/services: "
curl -s http://127.0.0.1:3000/api/services | jq -r '"Count: " + (.count|tostring)' || echo "FAIL"

echo -n "GET /api/dashboard/overview: "
curl -s http://127.0.0.1:3000/api/dashboard/overview | jq -r '"Mode: " + .deploymentMode.mode + ", WireGuard: " + .wireguard.status' || echo "FAIL"

echo ""
echo "--- WireGuard Tunnel Handshake ---"
sudo wg show || true

echo ""
AWS_PUBLIC_IP=$(curl -s -m 3 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s -m 3 ifconfig.me 2>/dev/null || echo "<AWS_PUBLIC_IP>")
echo "===================================================================="
echo " DEPLOYMENT COMPLETE! "
echo " Public Dashboard URL: http://${AWS_PUBLIC_IP}:3000"
echo "===================================================================="

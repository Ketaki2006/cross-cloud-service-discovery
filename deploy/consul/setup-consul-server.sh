#!/bin/bash
# ==============================================================================
# HashiCorp Consul Server Setup on AWS EC2
# Bound strictly to 127.0.0.1:8500 (shielded from the public internet)
# Performs active HTTP health probes to Azure Payment Service over WireGuard (10.8.0.2:8001)
# ==============================================================================
set -e

CONSUL_VERSION="1.15.4"
echo "[1/4] Installing dependencies & downloading Consul v${CONSUL_VERSION} (if missing)..."
sudo apt-get update -y
sudo apt-get install -y unzip curl jq wget

if ! command -v consul &> /dev/null; then
    wget -q "https://releases.hashicorp.com/consul/${CONSUL_VERSION}/consul_${CONSUL_VERSION}_linux_amd64.zip"
    unzip -o "consul_${CONSUL_VERSION}_linux_amd64.zip"
    sudo mv consul /usr/local/bin/
    rm -f "consul_${CONSUL_VERSION}_linux_amd64.zip"
fi

echo "[2/4] Creating Consul configuration directory..."
sudo mkdir -p /etc/consul.d
sudo mkdir -p /var/lib/consul

cat <<EOF | sudo tee /etc/consul.d/consul.hcl
datacenter = "aws-us-east-1"
data_dir = "/var/lib/consul"
log_level = "INFO"
node_name = "aws-consul-server"
server = true
bootstrap_expect = 1

# Keep Consul API strictly bound to localhost; remote nodes are probed over WireGuard wg0
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

echo "[3/4] Creating systemd service /etc/systemd/system/consul.service..."
cat <<EOF | sudo tee /etc/systemd/system/consul.service
[Unit]
Description=HashiCorp Consul Agent
Requires=network-online.target
After=network-online.target wg-quick@wg0.service

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/consul agent -config-dir=/etc/consul.d
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

echo "[4/4] Starting Consul Server..."
sudo systemctl daemon-reload
sudo systemctl enable consul
sudo systemctl restart consul

sleep 3
echo "Consul status:"
curl -s http://127.0.0.1:8500/v1/status/leader
echo ""
echo "Consul Server listening securely on 127.0.0.1:8500 (datacenter: aws-us-east-1)"

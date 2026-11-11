#!/bin/bash
# ==============================================================================
# WireGuard Cross-Cloud Tunnel Setup for Azure VM (Peer 2)
# Subnet: 10.8.0.2/24 | Listen Port: 51820/UDP
# ==============================================================================
set -e

echo "[1/4] Installing WireGuard..."
sudo apt-get update -y
sudo apt-get install -y wireguard wireguard-tools

echo "[2/4] Generating WireGuard Keys on Azure VM..."
cd /etc/wireguard
umask 077
if [ ! -f azure_private.key ]; then
    wg genkey | tee azure_private.key | wg pubkey > azure_public.key
fi

AZURE_PRIV=$(cat azure_private.key)
AZURE_PUB=$(cat azure_public.key)

echo "----------------------------------------------------"
echo "Azure VM Public Key: $AZURE_PUB"
echo "----------------------------------------------------"

echo "[3/4] Creating /etc/wireguard/wg0.conf..."
# Note: Replace REPLACE_WITH_AWS_PUBLIC_KEY and REPLACE_WITH_AWS_PUBLIC_IP with actual AWS values
cat <<EOF | sudo tee /etc/wireguard/wg0.conf
[Interface]
Address = 10.8.0.2/24
ListenPort = 51820
PrivateKey = $AZURE_PRIV
SaveConfig = false

# Peer: Amazon Web Services (AWS) EC2 Instance (us-east-1)
[Peer]
# Replace with AWS EC2 Public Key from /etc/wireguard/aws_public.key:
PublicKey = REPLACE_WITH_AWS_PUBLIC_KEY
# Replace with AWS EC2 Public IPv4 Address:
Endpoint = REPLACE_WITH_AWS_PUBLIC_IP:51820
AllowedIPs = 10.8.0.1/32
PersistentKeepalive = 25
EOF

echo "[4/4] Starting WireGuard Tunnel wg0..."
sudo systemctl enable wg-quick@wg0
sudo systemctl restart wg-quick@wg0

echo "WireGuard on Azure active. Status:"
sudo wg show


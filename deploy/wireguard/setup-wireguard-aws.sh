#!/bin/bash
# ==============================================================================
# WireGuard Cross-Cloud Tunnel Setup for AWS EC2 (Peer 1)
# Subnet: 10.8.0.1/24 | Listen Port: 51820/UDP
# ==============================================================================
set -e

echo "[1/4] Installing WireGuard..."
sudo apt-get update -y
sudo apt-get install -y wireguard wireguard-tools

echo "[2/4] Generating WireGuard Keys on AWS EC2..."
cd /etc/wireguard
umask 077
if [ ! -f aws_private.key ]; then
    wg genkey | tee aws_private.key | wg pubkey > aws_public.key
fi

AWS_PRIV=$(cat aws_private.key)
AWS_PUB=$(cat aws_public.key)

echo "----------------------------------------------------"
echo "AWS EC2 Public Key: $AWS_PUB"
echo "----------------------------------------------------"

echo "[3/4] Creating /etc/wireguard/wg0.conf..."
# Note: Replace REPLACE_WITH_AZURE_PUBLIC_KEY and REPLACE_WITH_AZURE_PUBLIC_IP with actual Azure values
cat <<EOF | sudo tee /etc/wireguard/wg0.conf
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = $AWS_PRIV
SaveConfig = false

# Peer: Microsoft Azure VM (Central India)
[Peer]
# Replace with Azure VM Public Key from /etc/wireguard/azure_public.key:
PublicKey = REPLACE_WITH_AZURE_PUBLIC_KEY
# Replace with Azure VM Public IPv4 Address:
Endpoint = REPLACE_WITH_AZURE_PUBLIC_IP:51820
AllowedIPs = 10.8.0.2/32
PersistentKeepalive = 25
EOF

echo "[4/4] Starting WireGuard Tunnel wg0..."
sudo systemctl enable wg-quick@wg0
sudo systemctl restart wg-quick@wg0

echo "WireGuard on AWS active. Status:"
sudo wg show

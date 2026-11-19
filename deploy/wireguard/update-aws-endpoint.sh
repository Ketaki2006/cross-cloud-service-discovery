#!/bin/bash
# ==============================================================================
# Update AWS Peer Endpoint on Azure VM
# Usage: ./update-aws-endpoint.sh <NEW_AWS_PUBLIC_IP>
# ==============================================================================
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <NEW_AWS_PUBLIC_IP>"
    exit 1
fi

NEW_IP="$1"
AWS_PUBKEY="${AWS_PUBLIC_KEY:-0NkyhxpPqb7VckGeLcoh3USCT2QkW4/pkgDLg6YRaX8=}"

echo "Updating WireGuard endpoint on Azure to $NEW_IP:51820..."
sudo sed -i -E "s/Endpoint = [0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:51820/Endpoint = $NEW_IP:51820/" /etc/wireguard/wg0.conf
sudo wg set wg0 peer "$AWS_PUBKEY" endpoint "$NEW_IP:51820"

echo ""
echo "WireGuard live status on Azure:"
sudo wg show
echo ""
echo "Attempting ping to AWS (10.8.0.1) over WireGuard:"
ping -c 3 -W 2 10.8.0.1 || echo "Note: AWS node will respond once its EC2 instance and WireGuard service are up."

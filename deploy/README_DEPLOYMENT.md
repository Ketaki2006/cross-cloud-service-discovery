# Real Cross-Cloud Microservice Deployment Guide: AWS EC2 & Azure VM

---

## Executive Overview

This guide documents the live deployment architecture for **Cross-Cloud Service Discovery Registry** across two independent public cloud providers connected via an encrypted **WireGuard VPN (`wg0`)**:

- **Cloud Provider 1 — Amazon Web Services (`us-east-1`):**
  - Hosts **HashiCorp Consul Server** (`127.0.0.1:8500`, datacenter `aws-us-east-1`)
  - Hosts **AWS User Service** (`user-service.js`, port `8002`, registered as `user-service-aws-1`)
  - Hosts **Express Gateway & Built React SPA** (`server.js` via `crosscloud-gateway.service`, port `3000`)
- **Cloud Provider 2 — Microsoft Azure (`Central India`):**
  - Hosts **Azure Payment Service** (`payment-service.js`, port `8001`, registered as `payment-service-azure-1`)
- **Encrypted Mesh Networking — WireGuard (`51820/UDP`):**
  - AWS EC2 WireGuard IP: `10.8.0.1/24`
  - Azure VM WireGuard IP: `10.8.0.2/24`
- **Security Posture:**
  - Consul HTTP API (`8500`) is bound strictly to `127.0.0.1` and never exposed publicly.
  - Microservice ports (`8001`, `8002`) communicate over `wg0` (`10.8.0.x`) and localhost, not open to the public internet.
  - Only WireGuard (`51820/UDP`), SSH (`22/TCP` restricted), and the React/Express Gateway (`3000/TCP` when permitted in AWS Security Group) handle external traffic.

---

## Network & Service Architecture

```
┌───────────────────────────────────────────────┐             ┌──────────────────────────────────────────────┐
│            AWS Cloud (us-east-1)              │             │        Microsoft Azure (Central India)       │
│                                               │             │                                              │
│  Ubuntu 24.04 EC2 (Private: 172.31.20.133)    │             │  Ubuntu 24.04 VM (Private: 172.16.0.4)       │
│  WireGuard wg0: 10.8.0.1/24                   │             │  WireGuard wg0: 10.8.0.2/24                  │
│                                               │             │                                              │
│  ┌─────────────────────────────────────────┐  │             │                                              │
│  │ Express Gateway + React SPA (:3000)     │  │             │                                              │
│  │ systemd: crosscloud-gateway.service     │  │             │                                              │
│  └──────────────┬──────────────┬───────────┘  │             │                                              │
│                 │              │              │             │                                              │
│                 ▼              ▼              │             │                                              │
│  ┌─────────────────────┐  ┌────────────────┐  │  WireGuard  │  ┌────────────────────────────────────────┐  │
│  │ AWS User Service    │  │ HashiCorp      │  │  Encrypted  │  │ Azure Payment Service                  │  │
│  │ 127.0.0.1:8002      │─▶│ Consul Server  │◀─┼──51820/UDP──┼─▶│ Listening: 0.0.0.0:8001                │  │
│  │ POST /api/users/    │  │ 127.0.0.1:8500 │  │             │  │ Registered IP: 10.8.0.2:8001           │  │
│  │      :id/pay        │  │ dc:aws-us-east │  │ Health/Pay  │  │ POST /api/payments/process             │  │
│  └──────────────┬──────┘  └────────────────┘  │             │  └────────────────────────────────────────┘  │
│                 └─────────────────────────────┼─10.8.0.1───▶│  (Real Cross-Cloud HTTP Over WireGuard)      │
└───────────────────────────────────────────────┘             └──────────────────────────────────────────────┘
```

---

## Prerequisites & Cloud Firewall Rules

### AWS EC2 Security Group (`us-east-1`)
| Protocol | Port | Source | Purpose |
| :--- | :--- | :--- | :--- |
| TCP | `22` | Your IP (`My IP`) | SSH administration |
| UDP | `51820` | Azure VM Public IP (or `0.0.0.0/0`) | WireGuard VPN tunnel |
| TCP | `3000` | Your IP (`My IP` recommended for demo) | Cross-Cloud React Dashboard & Express Gateway |

> **Note:** Do **not** open ports `8500`, `8001`, or `8002` to `0.0.0.0/0`. If port `3000` is kept closed during testing or behind a strict firewall, use an SSH tunnel (`ssh -N -L 3000:127.0.0.1:3000 -i <aws-key.pem> ubuntu@<AWS_PUBLIC_IP>`) and open `http://localhost:3000`.

### Azure Network Security Group (`Central India`)
| Protocol | Port | Source | Purpose |
| :--- | :--- | :--- | :--- |
| TCP | `22` | Your IP (`My IP`) | SSH administration |
| UDP | `51820` | AWS EC2 Public IP | WireGuard VPN tunnel |

---

## Fresh Provisioning Steps

> If Consul (`consul.service`) and WireGuard (`wg-quick@wg0`) are already running on your VMs, **do not re-run** steps 1–2; skip directly to deploying/updating the application services in steps 3–5.

### Step 1: Establish WireGuard Tunnel (`10.8.0.1` <-> `10.8.0.2`)
1. On **AWS EC2**: run `sudo ./deploy/wireguard/setup-wireguard-aws.sh` and copy the printed AWS public key.
2. On **Azure VM**: run `sudo ./deploy/wireguard/setup-wireguard-azure.sh` and copy the printed Azure public key.
3. Update `/etc/wireguard/wg0.conf` on both hosts with each other's public key and public IP, then run `sudo systemctl restart wg-quick@wg0`.
4. Verify tunnel health:
   ```bash
   # From AWS EC2:
   ping -c 3 10.8.0.2
   # From Azure VM:
   ping -c 3 10.8.0.1
   ```

### Step 2: Configure Consul Server on AWS EC2
```bash
bash deploy/consul/setup-consul-server.sh
```
This binds Consul strictly to `127.0.0.1:8500` in datacenter `aws-us-east-1`.

### Step 3: Deploy Payment Service on Azure VM
```bash
cd ~/cross-cloud-service-discovery
bash deploy/azure/setup-payment-service.sh
```
This installs `payment-service.service` on port `8001` (`CLOUD_PROVIDER=AZURE`, `CLOUD_REGION="Central India"`).

Then, on **AWS EC2**, register Azure Payment Service in Consul pointing to its WireGuard IP:
```bash
curl -X PUT http://127.0.0.1:8500/v1/agent/service/register \
  -H "Content-Type: application/json" \
  -d '{
    "ID": "payment-service-azure-1",
    "Name": "payment-service",
    "Tags": ["AZURE", "central-india"],
    "Address": "10.8.0.2",
    "Port": 8001,
    "Check": {
      "HTTP": "http://10.8.0.2:8001/health",
      "Interval": "10s",
      "Timeout": "3s"
    }
  }'
```

### Step 4: Deploy User Service on AWS EC2
```bash
cd ~/cross-cloud-service-discovery
bash deploy/aws/setup-user-service.sh
```

### Step 5: Deploy Express Gateway + Built React Frontend on AWS EC2
```bash
cd ~/cross-cloud-service-discovery
bash deploy/aws/setup-gateway.sh
```
This builds `frontend/dist` and creates `crosscloud-gateway.service` listening on port `3000`.

---

## Live Verification & Fault-Tolerance Testing

Run on **AWS EC2**:

### 1. Check Service Status & Consul Health
```bash
sudo systemctl is-active consul user-service crosscloud-gateway wg-quick@wg0
curl -s http://127.0.0.1:3000/api/dashboard/overview | jq .
```

### 2. Trigger Real AWS -> Azure Payment Transaction
```bash
curl -s -X POST http://127.0.0.1:3000/api/users/usr_101/pay \
  -H "Content-Type: application/json" \
  -d '{"amount": 250, "currency": "USD", "description": "Live AWS to Azure Payment"}' | jq .
```
Look for `"crossCloud": true`, `"source.cloud": "AWS"`, `"discoveredTarget.cloud": "AZURE"`, `"discoveredTarget.address": "10.8.0.2"`, and `"discoveredTarget.port": 8001`.

### 3. Simulate Outage & Verify Consul Failover (HTTP 503)
```bash
curl -s -X POST http://127.0.0.1:3000/api/scenarios/inject-fault | jq .
sleep 11
curl -s -X POST http://127.0.0.1:3000/api/users/usr_101/pay \
  -H "Content-Type: application/json" \
  -d '{"amount": 50}' | jq .
```
Consul's 10-second health check marks `payment-service-azure-1` as `critical`, and `user-service` returns HTTP `503` (`NO_HEALTHY_SERVICE_INSTANCES`).

### 4. Restore Health & Verify Self-Healing
```bash
curl -s -X POST http://127.0.0.1:3000/api/scenarios/restore-health | jq .
sleep 11
curl -s -X POST http://127.0.0.1:3000/api/users/usr_101/pay \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}' | jq .
```
Consul automatically restores `payment-service-azure-1` to `passing` and traffic resumes with zero restarts or code edits.

### Notes on Persistence & Simulation
- **Payment processing** (`payment-service.js`) is a simulated microservice transaction returning generated `txn_*` IDs (no external banking gateway is integrated).
- **Transaction telemetry** (`user-service.js` `/api/telemetry`) is stored in-memory; restarting `user-service` resets `totalTransactions` and `recentTransactions`.

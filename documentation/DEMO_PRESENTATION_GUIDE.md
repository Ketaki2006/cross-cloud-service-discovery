# College Project Demonstration Guide — Cross-Cloud Service Discovery Registry

This guide prepares you for your live project demonstration and viva using the actual **AWS EC2 ↔ WireGuard VPN ↔ Microsoft Azure VM** deployment and the **React + Express + HashiCorp Consul** stack.

---

## 1. 60-Second Project Pitch (Opening Explanation)

> *"Modern enterprises avoid vendor lock-in by deploying workloads across multiple clouds such as AWS and Microsoft Azure. However, IP addresses across cloud providers are ephemeral, isolated inside separate VPC/VNet subnets, and unsafe to hardcode into microservices. Our project solves this by creating a **Cross-Cloud Service Discovery Registry**: we deploy a User Service and HashiCorp Consul server on **AWS EC2 (us-east-1)** and a Payment Service on a **Microsoft Azure VM (Central India)** connected via an encrypted **WireGuard VPN tunnel (`10.8.0.1` ↔ `10.8.0.2`)**. Instead of hardcoding Azure's IP inside AWS code, the AWS User Service queries Consul dynamically to discover healthy Payment Service instances, sends HTTP transactions across clouds over WireGuard, and automatically stops routing traffic within 10 seconds if Azure fails—then self-heals when Azure recovers."*

---

## 2. Live Cross-Cloud Infrastructure Overview

| Component | Cloud & Region | WireGuard Tunnel IP | Listening Port | Managed By |
| :--- | :--- | :--- | :--- | :--- |
| **React SPA + Express Gateway** (`server.js`) | AWS (`us-east-1`) | `10.8.0.1` | `3000` | `crosscloud-gateway.service` |
| **AWS User Service** (`user-service.js`) | AWS (`us-east-1`) | `10.8.0.1` | `8002` | `user-service.service` |
| **HashiCorp Consul Server** (`aws-us-east-1`) | AWS (`us-east-1`) | `10.8.0.1` (`127.0.0.1`) | `8500` | `consul.service` |
| **Azure Payment Service** (`payment-service.js`) | Azure (`Central India`) | `10.8.0.2` | `8001` | `payment-service.service` |

**Consul Service Registrations:**
- `user-service-aws-1` → Service `user-service`, Tags: `["AWS", "us-east-1"]`, Health check `/health` every 10s.
- `payment-service-azure-1` → Service `payment-service`, Address: `10.8.0.2`, Port: `8001`, Tags: `["AZURE", "central-india"]`, Health check `http://10.8.0.2:8001/health` every 10s.

---

## 3. Pre-Demonstration Checklist (Run 15 Minutes Before)

### Step A: Verify Cloud VMs & Systemd Services
From your laptop terminal, check AWS EC2:
```bash
ssh -i "$env:USERPROFILE\.ssh\aws-crosscloud-key.pem" ubuntu@<AWS_PUBLIC_IP> "sudo systemctl is-active consul user-service crosscloud-gateway wg-quick@wg0"
```
Expected output:
```text
active
active
active
active
```

Check Azure VM:
```bash
ssh -i "$env:USERPROFILE\.ssh\azure-payment-key.pem" azureuser@<AZURE_PUBLIC_IP> "sudo systemctl is-active payment-service wg-quick@wg0"
```
Expected output:
```text
active
active
```

Verify WireGuard tunnel connectivity (AWS → Azure):
```bash
ssh -i "$env:USERPROFILE\.ssh\aws-crosscloud-key.pem" ubuntu@<AWS_PUBLIC_IP> "ping -c 3 10.8.0.2"
```
Expected: `0% packet loss`.

### Step B: Open the Dashboard in Your Browser
- **If AWS Security Group allows Inbound TCP port `3000`:**
  Open `http://<AWS_PUBLIC_IP>:3000`
- **If AWS Security Group keeps port `3000` restricted (recommended zero-exposure demo tunnel):**
  Keep an SSH tunnel running in a dedicated terminal window:
  ```bash
  ssh -N -L 3000:127.0.0.1:3000 -i "$env:USERPROFILE\.ssh\aws-crosscloud-key.pem" ubuntu@<AWS_PUBLIC_IP>
  ```
  Then open `http://localhost:3000` in your browser. Both connect directly to the live AWS EC2 gateway and Azure VM!

---

## 4. Live UI Demonstration Script (7–10 Minutes)

### Minute 0:00 – 1:30 | System Overview (`Dashboard` Page)
1. Show the top Header and Sidebar status indicators confirming connection to **AWS (`us-east-1`)** and **Azure (`Central India`)**.
2. Point out the live KPI cards populated dynamically from `/api/dashboard/overview`:
   - Consul Server leader & datacenter (`aws-us-east-1`)
   - Registered services (`user-service`, `payment-service`)
   - WireGuard tunnel nodes (`10.8.0.1` ↔ `10.8.0.2`)
3. Explain: *"Nothing on this screen is hardcoded—the React frontend polls the Express Gateway (`server.js`), which fetches live Consul state, WireGuard status, and cross-cloud telemetry."*

### Minute 1:30 – 3:30 | Live Cross-Cloud Payment Execution (`Dashboard` / Payment Simulator)
1. Locate the **Cross-Cloud Payment Simulator** panel on the Dashboard.
2. Select a user (e.g., `usr_101`), enter an amount (e.g., `$250 USD`), and submit **Process Cross-Cloud Payment**.
3. Show the real response details:
   - `"crossCloud": true`
   - **Source:** `user-service` running on **AWS (`us-east-1`)**
   - **Discovered Target:** `payment-service-azure-1` on **AZURE (`10.8.0.2:8001`)**
   - **Real Network Latency:** Cross-continent WireGuard round-trip latency (~190–210 ms between US East and Central India!)
   - Generated Transaction ID (`txn_*`) and timestamp.
4. Explain: *"AWS User Service never knew Azure's IP ahead of time. It queried Consul for `?passing` instances of `payment-service`, resolved `10.8.0.2:8001`, and sent the HTTP POST across the encrypted WireGuard tunnel."*

### Minute 3:30 – 5:30 | Registry, Discovery & Probe (`Service Registry` & `Service Discovery` Pages)
1. Navigate to **Service Registry**: show `user-service-aws-1` and `payment-service-azure-1` along with their live Consul tags, addresses (`10.8.0.2:8001`), and health status.
2. Open the **Register Service** modal briefly (or demonstrate registering and deregistering a sample test service) to prove the CRUD lifecycle against Consul's `/v1/agent/service/register` API.
3. Navigate to **Service Discovery**: resolve `payment-service` and trigger a live reachability probe (`/api/services/probe`) to prove HTTP connectivity.

### Minute 5:30 – 8:00 | Fault Injection & Automatic Failover (`Health Monitoring` Page)
1. Open **Health Monitoring** (or the fault control action in the Dashboard).
2. Click **Inject Outage / Fault** on Azure Payment Service (triggers `POST /api/scenarios/inject-fault`, calling Azure `http://10.8.0.2:8001/simulate/unhealthy`).
3. Wait ~10–12 seconds while pointing out Consul's 10-second health check interval (`http://10.8.0.2:8001/health` returns HTTP `503`).
4. Show the status badge flip to **CRITICAL**.
5. Now attempt another payment in the **Payment Simulator**:
   - Point out that it does **not** hang waiting for a dead socket or leak stack traces.
   - Instead, AWS User Service checks Consul (`?passing`), finds zero healthy targets, and gracefully returns HTTP `503` with `NO_HEALTHY_SERVICE_INSTANCES`.

### Minute 8:00 – 9:30 | Self-Healing Recovery & Telemetry (`Health Monitoring` + `Dashboard`)
1. Click **Restore Health** (triggers `POST /api/scenarios/restore-health`, restoring HTTP `200` on Azure).
2. Wait ~10–12 seconds until Consul marks `payment-service-azure-1` as **PASSING**.
3. Run one more cross-cloud payment transaction and show it succeeds immediately—without restarting AWS User Service or editing any configuration!
4. Visit **Settings** briefly to point out runtime configuration and diagnostic details.

---

## 5. Complete Backup Terminal Demonstration (`curl` Commands)

Use these commands over SSH if your browser loses internet access or an examiner asks to inspect the raw API responses:

```bash
# SSH into AWS EC2
ssh -i "$env:USERPROFILE\.ssh\aws-crosscloud-key.pem" ubuntu@<AWS_PUBLIC_IP>

# 1. Verify WireGuard VPN & RTT latency to Azure
ping -c 3 10.8.0.2

# 2. Verify Consul Catalog & Healthy Passing Discovery
curl -s http://127.0.0.1:8500/v1/catalog/services | jq .
curl -s "http://127.0.0.1:8500/v1/health/service/payment-service?passing" | jq .

# 3. Trigger Real AWS -> Azure Cross-Cloud Payment
curl -s -X POST http://127.0.0.1:3000/api/users/usr_101/pay \
  -H "Content-Type: application/json" \
  -d '{"amount": 199, "currency": "USD", "description": "Terminal Viva Demo"}' | jq .

# 4. Inspect Telemetry Collected by AWS User Service
curl -s http://127.0.0.1:3000/api/telemetry | jq .

# 5. Fault Injection & Consul Failover Proof
curl -s -X POST http://127.0.0.1:3000/api/scenarios/inject-fault | jq .
sleep 11
curl -s "http://127.0.0.1:8500/v1/health/checks/payment-service" | jq '.[0].Status'
curl -s -i -X POST http://127.0.0.1:3000/api/users/usr_101/pay \
  -H "Content-Type: application/json" \
  -d '{"amount": 50}'

# 6. Restore Health & Verify Self-Healing
curl -s -X POST http://127.0.0.1:3000/api/scenarios/restore-health | jq .
sleep 11
curl -s "http://127.0.0.1:8500/v1/health/checks/payment-service" | jq '.[0].Status'
curl -s -X POST http://127.0.0.1:3000/api/users/usr_101/pay \
  -H "Content-Type: application/json" \
  -d '{"amount": 75}' | jq .
```

---

## 6. Key Architecture & Codebase Talking Points

- **Express Gateway (`server.js`):** Acts as a single entry point on port `3000`. It serves the production React build (`frontend/dist`), proxies Consul queries so port `8500` never has to be exposed publicly, probes target health, and surfaces unified telemetry and fault-simulation routes.
- **AWS User Service (`user-service.js`):** Exposes `/api/users` and `POST /api/users/:id/pay`. Uses `discoverHealthyPaymentService()` to query Consul's `/v1/health/service/payment-service?passing`, dynamically builds `http://<ServiceAddress>:<ServicePort>/api/payments/process`, records in-memory telemetry (`totalTransactions`, `successCount`, `failureCount`, latency, recent logs), and handles `503` gracefully if Consul reports zero healthy instances.
- **Azure Payment Service (`payment-service.js`):** Listens on port `8001`, serves `/health`, processes `POST /api/payments/process`, and supports `/simulate/unhealthy` and `/simulate/healthy` so live failover can be demonstrated cleanly without crashing the Node.js process.

---

## 7. Security Posture Talking Points

1. **Consul Management Plane Isolation:** Consul binds strictly to `127.0.0.1:8500`. Even if someone scans the AWS EC2 public IP on port `8500`, it is unreachable.
2. **Private Overlay Encryption:** Cross-cloud traffic between AWS EC2 and Azure VM traverses WireGuard UDP port `51820` using Curve25519 asymmetric public/private keys (`10.8.0.1` ↔ `10.8.0.2`), encrypting every HTTP health probe and payment payload in transit.
3. **Minimal Public Surface:** Ports `8001` (Azure) and `8002` (AWS) do not need public internet exposure. Only the dashboard gateway port `3000` (or SSH tunnel to `127.0.0.1:3000`) is accessed from the presenter's browser.

---

## 8. Honest Scope, Constraints & Production Upgrade Path

When examiners ask about limitations or future enhancements, answer transparently:
- **Simulated Payments:** `payment-service.js` validates input and returns structured transaction confirmations (`txn_*`); it does not charge real credit cards or call Stripe/Razorpay.
- **In-Memory Telemetry:** `/api/telemetry` stores recent transactions and counters inside `user-service.js` process memory (`persistence: "in-memory"`). Restarting `user-service` clears history.
- **Production Roadmap:**
  1. Persist telemetry and idempotency keys in PostgreSQL or Redis.
  2. Enable Consul ACL tokens, gossip encryption, and mutual TLS (mTLS) / Consul Connect sidecar proxies.
  3. Scale Consul to a 3-node Raft server quorum across Availability Zones for registry high availability.

---

## 9. Top Examiner Viva Questions & Crisp Answers

1. **Why use HashiCorp Consul instead of DNS or a static `.env` URL?**
   - Static `.env` URLs break when containers/VMs scale or change IPs and keep routing traffic to crashed instances. Consul combines service registration with active 10-second health checks (`/v1/health/service/payment-service?passing`) so dead instances are filtered out automatically before traffic is sent.
2. **Why add WireGuard VPN between AWS and Azure?**
   - AWS VPC (`172.31.x.x`) and Azure VNet (`172.16.x.x`) are isolated private networks. Exposing internal microservices over public HTTP would leak payloads and open attack surfaces. WireGuard creates an encrypted `10.8.0.0/24` Layer-3 overlay so AWS and Azure reach each other directly by private IP.
3. **Why is the observed cross-cloud latency ~190 ms instead of 2 ms?**
   - Our AWS EC2 node is physically hosted in **Virginia, USA (`us-east-1`)** while our Azure VM is hosted in **Pune/Central India**. ~190 ms reflects real trans-oceanic round-trip speed-of-light travel through the encrypted WireGuard tunnel—proving the traffic genuinely crosses continents and cloud providers!
4. **What happens during a WireGuard outage or Azure service crash?**
   - Consul's HTTP probe to `http://10.8.0.2:8001/health` times out or receives `503`. Within 10 seconds, Consul flips the check to `critical`. Any payment request from AWS User Service queries `?passing`, receives zero healthy nodes, and fails fast with HTTP `503` instead of hanging indefinitely.
5. **Can you add a second Payment Service node without changing User Service code?**
   - Yes. Register another instance in Consul with `"Name": "payment-service"`. `user-service.js` automatically discovers passing instances dynamically without code edits or restarts.

---

## 10. Post-Demo Safety & Cleanup

- After completing your demonstration, if you do not need the instances running continuously:
  - Stop/deallocate the VMs in the AWS EC2 Console and Azure Portal to avoid charges (note: public IPs may change upon restart unless Elastic/Static IPs are attached).
  - Do **not** delete `/etc/wireguard/wg0.conf` or `/etc/consul.d/consul.hcl` if you plan to demo again on the same VMs.


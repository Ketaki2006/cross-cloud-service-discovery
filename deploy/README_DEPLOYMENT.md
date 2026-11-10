# Real Cross-Cloud Microservice Deployment Guide: AWS EC2 & GCP Compute Engine

---

## 🎯 Executive Overview
This guide provides the exact, production-ready deployment procedure to execute **Real Cross-Cloud Service Discovery & Microservice Communication** across two distinct public cloud providers:
- **Cloud Provider 1:** Amazon Web Services (AWS) — Hosting **User Service** (Node.js/Express) & HashiCorp Consul Server on an EC2 instance.
- **Cloud Provider 2:** Google Cloud Platform (GCP) — Hosting **Payment Service** (Node.js/Express) on a Compute Engine VM.
- **Secure Networking:** Point-to-Point **WireGuard Encrypted VPN Tunnel** (`10.8.0.0/24`) connecting AWS and GCP directly over private IPs.
- **Zero Public Exposure:** Neither the Consul management API nor internal microservice HTTP ports (8001, 8002) are exposed to the public internet. All inter-cloud discovery and payment transactions flow securely through the WireGuard interface (`wg0`).

---

## 🗺️ Network & Security Architecture

```
┌───────────────────────────────────────┐             ┌────────────────────────────────────────┐
│           AWS Cloud (us-east-1)       │             │       Google Cloud (us-central1)       │
│                                       │             │                                        │
│  EC2 Instance (t2.micro / t3.micro)   │             │   Compute Engine VM (e2-micro)         │
│  Public IP: <AWS_PUBLIC_IP>           │             │   Public IP: <GCP_PUBLIC_IP>           │
│  WireGuard Interface: 10.8.0.1/24     │             │   WireGuard Interface: 10.8.0.2/24     │
│                                       │             │                                        │
│  ┌─────────────────────────────────┐ │             │  ┌──────────────────────────────────┐  │
│  │ HashiCorp Consul Server         │ │             │  │ GCP Payment Service              │  │
│  │ Listening: 10.8.0.1:8500        │ │             │  │ Listening: 10.8.0.2:8001         │  │
│  └────────────────┬────────────────┘ │             │  │ Endpoint: /api/payments/process  │  │
│                   │                  │             │  └────────────────┬─────────────────┘  │
│                   │ Discovery        │             │                   │                    │
│                   ▼                  │             │                   │                    │
│  ┌─────────────────────────────────┐ │  WireGuard  │                   │                    │
│  │ AWS User Service                │ │  UDP Tunnel │                   │                    │
│  │ Listening: 10.8.0.1:8002        │◀┼════51820════┼───────────────────┘                    │
│  │ Endpoint: /api/users/:id/pay    │ │             │ (Private Inter-Cloud HTTP Request)     │
│  └─────────────────────────────────┘ │             │                                        │
└───────────────────────────────────────┘             └────────────────────────────────────────┘
```

---

## 📋 Prerequisites
1. **AWS Account:** Free Tier eligible (access to EC2 console).
2. **GCP Account:** Free Tier eligible ($300 credit or Always Free e2-micro).
3. **SSH Client:** Terminal or PuTTY with generated SSH keys.

---

## 🛠️ Step 1: Provision AWS EC2 Instance (User Service Node)

1. **Launch EC2 Instance:**
   - **Name:** `crosscloud-aws-user-service`
   - **AMI:** Ubuntu Server 22.04 LTS (HVM), SSD Volume Type (64-bit x86)
   - **Instance Type:** `t2.micro` or `t3.micro` (Free Tier eligible)
   - **Key Pair:** Create or select an existing `.pem` key (e.g. `aws-mesh-key.pem`)
2. **Configure Security Group (Firewall Rules):**
   Create a new Security Group named `crosscloud-aws-sg` with the following inbound rules:
   | Type | Protocol | Port Range | Source | Purpose |
   | :--- | :--- | :--- | :--- | :--- |
   | **SSH** | TCP | `22` | Your IP (`My IP`) | Secure administrative access |
   | **Custom UDP** | UDP | `51820` | `0.0.0.0/0` | WireGuard cross-cloud tunnel |
   | **Custom TCP** | TCP | `3000` | Your IP (`My IP`) | React Web Dashboard access |
   *(Do NOT open ports 8500, 8001, or 8002 to 0.0.0.0/0. They communicate strictly over WireGuard!)*
3. **Launch Instance** and note the **Public IPv4 Address** (e.g. `54.210.10.20`).

---

## 🛠️ Step 2: Provision GCP Compute Engine VM (Payment Service Node)

1. **Create Compute Engine VM:**
   - **Name:** `crosscloud-gcp-payment-service`
   - **Region / Zone:** `us-central1` (Iowa) / `us-central1-a`
   - **Machine Type:** `e2-micro` (2 vCPUs, 1 GB memory — Free Tier eligible)
   - **Boot Disk:** Ubuntu 22.04 LTS x86/64
2. **Configure GCP VPC Firewall Rules:**
   Navigate to **VPC Network $\rightarrow$ Firewall $\rightarrow$ Create Firewall Rule**:
   - **Name:** `allow-wireguard-crosscloud`
   - **Targets:** All instances in the network
   - **Source IPv4 Ranges:** `0.0.0.0/0`
   - **Protocols and Ports:** Specified protocols $\rightarrow$ `udp:51820`
3. Note the **External IPv4 Address** of the GCP VM (e.g. `34.135.40.80`).

---

## 🔒 Step 3: Establish the Encrypted WireGuard Cross-Cloud Tunnel

### On AWS EC2:
SSH into your AWS instance:
```bash
ssh -i "aws-mesh-key.pem" ubuntu@<AWS_PUBLIC_IP>
```
Run the setup script:
```bash
git clone https://github.com/Ketaki2006/cross-cloud-service-discovery.git
cd cross-cloud-service-discovery
chmod +x deploy/wireguard/*.sh deploy/aws/*.sh deploy/gcp/*.sh deploy/consul/*.sh
sudo ./deploy/wireguard/setup-wireguard-aws.sh
```
The script outputs:
```
AWS EC2 Public Key: <AWS_PUBLIC_KEY_STRING>
```

### On GCP Compute Engine:
SSH into your GCP VM (via Google Cloud Console "SSH" button or terminal):
```bash
git clone https://github.com/Ketaki2006/cross-cloud-service-discovery.git
cd cross-cloud-service-discovery
chmod +x deploy/wireguard/*.sh deploy/aws/*.sh deploy/gcp/*.sh deploy/consul/*.sh
sudo ./deploy/wireguard/setup-wireguard-gcp.sh
```
The script outputs:
```
GCP VM Public Key: <GCP_PUBLIC_KEY_STRING>
```

### Complete Point-to-Point Peering:
1. **On AWS EC2:** Edit `/etc/wireguard/wg0.conf`:
   - Replace `REPLACE_WITH_GCP_PUBLIC_KEY` with the GCP VM Public Key.
   - Replace `REPLACE_WITH_GCP_PUBLIC_IP` with GCP VM External IP.
   - Restart WireGuard: `sudo systemctl restart wg-quick@wg0`
2. **On GCP VM:** Edit `/etc/wireguard/wg0.conf`:
   - Replace `REPLACE_WITH_AWS_PUBLIC_KEY` with the AWS EC2 Public Key.
   - Replace `REPLACE_WITH_AWS_PUBLIC_IP` with AWS EC2 Public IP.
   - Restart WireGuard: `sudo systemctl restart wg-quick@wg0`

### Verify the Cross-Cloud Tunnel:
From AWS EC2, ping the GCP VM over the private tunnel:
```bash
ping -c 4 10.8.0.2
```
Expected output:
```
64 bytes from 10.8.0.2: icmp_seq=1 ttl=64 time=24.3 ms
4 packets transmitted, 4 received, 0% packet loss
```
*(Your AWS and GCP instances are now securely interconnected on a private high-speed subnet!)*

---

## 🏛️ Step 4: Start Consul Server on AWS EC2

On AWS EC2, execute:
```bash
cd /opt/cross-cloud-service-discovery || cd ~/cross-cloud-service-discovery
sudo ./deploy/consul/setup-consul-server.sh
```
Verify Consul is listening on WireGuard IP:
```bash
curl -s http://10.8.0.1:8500/v1/status/leader
# Expected: "10.8.0.1:8300"
```

---

## 💳 Step 5: Start Payment Service on GCP VM

On GCP Compute Engine VM, execute:
```bash
cd ~/cross-cloud-service-discovery
sudo ./deploy/gcp/setup-payment-service.sh
```
This script:
1. Starts `payment-service.js` listening on `10.8.0.2:8001`.
2. Registers `payment-service-gcp-1` with Consul Server at `http://10.8.0.1:8500`.
3. Verifies that Consul immediately initiates active HTTP health probes to `http://10.8.0.2:8001/health` across the WireGuard tunnel!

---

## 👤 Step 6: Start User Service on AWS EC2

On AWS EC2, execute:
```bash
cd ~/cross-cloud-service-discovery
sudo ./deploy/aws/setup-user-service.sh
```
This script:
1. Starts `user-service.js` listening on `10.8.0.1:8002`.
2. Registers `user-service-aws-1` with Consul.
3. Points discovery queries to `http://127.0.0.1:8500`.

---

## 🚀 Step 7: Execute & Verify Real Cross-Cloud Communication

From AWS EC2, invoke the live cross-cloud payment endpoint:
```bash
curl -X POST http://127.0.0.1:8002/api/users/usr_101/pay \
  -H "Content-Type: application/json" \
  -d '{"amount": 150, "currency": "USD", "description": "Viva Demo Cross-Cloud Payment"}' | jq .
```

### Actual Expected Cross-Cloud Response:
```json
{
  "status": "success",
  "crossCloud": true,
  "source": {
    "service": "user-service",
    "cloud": "AWS",
    "port": 8002,
    "user": {
      "id": "usr_101",
      "name": "Ketaki"
    }
  },
  "discoveredTarget": {
    "service": "payment-service",
    "instanceId": "payment-service-gcp-1",
    "cloud": "GCP",
    "address": "10.8.0.2",
    "port": 8001,
    "url": "http://10.8.0.2:8001/api/payments/process"
  },
  "latencyMs": 28,
  "payment": {
    "status": "success",
    "transactionId": "txn_1794310965795_8842",
    "userId": "usr_101",
    "amount": 150,
    "currency": "USD",
    "description": "Viva Demo Cross-Cloud Payment",
    "service": "payment-service",
    "cloud": "GCP",
    "processedAt": "2026-11-10T12:00:00.000Z",
    "message": "Payment processed successfully across clouds"
  },
  "timestamp": "2026-11-10T12:00:00.002Z"
}
```

---

## 🧪 Step 8: Complete Demonstration & Validation Scenarios (Viva Checklist)

### Test Scenario 1: Normal Operation (Happy Path)
- **Action:** Call `POST http://127.0.0.1:8002/api/users/usr_101/pay` on AWS.
- **Proof:** User Service on AWS dynamically looks up `payment-service` in Consul, receives GCP address `10.8.0.2:8001`, and executes the transaction in ~25-30ms round-trip latency.

### Test Scenario 2: GCP Payment Service Failure / Outage
- **Action on GCP VM:** Inject fault or stop service:
  ```bash
  sudo systemctl stop payment-service
  ```
- **Proof:**
  1. Within 10 seconds, Consul marks the health check as **CRITICAL**.
  2. Repeat the payment request on AWS:
     ```bash
     curl -s -X POST http://127.0.0.1:8002/api/users/usr_101/pay -H "Content-Type: application/json" -d '{"amount": 50}' | jq .
     ```
  3. Response gracefully returns HTTP 503:
     ```json
     {
       "status": "error",
       "code": "NO_HEALTHY_SERVICE_INSTANCES",
       "message": "Service discovery failed: no passing health check instances of 'payment-service' registered in Consul."
     }
     ```

### Test Scenario 3: Self-Healing Recovery
- **Action on GCP VM:** Restart Payment Service:
  ```bash
  sudo systemctl start payment-service
  ```
- **Proof:**
  1. Consul probes `http://10.8.0.2:8001/health`, receives HTTP 200, and restores status to **PASSING**.
  2. The payment endpoint on AWS immediately begins succeeding again without restarting or modifying User Service!

### Test Scenario 4: Dynamic Network Address Re-registration
- **Action:** Modify the listening port of Payment Service on GCP (e.g. from `8001` to `8090`).
- **Proof:** Re-register with port `8090` in Consul. User Service automatically discovers port `8090` on the very next request, proving zero hardcoded ports or IPs!

---

## 🧹 Step 9: Cloud Resource Teardown (Avoid Cloud Billing)
Once your demonstration or faculty examination is complete, delete the cloud resources:
1. **AWS EC2:**
   - In AWS Console $\rightarrow$ EC2 $\rightarrow$ Instances $\rightarrow$ Select `crosscloud-aws-user-service` $\rightarrow$ **Instance State $\rightarrow$ Terminate**.
   - Delete Key Pair and Security Group.
2. **GCP Compute Engine:**
   - In GCP Console $\rightarrow$ Compute Engine $\rightarrow$ VM Instances $\rightarrow$ Select `crosscloud-gcp-payment-service` $\rightarrow$ **Delete**.
   - In VPC Network $\rightarrow$ Firewall $\rightarrow$ Delete `allow-wireguard-crosscloud`.
EOF

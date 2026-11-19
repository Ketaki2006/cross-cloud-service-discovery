# Cross-Cloud Service Discovery Registry
## Comprehensive Project Documentation & College Viva Demonstration Guide

---

## 1. Project Overview & Problem Statement

### The Industry Problem
In modern enterprise cloud computing, organizations increasingly adopt **multi-cloud strategies** to:
- Prevent vendor lock-in (e.g., relying solely on AWS or Microsoft Azure).
- Leverage best-of-breed specialized services (e.g., AWS compute with Azure enterprise services).
- Implement multi-region, multi-cloud disaster recovery and compliance.

However, cross-cloud microservices introduce **three critical operational challenges**:
1. **Dynamic Ephemeral IPs**: Microservices scale up, restart, or migrate across cloud providers. If microservices use hardcoded IP addresses or DNS entries, any IP change breaks the entire system.
2. **Security & Network Exposure**: Internal microservices (such as payment processing engines or user databases) cannot be exposed on the public internet. Opening internal ports on public IPs creates severe attack vectors.
3. **Health Monitoring & Cascading Failures**: If a remote service in Azure crashes or experiences an outage, services on AWS must not hang indefinitely or send requests into a black hole. The system must automatically detect outages and stop routing traffic to dead nodes (**fail-fast discovery**).

### Our Solution
We engineered a production-grade, secure, and resilient **Cross-Cloud Service Discovery Registry** connecting **AWS EC2** in `us-east-1` (North Virginia, USA) and **Microsoft Azure VM** in `central-india` (Pune, India).

The system seamlessly combines:
- **WireGuard VPN Mesh**: Establishes an encrypted peer-to-peer virtual private network (`10.8.0.1 ↔ 10.8.0.2` over UDP 51820) across cloud boundaries. Internal services (Consul:8500, Payment:8001, User:8002) communicate strictly over this private mesh.
- **HashiCorp Consul**: Serves as the distributed service discovery catalog and active health probe engine.
- **Zero-Hardcoding Dynamic Routing**: Microservices query Consul dynamically using `?passing=true` to find healthy instances on-the-fly.
- **Dual-Cloud SQLite Persistence**: Persistent SQLite databases on both clouds (`users.db` on AWS and `payments.db` on Azure) ensure balances and transaction ledgers survive server reboots.
- **Fault Injection & Self-Healing**: Live failure simulation demonstrates immediate detection by Consul and graceful degradation.

---

## 2. System Architecture

```mermaid
flowchart TD
    subgraph Internet ["🌐 Public Internet / Client Tier"]
        Browser["👤 Student / Examiner Browser<br/>http://3.25.173.195:3000"]
    end

    subgraph AWS ["☁️ AWS EC2 (us-east-1) • Public IP: 3.25.173.195"]
        Gateway["⚡ Express Gateway & React 18 SPA<br/>Port 3000 (Public)"]
        Consul["🔍 HashiCorp Consul Server<br/>Port 8500 (Private Loopback/VPN)"]
        UserService["👤 AWS User Service<br/>Port 8002 (Private 10.8.0.1)"]
        AWS_DB[("🗄️ SQLite: users.db<br/>• users table (Ketaki, Alex, Bot)<br/>• transactions audit log")]
        WG_AWS["🛡️ WireGuard Endpoint<br/>IP: 10.8.0.1/24 (UDP 51820)"]
    end

    subgraph Azure ["☁️ Microsoft Azure VM (Central India) • Public IP: 20.197.56.115"]
        WG_AZURE["🛡️ WireGuard Endpoint<br/>IP: 10.8.0.2/24 (UDP 51820)"]
        PaymentService["💳 Azure Payment Service<br/>Port 8001 (Private 10.8.0.2)"]
        Azure_DB[("🗄️ SQLite: payments.db<br/>• processed_payments ledger")]
    end

    Browser -->|HTTP 3000| Gateway
    Gateway -->|Consul Telemetry & Status| Consul
    Gateway -->|User Proxy & Pay Requests| UserService
    UserService -->|Read / Write Balances & Txns| AWS_DB
    UserService -->|1. Dynamic Discovery Query<br/>GET /v1/health/service/payment-service?passing=true| Consul
    Consul -.->|2. Returns healthy instance<br/>10.8.0.2:8001| UserService
    UserService -->|3. Route payment over WireGuard| WG_AWS
    WG_AWS <===>|🔐 ChaCha20-Poly1305 Encrypted Tunnel<br/>UDP 51820 (Cross-Cloud)| WG_AZURE
    WG_AZURE -->|Forward internal request| PaymentService
    PaymentService -->|Record in persistent ledger| Azure_DB
    PaymentService -->|Return transaction receipt| WG_AZURE
    Consul -.->|Active 10s Health Probe<br/>GET http://10.8.0.2:8001/health| WG_AWS
```

---

## 3. Core Component Breakdown

| Component | Cloud Host | Network Binding | Technology | Role |
| :--- | :--- | :--- | :--- | :--- |
| **API Gateway & Dashboard** | AWS EC2 (`3.25.173.195`) | `0.0.0.0:3000` | Node.js, Express, React 18, Vite, Tailwind | Serves the web dashboard and proxies client requests securely to internal services. |
| **HashiCorp Consul** | AWS EC2 (`3.25.173.195`) | `127.0.0.1:8500` & `10.8.0.1:8500` | HashiCorp Consul v1.15.4 | Service registry, catalog persistence, and active HTTP health checker (probes every 10s). |
| **User Service** | AWS EC2 (`3.25.173.195`) | `10.8.0.1:8002` & `127.0.0.1:8002` | Node.js, Express, SQLite 3 (`users.db`) | Manages user accounts, enforces balances, queries Consul for Payment Service, triggers cross-cloud payments. |
| **Payment Service** | Azure VM (`20.197.56.115`) | `10.8.0.2:8001` & `127.0.0.1:8001` | Node.js, Express, SQLite 3 (`payments.db`) | Simulates payment settlement, records transactions in SQLite ledger, supports fault injection (`/simulate/unhealthy`). |
| **WireGuard Mesh** | Both Clouds | `10.8.0.1/24` (AWS)<br/>`10.8.0.2/24` (Azure) | Linux Kernel WireGuard (UDP 51820) | Encrypted peer-to-peer cross-cloud overlay tunnel using ChaCha20-Poly1305 encryption. |

---

## 4. Step-by-Step Live Demonstration Script for Examiners

When presenting to professors or examiners, follow this structured 5-step walkthrough:

### Step 1: Show the Live Infrastructure Dashboard (1 minute)
1. Open the browser and navigate to: **`http://3.25.173.195:3000`**.
2. **What to say**:
   > *"Good morning professors. This is our live multi-cloud deployment. It is running live on an AWS EC2 instance in us-east-1 and an Azure VM in Central India. As you can see from the top status bar, our deployment mode is 'REMOTE', our Consul Leader is elected, and our WireGuard VPN tunnel is verified active with a live cryptographic handshake occurring every few seconds."*
3. **Point out on screen**:
   - **AWS User Service Card**: Shows `Online`, port `8002`, region `us-east-1`.
   - **Azure Payment Service Card**: Shows `Healthy`, port `8001`, region `central-india`, `Discoverable`.
   - **WireGuard VPN Mesh Card**: Shows `CONNECTED` (`10.8.0.1 ↔ 10.8.0.2`) with live handshake age (e.g., `25s ago`).
   - **Architecture Diagram**: Shows the interactive path connecting AWS and Azure over UDP 51820.

---

### Step 2: Demonstrate Dynamic Service Discovery (1 minute)
1. Click on the **Service Discovery** tab in the sidebar (or navigate to `http://3.25.173.195:3000/discovery`).
2. **What to say**:
   > *"In traditional systems, AWS would have Azure's public IP hardcoded. If Azure's IP changes, the app crashes. In our system, the AWS User Service never hardcodes Azure's IP. Let's see how discovery works: AWS queries Consul using `GET /v1/health/service/payment-service?passing=true`. Consul returns the healthy WireGuard IP `10.8.0.2:8001` dynamically."*
3. **Point out on screen**:
   - The query simulator showing `GET /v1/health/service/payment-service?passing=true`.
   - The discovered JSON response containing `Address: 10.8.0.2`, `Port: 8001`, and `Status: PASSING`.

---

### Step 3: Execute a Live Cross-Cloud Payment & Persistent Balance Deduction (1.5 minutes)
1. Return to the **Overview** dashboard.
2. Scroll to the **Cross-Cloud Payment Simulator** section.
3. Show the **User ID** dropdown:
   - Notice user `usr_101 — Ketaki ($1,415.00)` (or current balance).
4. Enter an amount: e.g., **$15.00**, description: **"Viva Live Demonstration"**.
5. Click **Pay**.
6. **What happens in real time**:
   - The button shows `Routing Payment...` with animated pulse line through the tunnel.
   - Within ~300ms, a green success box appears:
     - **Transaction ID**: e.g., `txn_1795068449319_...`
     - **Route**: `AWS (us-east-1) → AZURE (Central India)`
     - **Latency**: ~310 ms (real cross-continental round-trip from USA to India over WireGuard).
     - **User Balance**: Drops immediately from `$1,415.00` to `$1,400.00`!
7. **What to say**:
   > *"When I clicked Pay, AWS User Service dynamically queried Consul, found Azure Payment Service on the WireGuard VPN at `10.8.0.2:8001`, forwarded the transaction over an encrypted tunnel spanning 13,000 km between Virginia and Pune, settled the payment, recorded it into Azure's SQLite database, and deducted Ketaki's balance in AWS's SQLite database. The measured latency is 310ms, which is the genuine physical network latency across continents."*

---

### Step 4: Prove Database Persistence Across Restarts (1.5 minutes)
1. Open a new tab and show the database inspection API:
   - **AWS Database Status**: `http://3.25.173.195:3000/api/database/status`
   - Shows the `users` table with updated balances and `transactions` audit count.
   - **Azure Payment Ledger**: `http://3.25.173.195:3000/api/payments/history`
   - Shows the persistent ledger in `payments.db` with all processed transactions.
2. **What to say**:
   > *"Examiners often ask: 'Are balances kept in memory or in a real database?' We have connected SQLite databases to both microservices. To prove this is persistent and not in-memory, if we restart the AWS User Service service daemon right now, Ketaki's balance does not reset to $1,450.00—it remains at $1,400.00 because it is permanently stored in `users.db` on disk."*

---

### Step 5: Demonstrate Fault Tolerance & Self-Healing (Virtual Lab Scenario) (2 minutes)
1. In the sidebar, navigate to **Health Monitoring** (`http://3.25.173.195:3000/health-monitoring`).
2. Point out the **Virtual Lab Fault Injection** card.
3. Click **"Inject Outage (Simulate 503 Critical)"**.
4. **What happens**:
   - The simulated state changes to `unhealthy`.
   - Within 10 seconds (Consul's check interval), Consul probes `http://10.8.0.2:8001/health`, receives HTTP 503, and flags the service as **CRITICAL**.
   - The Azure Payment Service card turns red with a badge: **EXCLUDED FROM DISCOVERY**.
5. Switch to **Overview** and attempt a payment:
   - Click **Pay** → The payment fails gracefully with:
     `Service discovery failed: no passing health check instances of 'payment-service' registered in Consul.`
   - Notice that the user's balance is **not** deducted.
6. **What to say**:
   > *"This demonstrates automatic self-healing and fail-fast resilience. Because the Azure microservice failed its health check, Consul automatically stripped it from the `?passing=true` discovery pool. The AWS microservice avoids hanging or sending payments into a broken service."*
7. Return to **Health Monitoring** and click **"Restore Service (Simulate 200 OK)"**.
8. Within 10 seconds, Consul detects the recovery, marks the check as **PASSING**, and restores the service.
9. Try payment again → **Success!**

---

## 5. Top 15 Viva Questions & Bulletproof Answers

### Q1: What is Service Discovery and why is it needed?
> **Answer**: In a microservice architecture, service instances frequently start, stop, or change IP addresses due to autoscaling, updates, or failovers. Service discovery provides a dynamic registry (like an automated phonebook) where services publish their location and health status. Other services query this registry rather than hardcoding static IPs.

### Q2: Why did you use HashiCorp Consul instead of DNS or Kubernetes?
> **Answer**: Consul is purpose-built for multi-cloud and hybrid environments. Unlike simple DNS which suffers from client-side caching and slow TTL updates, Consul provides real-time HTTP-based health checking, key-value configuration, and service cataloging with instantaneous status updates. Unlike Kubernetes Service Discovery, Consul runs across heterogeneous clouds (AWS + Azure) without requiring a shared Kubernetes cluster.

### Q3: Why did you use WireGuard instead of connecting over the public internet?
> **Answer**: 
> 1. **Security**: Internal microservice ports (Consul:8500, Payment:8001, User:8002) should never be exposed to the public internet. WireGuard encrypts all traffic using modern cryptography (ChaCha20-Poly1305 and Curve25519) on private IPs (`10.8.0.x`).
> 2. **Network Topology**: WireGuard creates a single flat subnet (`10.8.0.0/24`) spanning both AWS VPC and Azure VNet, allowing microservices to communicate as if they were in the same local data center.

### Q4: How does AWS User Service discover Azure Payment Service?
> **Answer**: When a request arrives at `POST /api/users/:id/pay`, User Service executes an HTTP GET request to Consul at `http://127.0.0.1:8500/v1/health/service/payment-service?passing=true`. Consul queries its catalog and returns only instances whose health check is currently `passing`. User Service extracts the IP (`10.8.0.2`) and port (`8001`) from the JSON response and forwards the request over the WireGuard tunnel.

### Q5: What is the `?passing=true` parameter in Consul?
> **Answer**: By default, `/v1/health/service/:name` returns all registered instances, including those that are degraded or failing. Adding `?passing=true` instructs Consul to filter the list and return only healthy nodes. This prevents the caller from sending traffic to failing instances.

### Q6: What happens if Azure Payment Service crashes or becomes unhealthy?
> **Answer**: Consul probes `http://10.8.0.2:8001/health` every 10 seconds. If the probe fails, Consul marks the check as `critical`. In the next discovery query, Consul returns an empty array. The User Service immediately catches this and returns HTTP 503 (`REGISTRY_UNAVAILABLE` or `NO_HEALTHY_SERVICE_INSTANCES`) without debiting the user or hanging.

### Q7: Where is the data stored? Is it persistent?
> **Answer**: Yes. We use dual SQLite databases:
> - On AWS EC2: `/home/ubuntu/cross-cloud-service-discovery/users.db` stores user profiles and balances in the `users` table, and all transaction logs in the `transactions` table.
> - On Azure VM: `/home/azureuser/cross-cloud-service-discovery/payments.db` stores all settled transactions in the `processed_payments` table.
> Both databases persist to the cloud VMs' disks (AWS gp3 EBS and Azure Managed Disk) and survive service restarts and reboots.

### Q8: What database schema did you design?
> **Answer**:
> - AWS `users` table: `id (TEXT PRIMARY KEY)`, `name (TEXT)`, `email (TEXT)`, `tier (TEXT)`, `balance (REAL)`.
> - AWS `transactions` table: `id (TEXT PRIMARY KEY)`, `user_id (TEXT)`, `amount (REAL)`, `currency (TEXT)`, `source_cloud (TEXT)`, `target_cloud (TEXT)`, `target_address (TEXT)`, `latency_ms (INTEGER)`, `status (TEXT)`, `timestamp (TEXT)`.
> - Azure `processed_payments` table: `transaction_id (TEXT PRIMARY KEY)`, `user_id (TEXT)`, `amount (REAL)`, `status (TEXT)`, `cloud (TEXT)`, `processed_at (TEXT)`.

### Q9: What security measures did you configure on AWS and Azure?
> **Answer**:
> 1. **Security Groups / NSGs**: Only port 22 (SSH), port 3000 (React Gateway), and UDP 51820 (WireGuard) are open to the internet. Ports 8001, 8002, and 8500 are blocked from the public internet and accessible only via loopback and WireGuard `10.8.0.x`.
> 2. **Cryptographic Keypairs**: WireGuard uses private/public Curve25519 keypairs. Only nodes possessing the authorized public key can initiate VPN handshakes.
> 3. **Input Validation**: Positive amount validation, existence checks on user IDs, and sanitized parameters on all endpoints.

### Q10: Why is the latency ~310ms between AWS and Azure?
> **Answer**: This is physical geographic round-trip latency. The AWS EC2 instance is in North Virginia, USA (`us-east-1`), while the Azure VM is in Pune, India (`central-india`). The optical fiber distance is over 13,000 kilometers each way. A 310ms round-trip latency confirms that the request is genuinely traversing the globe and not being mocked on localhost.

### Q11: How do services register with Consul?
> **Answer**: Consul supports two registration mechanisms:
> 1. **Configuration files (Persistent)**: JSON files located in `/etc/consul.d/` (e.g. `payment-service.json` and `user-service.json`). Consul automatically registers these services on boot and runs health checks.
> 2. **Consul HTTP API (Dynamic)**: Services can register programmatically by sending a `PUT /v1/agent/service/register` payload containing service name, address, port, and health check definition.

### Q12: How are the services managed on the Linux VMs?
> **Answer**: All background microservices are managed by Linux `systemd` unit files:
> - AWS: `user-service.service`, `crosscloud-gateway.service`, `consul.service`, `wg-quick@wg0.service`.
> - Azure: `payment-service.service`, `wg-quick@wg0.service`.
> This ensures automatic recovery on process crashes and auto-start on VM reboot.

### Q13: What is the purpose of the API Gateway?
> **Answer**: The Express API Gateway acts as a reverse proxy and single entry point on port 3000. It serves the compiled React 18 SPA static assets and proxies client API calls (`/api/users`, `/api/services`, `/api/dashboard/overview`) to internal services, hiding internal infrastructure details from the browser.

### Q14: How does the React frontend discover the backend API?
> **Answer**: The frontend uses dynamic origin resolution (`window.location.origin`). When the dashboard is accessed via `http://3.25.173.195:3000`, all API requests automatically target `3.25.173.195:3000` without requiring hardcoded URLs or environment rebuilds.

### Q15: What would be the next steps to scale this in production?
> **Answer**:
> 1. Deploy a multi-node Consul cluster (3 or 5 servers) across cloud regions using Raft consensus for high availability.
> 2. Implement mutual TLS (mTLS) with Consul Service Mesh (Consul Connect) for zero-trust service-to-service authorization.
> 3. Replace single SQLite files with distributed cloud databases (such as AWS Aurora / DynamoDB and Azure Cosmos DB) with cross-region replication.
> 4. Add an automated circuit breaker (like Netflix Hystrix or Envoy Proxy) to handle transient timeouts.

---

## 6. Quick Cheat Sheet (Keep this open during viva)

| Item | Value |
| :--- | :--- |
| **Public Dashboard URL** | `http://3.25.173.195:3000` |
| **AWS Public IP** | `3.25.173.195` (Region: `us-east-1`, Virginia) |
| **Azure Public IP** | `20.197.56.115` (Region: `central-india`, Pune) |
| **AWS WireGuard IP** | `10.8.0.1` |
| **Azure WireGuard IP** | `10.8.0.2` |
| **Consul UI / API** | `http://127.0.0.1:8500` (AWS) |
| **AWS User Service Port** | `8002` (Database: `users.db`) |
| **Azure Payment Service Port** | `8001` (Database: `payments.db`) |
| **Gateway & Frontend Port** | `3000` |
| **Inspect AWS SQLite DB** | `http://3.25.173.195:3000/api/database/status` |
| **Inspect Azure SQLite DB** | `http://3.25.173.195:3000/api/payments/history` |

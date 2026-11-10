# Chapter 6: HashiCorp Consul Deep Dive

## 6.1 What is HashiCorp Consul?
HashiCorp Consul is a distributed, highly available, datacenter-aware service mesh and discovery system. It combines:
1. **Service Discovery:** Automatic mapping of service names to network locations.
2. **Health Checking:** Active monitoring of service health and automated routing triage.
3. **Key-Value Store:** Distributed hierarchical key-value storage for dynamic configuration.
4. **Service Segmentation (Consul Connect):** Secure service-to-service communication via Mutual TLS (mTLS).

---

## 6.2 Consul Architecture & Operational Modes

### Development Mode (`-dev`)
In our project, Consul runs via:
```powershell
.\consul.exe agent -dev
```
- Runs as a solo server agent.
- Completely in-memory (no disk persistence across restarts).
- Automatically bootstraps itself as the Raft consensus leader.
- Perfect for local development, academic experimentation, and automated integration tests.

### Production Mode
In a production deployment:
- A quorum of 3 or 5 dedicated Consul Server agents maintain the Raft consensus log.
- Lightweight Consul Client agents run on every host or VM, proxying requests and running local probes.

---

## 6.3 Network Ports Used by Consul

| Port | Protocol | Name | Description |
| :--- | :--- | :--- | :--- |
| **8500** | HTTP / TCP | HTTP API & UI | Used by our Express Gateway and browser web console |
| **8600** | DNS (UDP/TCP)| DNS Interface | Allows standard DNS queries (e.g. `payment-service.service.consul`) |
| **8300** | TCP | Server RPC | Raft consensus replication between servers |
| **8301** | UDP/TCP | Serf LAN | Gossip protocol between agents within the same local datacenter |
| **8302** | UDP/TCP | Serf WAN | Cross-datacenter gossip across multi-cloud WAN networks |

---

## 6.4 Active Health Probing Mechanics
Consul actively executes health checks:
1. **HTTP Check:** Consul makes an HTTP GET request to `http://127.0.0.1:8001/health` every 10 seconds.
   - Status 2xx: Check is **PASSING**.
   - Status 429: Check is **WARNING**.
   - Any other status (including 503 or connection refused): Check is **CRITICAL**.
2. **Serf Gossip Check (`serfHealth`):** Verifies that the agent node is alive and responding to network heartbeats.

---

## 6.5 Multi-Cloud Federation via WAN Gossip
In an enterprise multi-cloud architecture:
- AWS instances run in datacenter `dc-aws`.
- GCP instances run in datacenter `dc-gcp`.
- Azure instances run in datacenter `dc-azure`.
Consul servers in each cloud join the global WAN gossip pool over port 8302, allowing seamless cross-cloud discovery queries (e.g., `payment-service.service.dc-aws.consul`).

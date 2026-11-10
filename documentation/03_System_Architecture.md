# Chapter 3: System Architecture & Design

## 3.1 High-Level Multi-Cloud System Architecture

```mermaid
flowchart TD
    subgraph Client_Tier ["Client & Operations Tier"]
        Browser["React 18 + TS Web Console (:3000)"]
        Consumer["Microservice Client / API Consumer"]
    end

    subgraph Gateway_Tier ["API Gateway Tier (Node.js & Express 5 :3000)"]
        ExpressRouter["Express Router & Route Handlers"]
        InputValidator["Payload Validator & Conflict Detector"]
        StaticHost["SPA Static Asset Host (/frontend/dist)"]
        ConsulProxy["Consul REST Proxy Client (Axios)"]
    end

    subgraph Registry_Tier ["Service Mesh & Registry Tier (Consul :8500)"]
        ConsulAgent["HashiCorp Consul Agent"]
        Catalog["Service Catalog & Key-Value Store"]
        RaftLeader["Raft Consensus Leader (:8300)"]
        ProbeRunner["Active Health Check Probe Runner"]
    end

    subgraph Service_Tier ["Multi-Cloud Microservices Tier"]
        AWS_Node["Payment Service (AWS us-east-1) (:8001)"]
        GCP_Node["Auth Service (GCP asia-south1) (:8080) [Simulated]"]
        Azure_Node["Order Service (Azure westeurope) (:5000) [Simulated]"]
    end

    Browser -->|HTTP REST / Navigation| StaticHost
    Browser -->|API Requests /api/*| ExpressRouter
    Consumer -->|GET /api/services/:name| ExpressRouter

    ExpressRouter --> InputValidator
    InputValidator --> ConsulProxy
    ConsulProxy -->|PUT /v1/agent/service/register| ConsulAgent
    ConsulProxy -->|GET /v1/health/service/:name| ConsulAgent

    ConsulAgent --> Catalog
    ConsulAgent --> RaftLeader
    ProbeRunner -->|Active Probe GET /health (10s)| AWS_Node
    ProbeRunner -.->|Future Probe| GCP_Node
    ProbeRunner -.->|Future Probe| Azure_Node
```

---

## 3.2 Current Implementation vs. Future Production Multi-Cloud Architecture

### Current Local Simulation Architecture
- All microservice endpoints run on the host loopback adapter (`127.0.0.1`).
- Multi-cloud providers (`AWS`, `GCP`, `Azure`, `Local`) are identified via **Consul Metadata Tags**.
- HashiCorp Consul runs as a single-node development agent (`-dev`).

### Future Production Multi-Cloud Architecture
- **Multi-Datacenter WAN Federation:** Independent Consul datacenters deployed in AWS VPC (`us-east-1`), GCP VPC (`asia-south1`), and Azure VNet (`westeurope`).
- **Consul WAN Gossip (Serf WAN):** Datacenters federated over encrypted WireGuard VPN tunnels on port 8302.
- **Mesh Gateways:** Cross-cloud traffic routed securely through Consul Mesh Gateways with Mutual TLS (mTLS) and SPIFFE x.509 certificates.

---

## 3.3 Core Subsystems & Responsibilities

| Subsystem | File / Component | Primary Responsibilities |
| :--- | :--- | :--- |
| **Frontend SPA** | `frontend/src/App.tsx` | Client-side routing, user interaction, reactive state, visual feedback |
| **API Gateway** | `server.js` | Payload sanitization, port validation, duplicate ID rejection, Consul proxying |
| **Service Registry** | `consul.exe` | Distributed service catalog, Raft consensus election, active background health checks |
| **Simulated Microservice**| `payment-service.js` | Real HTTP server simulating business logic and dynamic health transitions |
| **Orchestrator** | `start-all.js` | Unified lifecycle management for Gateway and Microservices |

const fs = require('fs');
const path = require('path');

const docDir = path.join(__dirname, '..', 'documentation');
if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });

// 3. 03_System_Architecture.md
const doc03 = `# Chapter 3: System Architecture & Design

## 3.1 High-Level Multi-Cloud System Architecture

\`\`\`mermaid
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
\`\`\`

---

## 3.2 Current Implementation vs. Future Production Multi-Cloud Architecture

### Current Local Simulation Architecture
- All microservice endpoints run on the host loopback adapter (\`127.0.0.1\`).
- Multi-cloud providers (\`AWS\`, \`GCP\`, \`Azure\`, \`Local\`) are identified via **Consul Metadata Tags**.
- HashiCorp Consul runs as a single-node development agent (\`-dev\`).

### Future Production Multi-Cloud Architecture
- **Multi-Datacenter WAN Federation:** Independent Consul datacenters deployed in AWS VPC (\`us-east-1\`), GCP VPC (\`asia-south1\`), and Azure VNet (\`westeurope\`).
- **Consul WAN Gossip (Serf WAN):** Datacenters federated over encrypted WireGuard VPN tunnels on port 8302.
- **Mesh Gateways:** Cross-cloud traffic routed securely through Consul Mesh Gateways with Mutual TLS (mTLS) and SPIFFE x.509 certificates.

---

## 3.3 Core Subsystems & Responsibilities

| Subsystem | File / Component | Primary Responsibilities |
| :--- | :--- | :--- |
| **Frontend SPA** | \`frontend/src/App.tsx\` | Client-side routing, user interaction, reactive state, visual feedback |
| **API Gateway** | \`server.js\` | Payload sanitization, port validation, duplicate ID rejection, Consul proxying |
| **Service Registry** | \`consul.exe\` | Distributed service catalog, Raft consensus election, active background health checks |
| **Simulated Microservice**| \`payment-service.js\` | Real HTTP server simulating business logic and dynamic health transitions |
| **Orchestrator** | \`start-all.js\` | Unified lifecycle management for Gateway and Microservices |
`;

// 4. 04_Development_From_Scratch.md
const doc04 = `# Chapter 4: Project Development Journey — From Scratch

This chapter reconstructs the chronological, step-by-step development of this project from an empty folder to a production-ready application.

---

## Stage 1: Requirement Analysis & Planning
- **Objective:** Define the core problem (multi-cloud service discovery, dynamic IP addressing) and architecture.
- **Key Decisions:** Use HashiCorp Consul for service discovery; use Node.js/Express for API gateway; use React/TypeScript for front-end management.

## Stage 2: System Architecture Design
- **Objective:** Establish port allocations and network boundaries:
  - Port \`8500\`: Consul REST API & Web UI.
  - Port \`8300\`: Consul Raft consensus RPC.
  - Port \`3000\`: Express API Gateway & React SPA host.
  - Port \`8001\`: Payment Microservice.

## Stage 3: Directory Structure Initialization
- **Commands Executed:**
  \`\`\`bash
  mkdir cross-cloud-service-discovery
  cd cross-cloud-service-discovery
  git init
  npm init -y
  \`\`\`

## Stage 4: Installing Backend Dependencies
- **Command:**
  \`\`\`bash
  npm install express@5 axios cors
  \`\`\`
- **Rationale:** Express 5 provides asynchronous error handling and modern routing; Axios handles HTTP calls to Consul; CORS enables multi-origin requests.

## Stage 5: Configuring HashiCorp Consul
- **Implementation:** Download the official pre-compiled standalone binary (\`consul.exe\` v1.15.4) into the root folder.
- **Testing:**
  \`\`\`powershell
  .\\consul.exe agent -dev
  \`\`\`
  Verify connectivity via \`http://localhost:8500/v1/status/leader\`.

## Stage 6: Building the Express API Gateway (\`server.js\`)
- **Implementation:**
  - Create Express application.
  - Implement health checks, CORS, JSON parsing.
  - Establish \`CONSUL_URL = "http://localhost:8500"\`.

## Stage 7: Implementing Service Registration API (\`POST /api/services/register\`)
- **Implementation:**
  - Validate input parameters (\`name\`, \`id\`, \`address\`, \`port\`, \`checkPath\`).
  - Check for duplicate IDs via \`GET /v1/agent/services\`, returning \`409 Conflict\` on collision.
  - Submit registration payload to Consul's \`PUT /v1/agent/service/register\`.

## Stage 8: Implementing Service Discovery API (\`GET /api/services/:name\`)
- **Implementation:**
  - Forward queries to Consul's \`/v1/health/service/:name\`.
  - Support \`?passing=true\` filter to eliminate failing nodes.

## Stage 9: Implementing Health Monitoring API (\`GET /api/health\`)
- **Implementation:**
  - Query \`GET /v1/agent/checks\` to collect all active probes.
  - Classify checks into \`passing\`, \`warning\`, and \`critical\`.

## Stage 10: Building the Payment Microservice (\`payment-service.js\`)
- **Implementation:**
  - Run independent Express instance on port 8001.
  - Expose \`GET /health\` returning \`200 OK\` when healthy and \`503\` when unhealthy.
  - Implement fault-injection triggers (\`POST /simulate/unhealthy\` and \`POST /simulate/healthy\`).

## Stage 11: Unified Orchestration (\`start-all.js\`)
- **Implementation:**
  - Require both \`payment-service.js\` and \`server.js\`.
  - Start both listeners in a single Node process with clean signal handling (\`SIGINT\`, \`SIGTERM\`).

## Stage 12: Building the React + TypeScript Frontend
- **Commands:**
  \`\`\`bash
  npm create vite@latest frontend -- --template react-ts
  cd frontend
  npm install tailwindcss postcss autoprefixer react-router-dom lucide-react
  npx tailwindcss init -p
  \`\`\`
- **Implementation:** Build types in \`src/types/index.ts\`, API client in \`src/services/api.ts\`, layout components, and pages.

## Stage 13: Connecting Frontend with Express Backend
- **Implementation:**
  - Configure Vite proxy during development.
  - Build production static bundle: \`npm run build\` -> \`frontend/dist\`.
  - Configure \`server.js\` to serve \`frontend/dist\` with SPA fallback routing.

## Stage 14: Automated Testing Suite (\`test/backend.test.js\`)
- **Implementation:** 18 integration tests covering input validation, duplicate prevention, Consul discovery, and fault injection.
- **Execution:** \`npm test\` passing all 18 tests.

## Stage 15: Production Execution & Verification
- **Execution:** Start Consul and \`start-all.js\` in daemon mode with host port binding. Access UI at \`http://localhost:3000\`.
`;

// 5. 05_Codebase_Explanation.md
const doc05 = `# Chapter 5: Complete Codebase Deep Dive

This chapter provides a file-by-file, section-by-section walkthrough of the source code.

---

## 5.1 Backend: \`server.js\`

### Section 1: Imports and Global Constants
\`\`\`javascript
const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;
const CONSUL_URL = process.env.CONSUL_URL || "http://localhost:8500";
const AXIOS_TIMEOUT = 3000;
\`\`\`
- **Explanation:** Loads Express, CORS, Path, and Axios. Configures default port 3000 and target Consul URL on port 8500.

### Section 2: Middleware & Static File Hosting
\`\`\`javascript
app.use(cors());
app.use(express.json());

const frontendDist = path.join(__dirname, "frontend", "dist");
app.use(express.static(frontendDist));
\`\`\`
- **Explanation:** Enables cross-origin requests, parses incoming JSON bodies, and serves pre-built React static files from \`frontend/dist\`.

### Section 3: Consul Connection Probe (\`GET /api/consul/status\`)
\`\`\`javascript
app.get("/api/consul/status", async (req, res) => {
    try {
        const leaderRes = await axios.get(\`\${CONSUL_URL}/v1/status/leader\`, { timeout: 2000 });
        const leader = leaderRes.data;
        res.json({
            status: "success",
            connected: true,
            consulUrl: CONSUL_URL,
            leader: leader || "No leader elected (solo agent)",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            status: "error",
            connected: false,
            consulUrl: CONSUL_URL,
            message: "Unable to connect to Consul daemon.",
            error: error.message
        });
    }
});
\`\`\`
- **Explanation:** Pings Consul's Raft leader status endpoint. If unreachable, returns \`connected: false\` gracefully without crashing the server.

### Section 4: Service Registration & Duplicate Prevention (\`POST /api/services/register\`)
\`\`\`javascript
app.post("/api/services/register", async (req, res) => {
    // 1. Validate required fields (name, id, address, port, checkPath)
    // 2. Query Consul for existing services:
    const existingRes = await axios.get(\`\${CONSUL_URL}/v1/agent/services\`, { timeout: AXIOS_TIMEOUT });
    if (existingRes.data && existingRes.data[id.trim()]) {
        return res.status(409).json({
            status: "error",
            message: \`Service instance with ID "\${id}" already exists. Use a unique ID.\`
        });
    }
    // 3. Submit payload to Consul PUT /v1/agent/service/register
    await axios.put(\`\${CONSUL_URL}/v1/agent/service/register\`, consulPayload, { timeout: AXIOS_TIMEOUT });
    res.status(200).json({ status: "success", message: "Registered with Consul successfully!" });
});
\`\`\`
- **Explanation:** Enforces strict validation and prevents duplicate ID collisions.

### Section 5: SPA Client-Side Fallback Middleware
\`\`\`javascript
app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
        return res.sendFile(path.join(frontendDist, "index.html"));
    }
    next();
});
\`\`\`
- **Explanation:** Express 5-compatible fallback that serves \`index.html\` for frontend client routes (like \`/service-registry\`) while preserving \`/api\` routes.

---

## 5.2 Microservice: \`payment-service.js\`
- Implements simulated AWS payment microservice on port 8001.
- Global variable \`let isHealthy = true;\` controls health state.
- \`GET /health\` returns \`200 OK\` when healthy and \`503 Critical\` when fault is injected via \`POST /simulate/unhealthy\`.

---

## 5.3 Unified Orchestrator: \`start-all.js\`
- Concurrently imports and boots both \`payment-service.js\` and \`server.js\`.
- Listens for \`SIGINT\` and \`SIGTERM\` signals to cleanly close HTTP listeners.

---

## 5.4 Frontend Code Architecture
- \`src/types/index.ts\`: Formal interfaces for \`ServiceRecord\`, \`HealthResponse\`, and payloads.
- \`src/services/api.ts\`: Centralized HTTP client methods using native \`fetch\`.
- \`src/components/Header.tsx\`: Real-time Consul connectivity badge.
- \`src/components/Sidebar.tsx\`: NavLink routing menu.
- \`src/components/RegisterServiceModal.tsx\`: Registration modal with field validation.
- \`src/components/Toast.tsx\`: Floating notification banner context.
- \`src/pages/Dashboard.tsx\`: KPI cards, cloud distribution counters, and live service table.
- \`src/pages/ServiceRegistry.tsx\`: Filterable catalog table with deregistration action.
- \`src/pages/ServiceDiscovery.tsx\`: Discovery query tool with multi-language code snippets.
- \`src/pages/HealthMonitoring.tsx\`: Real-time probe logs and status counts.
- \`src/pages/Settings.tsx\`: Cluster configuration and latency test tool.
`;

// 6. 06_Consul_Deep_Dive.md
const doc06 = `# Chapter 6: HashiCorp Consul Deep Dive

## 6.1 What is HashiCorp Consul?
HashiCorp Consul is a distributed, highly available, datacenter-aware service mesh and discovery system. It combines:
1. **Service Discovery:** Automatic mapping of service names to network locations.
2. **Health Checking:** Active monitoring of service health and automated routing triage.
3. **Key-Value Store:** Distributed hierarchical key-value storage for dynamic configuration.
4. **Service Segmentation (Consul Connect):** Secure service-to-service communication via Mutual TLS (mTLS).

---

## 6.2 Consul Architecture & Operational Modes

### Development Mode (\`-dev\`)
In our project, Consul runs via:
\`\`\`powershell
.\\consul.exe agent -dev
\`\`\`
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
| **8600** | DNS (UDP/TCP)| DNS Interface | Allows standard DNS queries (e.g. \`payment-service.service.consul\`) |
| **8300** | TCP | Server RPC | Raft consensus replication between servers |
| **8301** | UDP/TCP | Serf LAN | Gossip protocol between agents within the same local datacenter |
| **8302** | UDP/TCP | Serf WAN | Cross-datacenter gossip across multi-cloud WAN networks |

---

## 6.4 Active Health Probing Mechanics
Consul actively executes health checks:
1. **HTTP Check:** Consul makes an HTTP GET request to \`http://127.0.0.1:8001/health\` every 10 seconds.
   - Status 2xx: Check is **PASSING**.
   - Status 429: Check is **WARNING**.
   - Any other status (including 503 or connection refused): Check is **CRITICAL**.
2. **Serf Gossip Check (\`serfHealth\`):** Verifies that the agent node is alive and responding to network heartbeats.

---

## 6.5 Multi-Cloud Federation via WAN Gossip
In an enterprise multi-cloud architecture:
- AWS instances run in datacenter \`dc-aws\`.
- GCP instances run in datacenter \`dc-gcp\`.
- Azure instances run in datacenter \`dc-azure\`.
Consul servers in each cloud join the global WAN gossip pool over port 8302, allowing seamless cross-cloud discovery queries (e.g., \`payment-service.service.dc-aws.consul\`).
`;

// 7. 07_API_Documentation.md
const doc07 = `# Chapter 7: API Documentation & Contract Specifications

This chapter details every API endpoint implemented in \`server.js\`.

---

## 7.1 Endpoint Catalog

### 1. \`GET /api\`
- **Purpose:** API gateway metadata and available endpoints directory.
- **Response (200 OK):**
\`\`\`json
{
  "name": "Cross-Cloud Service Discovery Registry API",
  "version": "1.0.0",
  "status": "running",
  "port": 3000,
  "consulUrl": "http://localhost:8500",
  "supportedClouds": ["AWS", "GCP", "Azure", "Local"]
}
\`\`\`

### 2. \`GET /api/consul/status\`
- **Purpose:** Checks connectivity to Consul daemon and returns Raft leader.
- **Response (200 OK):**
\`\`\`json
{
  "status": "success",
  "connected": true,
  "consulUrl": "http://localhost:8500",
  "leader": "127.0.0.1:8300",
  "timestamp": "2026-11-10T07:15:00.000Z"
}
\`\`\`

### 3. \`GET /api/services\`
- **Purpose:** Retrieves all services currently registered in Consul.
- **Response (200 OK):**
\`\`\`json
{
  "status": "success",
  "count": 1,
  "services": {
    "payment-service-aws-1": {
      "ID": "payment-service-aws-1",
      "Service": "payment-service",
      "Tags": ["AWS", "us-east-1", "production"],
      "Port": 8001,
      "Address": "127.0.0.1"
    }
  }
}
\`\`\`

### 4. \`POST /api/services/register\`
- **Purpose:** Registers a microservice with Consul and configures active HTTP health probe.
- **Request Body:**
\`\`\`json
{
  "name": "payment-service",
  "id": "payment-service-aws-1",
  "provider": "AWS",
  "address": "127.0.0.1",
  "port": 8001,
  "checkPath": "/health",
  "interval": "10s",
  "timeout": "3s",
  "tags": ["AWS", "us-east-1", "production"]
}
\`\`\`
- **Responses:**
  - \`200 OK\`: Registered successfully.
  - \`400 Bad Request\`: Missing field or invalid port.
  - \`409 Conflict\`: Instance ID already exists.

### 5. \`DELETE /api/services/:id\`
- **Purpose:** Deregisters a microservice instance by ID.
- **Response (200 OK):**
\`\`\`json
{
  "status": "success",
  "message": "Service \\"payment-service-aws-1\\" deregistered from Consul."
}
\`\`\`

### 6. \`GET /api/services/:name\`
- **Purpose:** Discovers service instances matching name. Supports \`?passing=true\`.
- **Response (200 OK):**
\`\`\`json
{
  "status": "success",
  "serviceName": "payment-service",
  "totalInstances": 1,
  "passingInstances": 1,
  "instances": [
    {
      "id": "payment-service-aws-1",
      "name": "payment-service",
      "address": "127.0.0.1",
      "port": 8001,
      "status": "passing",
      "tags": ["AWS", "us-east-1", "production"]
    }
  ]
}
\`\`\`

### 7. \`GET /api/health\`
- **Purpose:** Aggregates all registered health checks.
- **Response (200 OK):**
\`\`\`json
{
  "status": "success",
  "totalChecks": 2,
  "summary": { "passing": 2, "warning": 0, "critical": 0 }
}
\`\`\`

### 8. \`POST /api/scenarios/inject-fault\`
- **Purpose:** Injects fault into payment service (causing \`/health\` to return 503).
- **Response (200 OK):**
\`\`\`json
{
  "status": "success",
  "faultInjected": true,
  "message": "Simulated fault injected into payment service."
}
\`\`\`

### 9. \`POST /api/scenarios/restore-health\`
- **Purpose:** Restores payment service health (causing \`/health\` to return 200).
- **Response (200 OK):**
\`\`\`json
{
  "status": "success",
  "restored": true,
  "message": "Payment service restored to healthy state."
}
\`\`\`

### 10. Direct Microservice Health: \`GET :8001/health\`
- Returns \`200 OK\` with uptime and simulated database checks when healthy; returns \`503\` when fault is injected.
`;

fs.writeFileSync(path.join(docDir, '03_System_Architecture.md'), doc03, 'utf8');
console.log('Saved 03_System_Architecture.md');
fs.writeFileSync(path.join(docDir, '04_Development_From_Scratch.md'), doc04, 'utf8');
console.log('Saved 04_Development_From_Scratch.md');
fs.writeFileSync(path.join(docDir, '05_Codebase_Explanation.md'), doc05, 'utf8');
console.log('Saved 05_Codebase_Explanation.md');
fs.writeFileSync(path.join(docDir, '06_Consul_Deep_Dive.md'), doc06, 'utf8');
console.log('Saved 06_Consul_Deep_Dive.md');
fs.writeFileSync(path.join(docDir, '07_API_Documentation.md'), doc07, 'utf8');
console.log('Saved 07_API_Documentation.md');


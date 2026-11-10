const fs = require('fs');
const path = require('path');

const docDir = path.join(__dirname, '..', 'documentation');
if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });

// 8. 08_Execution_Flow.md
const doc08 = `# Chapter 8: Complete Request & Execution Flow

This chapter explains what happens internally step by step when users interact with the system.

---

## 8.1 Service Registration Execution Flow

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User as DevOps Engineer
    participant Modal as React Register Modal
    participant API as frontend/src/services/api.ts
    participant Gateway as Express Gateway (:3000)
    participant Consul as HashiCorp Consul (:8500)
    participant Service as Payment Service (:8001)

    User->>Modal: Enter details (Name, Port 8001, AWS, /health)
    Modal->>API: registerService(payload)
    API->>Gateway: POST /api/services/register (JSON)
    Gateway->>Gateway: Validate required fields and port (1-65535)
    Gateway->>Consul: GET /v1/agent/services
    alt Instance ID already registered
        Gateway-->>API: 409 Conflict ("Service ID exists")
        API-->>Modal: Show error toast
    else Instance ID is unique
        Gateway->>Consul: PUT /v1/agent/service/register
        Consul-->>Gateway: 200 OK
        Gateway-->>API: 200 OK ("Registered successfully")
        API-->>Modal: Trigger success toast & refresh table
        Consul->>Service: GET /health (Initial Active Probe)
        Service-->>Consul: 200 OK {"status": "healthy"}
        Consul->>Consul: Mark check status = PASSING
    end
\`\`\`

---

## 8.2 Service Discovery Execution Flow

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant Client as Calling Service / UI
    participant Gateway as Express Gateway (:3000)
    participant Consul as HashiCorp Consul (:8500)

    Client->>Gateway: GET /api/services/payment-service?passing=true
    Gateway->>Consul: GET /v1/health/service/payment-service?passing=1
    Consul-->>Gateway: Array of healthy instances with checks
    Gateway->>Gateway: Map and normalize response (IP, Port, Tags)
    Gateway-->>Client: Filtered list of healthy endpoints
    Client->>Client: Call selected instance (127.0.0.1:8001)
\`\`\`

---

## 8.3 Active Health Monitoring & Failure Triage Flow

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant Probe as Consul Health Runner
    participant Service as Payment Service (:8001)
    participant Gateway as Express Gateway
    participant UI as React Health Dashboard

    loop Every 10 Seconds
        Probe->>Service: GET /health (timeout 3s)
        alt Service is Normal
            Service-->>Probe: 200 OK
            Probe->>Probe: State = PASSING
        else Service Injected with Fault
            Service-->>Probe: 503 Critical
            Probe->>Probe: State = CRITICAL (Excluded from discovery)
        end
    end

    UI->>Gateway: GET /api/health
    Gateway->>Consul: GET /v1/agent/checks
    Consul-->>Gateway: Raw probe list
    Gateway->>Gateway: Classify (Passing, Warning, Critical)
    Gateway-->>UI: Aggregated health summary JSON
    UI->>UI: Update health gauge and status badges
\`\`\`
`;

// 9. 09_Testing_and_Debugging.md
const doc09 = `# Chapter 9: Testing, Validation & Debugging Guide

## 9.1 Independent Component Verification

### 1. Test Consul Daemon
\`\`\`powershell
Invoke-RestMethod http://localhost:8500/v1/status/leader
# Expected: "127.0.0.1:8300"
\`\`\`

### 2. Test Payment Microservice
\`\`\`powershell
Invoke-RestMethod http://127.0.0.1:8001/health
# Expected: status = "healthy", cloud = "AWS"
\`\`\`

### 3. Test Express Gateway Overview
\`\`\`powershell
Invoke-RestMethod http://localhost:3000/api
# Expected: status = "running", port = 3000
\`\`\`

---

## 9.2 Running Automated Backend Test Suite
\`\`\`bash
npm test
\`\`\`

### Output Summary:
- **18 Total Tests** across 6 Test Suites:
  - Task 1: Express Backend Core API (7 tests)
  - Task 2: Simulated Payment Service (2 tests)
  - Task 3: Consul Catalog and Discovery Integration (5 tests)
  - Task 4: Duplicate Service Prevention (1 test)
  - Virtual Lab Module: Experimental Scenarios (3 tests)
- **Result:** 18 Passed, 0 Failed (100% Pass Rate).

---

## 9.3 Troubleshooting Matrix

| Problem | Root Cause | Solution |
| :--- | :--- | :--- |
| **ERR_CONNECTION_REFUSED on :8500** | Consul agent is not running. | Run \`.\\consul.exe agent -dev\` in a terminal. |
| **EADDRINUSE: address already in use :::3000** | Stale node process running. | Terminate old processes: \`Stop-Process -Name "node" -Force\`. |
| **PathError: Missing parameter name \*** | Express 5 wildcard syntax error. | Use custom middleware checking \`!req.path.startsWith("/api")\`. |
| **Consul Reports Health Check: Connection Refused**| Microservice is offline. | Ensure \`payment-service.js\` is listening on port 8001. |
| **409 Conflict** | Service ID already exists. | Provide unique ID or deregister old instance via \`DELETE\`. |
`;

// 10. 10_Viva_Questions.md
const doc10 = `# Chapter 10: Viva Voce & Technical Defense Preparation (60+ Questions)

This chapter contains 65 categorized technical viva questions with both quick revision summaries and detailed technical answers.

---

## Category 1: Basic Distributed Systems & Cloud Concepts (Q1 - Q10)

### Q1: What is Cloud Computing?
- **Quick Answer:** On-demand delivery of IT computing resources over the internet with pay-as-you-go pricing.
- **Detailed Answer:** Cloud computing eliminates on-premises hardware procurement by abstracting physical servers, storage, and networking into elastic, virtualized services provided by vendors like AWS, Azure, and GCP.

### Q2: What is Multi-Cloud Architecture?
- **Quick Answer:** Deploying services across two or more distinct public cloud providers.
- **Detailed Answer:** Multi-cloud architectures mitigate vendor lock-in, enable competitive cost optimization, comply with data sovereignty regulations, and guarantee high availability through cross-cloud disaster recovery.

### Q3: What is the difference between Monolith and Microservices?
- **Quick Answer:** Monolith is a single unified deployable codebase; microservices are distributed independent services communicating over the network.
- **Detailed Answer:** Monoliths scale as a single unit and have single points of failure. Microservices enable modular scaling, polyglot technology adoption, and localized failure containment, but introduce distributed networking complexities like service discovery.

### Q4: Why is hardcoding IP addresses bad in microservices?
- **Quick Answer:** Cloud instances have ephemeral, volatile IP addresses that change on restart or auto-scaling.
- **Detailed Answer:** Auto-scaling groups and container orchestrators dynamically spin instances up and down. Hardcoded IPs break immediately during deployments or node crashes, resulting in service outages.

### Q5: What is Service Discovery?
- **Quick Answer:** The automatic detection and mapping of logical service names to dynamic network locations (IP + port).
- **Detailed Answer:** It is the mechanism by which microservice instances discover their peers at runtime by querying a central registry rather than relying on static configuration.

### Q6: What is a Service Registry?
- **Quick Answer:** The central database tracking all active service instances, addresses, and health states.
- **Detailed Answer:** A service registry is a distributed key-value store optimized for high read availability, storing instance metadata, IP addresses, ports, and real-time health probe statuses.

### Q7: What is Dynamic Service Discovery?
- **Quick Answer:** Automated real-time discovery where instances register on boot and deregister on shutdown or failure.
- **Detailed Answer:** Unlike static DNS, dynamic discovery integrates live health checks. If a node fails, it is automatically pruned from routing tables within seconds.

### Q8: What are Client-Side and Server-Side Service Discovery?
- **Quick Answer:** In client-side, the caller queries the registry and picks an instance; in server-side, a load balancer handles the lookup transparently.
- **Detailed Answer:** In client-side discovery (used in our project), the client queries Consul for healthy nodes and routes requests directly. In server-side discovery, traffic hits a load balancer (like AWS ALB), which queries the registry internally.

### Q9: What is a Health Check?
- **Quick Answer:** A periodic test verifying whether a service instance is operational.
- **Detailed Answer:** Active probes (HTTP GET, TCP ping) sent at scheduled intervals. If an instance responds with non-2xx status or times out, it is marked unhealthy.

### Q10: What is Cascading Failure?
- **Quick Answer:** When the failure of one service overwhelms and causes failures in dependent upstream services.
- **Detailed Answer:** Without active health checking, callers repeatedly send traffic to failing nodes, exhausting connection pools and causing timeouts that propagate across the entire architecture.

---

## Category 2: HashiCorp Consul Deep Dive (Q11 - Q25)

### Q11: What is HashiCorp Consul?
- **Quick Answer:** A distributed service mesh and service discovery platform with built-in health checking.
- **Detailed Answer:** Consul is an open-source tool developed by HashiCorp that provides dynamic service discovery, health monitoring, a distributed KV store, and secure service mesh (Consul Connect).

### Q12: Is Consul open source?
- **Quick Answer:** Yes, Consul is open source (Mozilla Public License v2.0 / BSL).
- **Detailed Answer:** Consul has an open-source community edition and an enterprise edition with advanced features like multi-tenant administrative partitions.

### Q13: Can Consul run locally on Windows?
- **Quick Answer:** Yes, using the standalone \`consul.exe\` binary.
- **Detailed Answer:** Consul compiles to a single static Go binary with zero external dependencies, making it capable of running on Windows, Linux, and macOS.

### Q14: What is Consul Development Mode (\`-dev\`)?
- **Quick Answer:** An in-memory, solo-server mode designed for rapid development and testing.
- **Detailed Answer:** \`consul.exe agent -dev\` starts a single-node server that stores catalog data in RAM, disables disk persistence, and automatically elects itself as the Raft leader.

### Q15: What is Raft Consensus in Consul?
- **Quick Answer:** The algorithm Consul servers use to agree on the state of the service catalog.
- **Detailed Answer:** Raft is a consensus protocol that ensures all Consul server nodes maintain an identical, ordered log of transactions. It requires a quorum (e.g., 2 out of 3, or 3 out of 5 servers) to elect a leader.

### Q16: What is the Serf Gossip Protocol in Consul?
- **Quick Answer:** The decentralized membership protocol used for failure detection.
- **Detailed Answer:** Consul uses Serf (based on the SWIM gossip protocol). Agents periodically send lightweight UDP packets to random peers to quickly detect node crashes across the cluster.

### Q17: What is the difference between Serf LAN and Serf WAN?
- **Quick Answer:** Serf LAN operates within a single datacenter; Serf WAN connects multiple datacenters over the internet.
- **Detailed Answer:** Serf LAN runs on port 8301 with low latency. Serf WAN runs on port 8302 across physical clouds (AWS, GCP, Azure), enabling cross-cloud service discovery.

### Q18: What is Port 8500 in Consul?
- **Quick Answer:** The HTTP REST API and Consul Web UI port.
- **Detailed Answer:** It is the primary HTTP endpoint that our Express gateway and web browser connect to for service registration, discovery queries, and cluster telemetry.

### Q19: What is Port 8600 in Consul?
- **Quick Answer:** The built-in DNS interface port.
- **Detailed Answer:** Consul includes a native DNS server on port 8600, allowing legacy applications to discover services via DNS lookups (e.g., \`dig payment-service.service.consul\`).

### Q20: What is Port 8300 in Consul?
- **Quick Answer:** The Raft RPC port used for server-to-server replication.
- **Detailed Answer:** Consul servers communicate over port 8300 to synchronize catalog state and handle client RPC forwards.

### Q21: What happens if Consul goes down?
- **Quick Answer:** New registrations and dynamic discovery queries fail; existing established connections continue.
- **Detailed Answer:** If Consul crashes, client services that cache endpoints can continue routing until IPs change. In production, Consul is deployed as a 3-node or 5-node cluster so if one server fails, the remaining quorum elects a new leader with zero downtime.

### Q22: What happens when a registered service becomes unhealthy?
- **Quick Answer:** Consul marks its health check as \`critical\` and excludes it from discovery queries with \`?passing=true\`.
- **Detailed Answer:** When \`/health\` returns HTTP 503, Consul transitions the check to \`critical\`. The gateway excludes it from discovery, ensuring clients only receive healthy endpoints.

### Q23: How does Consul execute health checks?
- **Quick Answer:** The Consul agent independently makes HTTP GET requests to the registered health check URL at designated intervals.
- **Detailed Answer:** Our registration payload specifies an HTTP check with an \`Interval\` (10s) and \`Timeout\` (3s). The local Consul daemon runs a timer and probes the endpoint directly.

### Q24: What is the difference between Catalog API and Agent API in Consul?
- **Quick Answer:** Agent API manages local instance state on a node; Catalog API aggregates cluster-wide data.
- **Detailed Answer:** \`/v1/agent/service/register\` registers a service with the local agent and sets up health checks. \`/v1/catalog/services\` queries the compiled cluster catalog across all datacenters.

### Q25: How does Consul support multi-cloud discovery?
- **Quick Answer:** Through WAN Federation and datacenter metadata tagging.
- **Detailed Answer:** Consul can federate datacenters across AWS, Azure, and GCP using Serf WAN gossip. Alternatively, as demonstrated in our project, metadata tags identify the provider region for dynamic routing.

---

## Category 3: Backend & Gateway Implementation (Q26 - Q40)

### Q26: Why do we need an Express Backend if Consul already has an API?
- **Quick Answer:** For security, payload validation, duplicate prevention, and decoupling the frontend from Consul's internal ports.
- **Detailed Answer:** Exposing Consul directly to web browsers creates security vulnerabilities (anyone could deregister core services). The Express Gateway enforces input validation (ports 1-65535, required fields), prevents duplicate ID collisions (HTTP 409), hosts the React SPA, and acts as a secure Reverse Proxy.

### Q27: What is the role of Node.js in this project?
- **Quick Answer:** The runtime environment executing our Express API Gateway and simulated microservice.
- **Detailed Answer:** Node.js provides a single-threaded, non-blocking asynchronous event loop that handles high concurrent I/O throughput with minimal memory footprint.

### Q28: What is the role of Express.js?
- **Quick Answer:** The web application framework structuring our API routes and middleware.
- **Detailed Answer:** Express manages HTTP request parsing, JSON body parsing, CORS policies, static file serving from \`frontend/dist\`, and client-side SPA fallback routing.

### Q29: What is the role of Axios?
- **Quick Answer:** The HTTP client used by Express to communicate with Consul.
- **Detailed Answer:** Axios provides a clean Promise-based API with automated JSON serialization and timeout management (\`AXIOS_TIMEOUT = 3000ms\`).

### Q30: How does the backend prevent duplicate service registrations?
- **Quick Answer:** By querying Consul's \`/v1/agent/services\` before submitting the registration and returning HTTP 409 if the ID already exists.
- **Detailed Answer:** In \`server.js\`, before issuing \`PUT /v1/agent/service/register\`, the handler inspects existing service IDs. If a match is found, it returns \`409 Conflict\` to prevent accidental overwrites.

### Q31: How does the backend validate port numbers?
- **Quick Answer:** It checks that the port is an integer between 1 and 65535.
- **Detailed Answer:** \`Number(port)\` is checked with \`!isNaN()\`, \`Number.isInteger()\`, and bounds \`port >= 1 && port <= 65535\`. Invalid values return HTTP 400 Bad Request.

### Q32: What is \`start-all.js\`?
- **Quick Answer:** A startup script that runs both the Payment microservice and the Gateway in a single Node process.
- **Detailed Answer:** It requires \`./payment-service\` and \`./server\`, starts listeners on ports 8001 and 3000, and captures OS termination signals (\`SIGINT\`, \`SIGTERM\`) for graceful shutdown.

### Q33: How does \`payment-service.js\` simulate cloud behavior?
- **Quick Answer:** By running an independent HTTP server that returns simulated AWS metadata and supports programmatic failure injection.
- **Detailed Answer:** It runs on port 8001, tagging its responses with \`cloud: "AWS"\` and exposing \`/simulate/unhealthy\` to trigger simulated 503 database timeouts.

### Q34: What is Fault Injection?
- **Quick Answer:** Intentionally introducing failures into a system to test its resilience.
- **Detailed Answer:** In our project, calling \`POST /api/scenarios/inject-fault\` makes \`payment-service\` return HTTP 503, allowing us to demonstrate that Consul detects the failure and isolates the node.

### Q35: How does the backend handle SPA routing with Express 5?
- **Quick Answer:** Using middleware that intercepts non-API GET requests and serves \`index.html\`.
- **Detailed Answer:** Express 5 prohibits unparenthesized wildcard routes (\`app.get("*")\`). We implemented:
  \`\`\`javascript
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(frontendDist, "index.html"));
    }
    next();
  });
  \`\`\`

### Q36: What is CORS and why is it needed?
- **Quick Answer:** Cross-Origin Resource Sharing—a browser security mechanism.
- **Detailed Answer:** During development, if Vite runs on port 5173 and Express on port 3000, CORS middleware allows the browser to make cross-origin HTTP calls.

### Q37: What is the purpose of \`GET /api/health\`?
- **Quick Answer:** To provide aggregated health metrics for the dashboard.
- **Detailed Answer:** It queries Consul's \`/v1/agent/checks\`, iterates through all registered probes, and tallies the total counts of \`passing\`, \`warning\`, and \`critical\` checks.

### Q38: What HTTP status codes does the API return?
- \`200 OK\`: Request succeeded.
- \`400 Bad Request\`: Missing required fields or invalid input.
- \`404 Not Found\`: Route or service does not exist.
- \`409 Conflict\`: Duplicate service ID.
- \`500 Internal Server Error\`: Upstream Consul error.
- \`503 Service Unavailable\`: Unhealthy microservice state.

### Q39: What is the timeout setting for Consul requests in Express?
- **Quick Answer:** 3000 milliseconds (3 seconds).
- **Detailed Answer:** Defined as \`AXIOS_TIMEOUT = 3000\`, preventing the API gateway from hanging indefinitely if Consul is unresponsive.

### Q40: What happens if \`payment-service\` crashes completely?
- **Quick Answer:** Consul's HTTP probe fails with \`connection refused\`, and the check is marked \`critical\`.
- **Detailed Answer:** Consul records the TCP connection failure, changes the status from \`passing\` to \`critical\`, and excludes the node from discovery queries.

---

## Category 4: Frontend & React Architecture (Q41 - Q52)

### Q41: Why was the frontend converted to React + TypeScript?
- **Quick Answer:** For reusability, single-page seamless routing, maintainability, and static type safety.
- **Detailed Answer:** The original HTML/JS implementation had duplicated navigation code across 5 files. React allows modular component composition, and TypeScript prevents runtime type errors.

### Q42: What is React Router DOM?
- **Quick Answer:** The library handling client-side navigation without page reloads.
- **Detailed Answer:** It intercepts link clicks, updates browser history, and renders matching component routes (\`/\`, \`/service-registry\`, \`/service-discovery\`, etc.) instantly.

### Q43: How does the Header know if Consul is connected?
- **Quick Answer:** By polling \`GET /api/consul/status\` on mount and interval.
- **Detailed Answer:** \`Header.tsx\` executes \`getConsulStatus()\` and updates a reactive state variable (\`isConnected\`), rendering a green pill with the leader IP or a red offline badge.

### Q44: What is the purpose of \`src/types/index.ts\`?
- **Quick Answer:** To define strict TypeScript interface contracts.
- **Detailed Answer:** It exports interfaces such as \`ServiceRecord\`, \`HealthResponse\`, and \`RegisterServicePayload\`, ensuring compile-time type safety across the entire application.

### Q45: How does the Dashboard calculate Cloud Distribution?
- **Quick Answer:** By iterating over service tags and counting occurrences of AWS, GCP, Azure, and Local.
- **Detailed Answer:** \`Dashboard.tsx\` inspects the \`Tags\` array of each registered instance, finds matching cloud labels, and computes percentage bars for the distribution widget.

### Q46: What is Vite and why did we choose it over Create React App (CRA)?
- **Quick Answer:** A modern frontend build tool powered by esbuild and Rollup.
- **Detailed Answer:** CRA is deprecated and slow. Vite uses native ES modules during development for instant HMR and bundles optimized production chunks in seconds.

### Q47: What is Tailwind CSS?
- **Quick Answer:** A utility-first CSS framework.
- **Detailed Answer:** Tailwind applies styles directly in JSX via utility classes (e.g., \`bg-surface\`, \`text-primary-blue\`), eliminating CSS file bloat and maintaining design consistency.

### Q48: How are Toast notifications managed in the React app?
- **Quick Answer:** Through a React Context Provider (\`ToastContext\`).
- **Detailed Answer:** \`Toast.tsx\` exposes a \`useToast()\` hook that allows any component to trigger animated success, error, or info notifications that automatically dismiss after 4 seconds.

### Q49: What does the Service Discovery page do?
- **Quick Answer:** Allows operators to query services by name and generates client code snippets.
- **Detailed Answer:** Users enter a service name, toggle "Healthy Only", and receive live instances. The bottom tab dynamically generates ready-to-copy code in cURL, Fetch, Python, and DNS SRV syntax.

### Q50: How does the Health Monitoring page auto-refresh?
- **Quick Answer:** Using a \`setInterval\` timer configured by a dropdown.
- **Detailed Answer:** A reactive state timer triggers \`fetchHealthData()\` every 5s, 10s, or 30s, updating the health gauge without manual page refreshes.

### Q51: How does the UI indicate service health?
- **Quick Answer:** Color-coded status badges: Emerald Green for Passing, Amber for Warning, Crimson Red for Critical.

### Q52: Are there any legacy lab simulator modules in the final React UI?
- **Quick Answer:** No, all 4 experimental lab simulator modules (\`lab-*.html\`) were permanently removed during migration.

---

## Category 5: Real-World Multi-Cloud & Viva Defense (Q53 - Q65)

### Q53: Are we actually deploying on physical AWS, Azure, and GCP accounts in this demo?
- **Quick Answer:** No, we simulate multi-cloud deployments locally using metadata tags on loopback addresses.
- **Detailed Answer:** For academic and demonstration purposes, running live instances in three cloud accounts incurs continuous cloud hosting costs. We simulate the exact metadata tags, ports, and health payloads that real cloud instances provide.

### Q54: What would be required to deploy this in REAL AWS, GCP, and Azure?
- **Quick Answer:** Deploying Consul agents in each cloud VPC, setting up VPN/DirectConnect tunnels, and joining them via WAN Gossip (port 8302).
- **Detailed Answer:**
  1. Provision an AWS EC2 instance, GCP Compute VM, and Azure VM.
  2. Install Consul on each node with WAN federation enabled.
  3. Secure inter-cloud traffic with WireGuard or IPSec VPN.
  4. Deploy Consul Mesh Gateways for encrypted mTLS traffic.

### Q55: How is Service Discovery different from an API Gateway?
- **Quick Answer:** Service Discovery finds *where* a service is; an API Gateway acts as the *entry point* that routes, authenticates, and load-balances client traffic.
- **Detailed Answer:** An API Gateway routes external client traffic to internal microservices. The API Gateway itself uses Service Discovery to find the dynamic IP addresses of those internal microservices.

### Q56: Why not just use DNS instead of Consul?
- **Quick Answer:** DNS has caching delays (TTL) and slow propagation; Consul updates routing tables within milliseconds.
- **Detailed Answer:** When an IP changes in standard DNS, client-side and recursive DNS caches retain the stale IP until the TTL expires, causing downtime. Consul health checks immediately exclude dead nodes.

### Q57: What is Consul Connect / Service Mesh?
- **Quick Answer:** A security feature that provides encrypted Mutual TLS (mTLS) communication between microservices.
- **Detailed Answer:** Consul Connect injects sidecar proxies (like Envoy) beside microservices, automatically handling mutual TLS encryption and identity-based authorization without changing application code.

### Q58: What is SPIFFE in Consul?
- **Quick Answer:** An open standard providing cryptographic identities to microservices.
- **Detailed Answer:** Secure Production Identity Framework for Everyone (SPIFFE) formats certificates (e.g., \`spiffe://dc1/ns/default/sa/payment\`) to verify service identities across clouds.

### Q59: Can Consul handle load balancing?
- **Quick Answer:** Yes, through client-side round-robin, randomized selection, or Envoy sidecar proxies.
- **Detailed Answer:** When a service discovery query returns multiple healthy instances, the client or gateway can apply round-robin or least-connection algorithms to distribute traffic.

### Q60: How does the automated test suite work?
- **Quick Answer:** It executes 18 integration tests against live endpoints using Node's native test runner (\`node:test\`).
- **Detailed Answer:** Running \`npm test\` sends real HTTP requests to \`http://localhost:3000\` and \`http://127.0.0.1:8001\`, asserting status codes, payload structures, conflict detection, and fault injection.

### Q61: What was the hardest bug you encountered and how did you fix it?
- **Quick Answer:** Express 5 route wildcard changes and JSX template string interpolation errors.
- **Detailed Answer:** Express 5 threw a \`PathError\` on \`app.get("*")\` due to \`path-to-regexp\` changes, which we resolved by implementing custom fallback middleware. In React, JSX template literals in code snippet blocks were fixed by wrapping them in raw string literals.

### Q62: Why did Consul show ERR_CONNECTION_REFUSED earlier?
- **Quick Answer:** Because Consul was initially started inside an isolated Windows sandbox environment that prevented host browsers from binding to local ports.
- **Detailed Answer:** Windows sandboxing isolates local network adapters. Running Consul as a background daemon with host port binding resolved the issue.

### Q63: What are the main limitations of this project?
- **Quick Answer:** Single-node Consul dev agent, simulated cloud providers on localhost, and lack of mTLS encryption.
- **Detailed Answer:** While the architecture accurately demonstrates service discovery principles, a production enterprise system would require multi-server Raft quorums, physical VPC networks, and Envoy proxies.

### Q64: What is the future scope of this project?
- **Quick Answer:** Envoy sidecar integration, Mutual TLS (mTLS), Kubernetes operator deployment, and physical WAN federation.

### Q65: Summarize your project in 30 seconds for the external examiner.
- **Exam Summary:** "Our project is a Cross-Cloud Service Discovery Registry that solves the challenge of dynamic IP volatility in multi-cloud microservices. We utilize HashiCorp Consul as an active distributed catalog, an Express 5 API Gateway for validation and proxying, and a React + TypeScript SPA for real-time observability. Our system actively health-checks instances every 10 seconds, automatically isolating failing nodes from discovery queries to guarantee zero-downtime routing across AWS, GCP, Azure, and on-premises environments."
`;

// 11. 11_Project_Cookbook.md
const doc11 = `# Chapter 11: Project Cookbook Reference

This chapter serves as a companion reference to the complete **Cross-Cloud Service Discovery Registry Project Cookbook**.

The complete cookbook is available in the \`docs/\` directory:
- **PDF Document:** \`docs/Cross_Cloud_Service_Discovery_Cookbook.pdf\`
- **Markdown Source:** \`docs/COOKBOOK.md\`
- **HTML Document:** \`docs/COOKBOOK.html\`

---

## Quick Reference: 3-Step Cold Start
1. **Start Consul Agent:** \`.\\consul.exe agent -dev\`
2. **Start Gateway & Services:** \`node start-all.js\`
3. **Open Browser:** Navigate to \`http://localhost:3000\`
`;

// 12. README.md (in documentation/)
const doc12 = `# Cross-Cloud Service Discovery Registry — Documentation Suite

Welcome to the comprehensive technical documentation and learning guide for the **Cross-Cloud Service Discovery Registry**.

This documentation suite is organized into 11 detailed chapters and reference sheets:

| File | Title | Description |
| :--- | :--- | :--- |
| **\`01_Project_Overview.md\`** | Project Overview | Problem statement, objectives, scope, 24 foundational concepts |
| **\`02_Technology_Stack.md\`** | Technology Stack | Detailed technology choices, roles, and alternative evaluations |
| **\`03_System_Architecture.md\`** | System Architecture | Mermaid architecture diagrams and multi-cloud design |
| **\`04_Development_From_Scratch.md\`** | Development From Scratch | Chronological 15-stage implementation reconstruction |
| **\`05_Codebase_Explanation.md\`** | Codebase Deep Dive | Line-by-line breakdown of \`server.js\`, \`payment-service.js\`, frontend |
| **\`06_Consul_Deep_Dive.md\`** | HashiCorp Consul Deep Dive | Internals of dev mode, Raft consensus, ports, and health checks |
| **\`07_API_Documentation.md\`** | API Documentation | Complete endpoint specifications, request/response JSON schemas |
| **\`08_Execution_Flow.md\`** | Request & Execution Flows | Step-by-step trace of registration, discovery, and health triage |
| **\`09_Testing_and_Debugging.md\`**| Testing & Debugging | Command guides, test runner output, troubleshooting matrix |
| **\`10_Viva_Questions.md\`** | Viva Voce Preparation | 65 categorized technical viva questions with detailed answers |
| **\`11_Project_Cookbook.md\`** | Project Cookbook Reference | Summary reference to the 17-page PDF cookbook |
| **\`Command_Reference.md\`** | Command Reference Sheet | Quick cheat sheet of all build, run, and test terminal commands |
| **\`Architecture_Summary.md\`** | Architecture Summary | Single-page high-level architectural executive summary |
| **\`Viva_Cheat_Sheet.md\`** | Viva Revision Sheet | Last-minute quick revision card for college examination |
`;

// 13. Command_Reference.md
const doc13 = `# Project Command Reference Sheet

Quick-reference cheat sheet for all terminal commands used in the project.

---

## 1. Environment & Setup Commands
\`\`\`bash
# Install backend dependencies (in root)
npm install

# Install frontend dependencies (in frontend/)
cd frontend
npm install

# Build frontend production bundle
npm run build
cd ..
\`\`\`

---

## 2. Running Services
\`\`\`powershell
# 1. Start HashiCorp Consul dev agent
.\\consul.exe agent -dev

# 2. Start Gateway and Payment Microservice concurrently
node start-all.js

# 3. Start Backend Gateway independently
node server.js

# 4. Start Payment Microservice independently
node payment-service.js
\`\`\`

---

## 3. Testing & Verification Commands
\`\`\`powershell
# Run 18 automated integration tests
npm test

# Verify Consul Leader
Invoke-RestMethod http://localhost:8500/v1/status/leader

# Verify Payment Microservice Health
Invoke-RestMethod http://127.0.0.1:8001/health

# Verify Gateway Catalog
Invoke-RestMethod http://localhost:3000/api/services

# Verify Aggregated Health Probes
Invoke-RestMethod http://localhost:3000/api/health
\`\`\`

---

## 4. Service Registration via PowerShell
\`\`\`powershell
$body = @{
    name = "payment-service"
    id = "payment-service-aws-1"
    provider = "AWS"
    address = "127.0.0.1"
    port = 8001
    checkPath = "/health"
    interval = "10s"
    timeout = "3s"
    tags = @("AWS", "us-east-1", "production", "v1.0.0")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/services/register" -Method POST -Body $body -ContentType "application/json"
\`\`\`

---

## 5. Fault Injection & Self-Healing Testing
\`\`\`powershell
# Inject fault into payment service (simulate 503 failure)
Invoke-RestMethod -Uri "http://localhost:3000/api/scenarios/inject-fault" -Method POST

# Restore payment service to healthy state (200 OK)
Invoke-RestMethod -Uri "http://localhost:3000/api/scenarios/restore-health" -Method POST
\`\`\`
`;

// 14. Architecture_Summary.md
const doc14 = `# One-Page Architecture Summary

## System Architecture at a Glance

\`\`\`
[ React 18 + TypeScript SPA ] (Port 3000)
             |
             | HTTP REST / SPA Navigation
             v
[ Node.js & Express 5 API Gateway ] (Port 3000)
    - Static Asset Host (/frontend/dist)
    - Input Validation (Port bounds 1-65535, required fields)
    - Duplicate ID Collision Prevention (HTTP 409 Conflict)
    - REST Proxy to Consul Internal APIs
             |
             +---------------------------------------+
             |                                       |
             v                                       v
[ HashiCorp Consul v1.15.4 ] (Port 8500)   [ Payment Microservice ] (Port 8001)
    - Raft Consensus Leader (:8300)            - AWS Simulated Node
    - Distributed Service Catalog              - Route: GET /health
    - Active HTTP Prober (Every 10s) --------> - Route: POST /simulate/unhealthy
    - Native Consul Console (/ui/)             - Route: POST /simulate/healthy
\`\`\`

---

## Key Metrics & Network Ports
- **Frontend & Gateway:** \`http://localhost:3000\`
- **Consul Native UI:** \`http://localhost:8500/ui/\`
- **Consul Raft Leader:** \`127.0.0.1:8300\`
- **Payment Microservice:** \`http://127.0.0.1:8001/health\`
- **Automated Tests:** 18 Tests Passed (100% Pass Rate in ~950ms)
- **Health Check Frequency:** Probed every 10 seconds with 3-second timeout
`;

// 15. Viva_Cheat_Sheet.md
const doc15 = `# Quick Viva Revision Cheat Sheet

Keep this cheat sheet handy for last-minute revision before your project viva!

---

## 🎯 10 Key Facts You Must Remember
1. **Core Problem Solved:** Dynamic IP volatility and multi-cloud fragmentation (AWS vs. GCP vs. Azure).
2. **Registry Engine:** HashiCorp Consul v1.15.4 running in dev mode (\`-dev\`).
3. **Consul Raft Leader Address:** \`127.0.0.1:8300\`.
4. **Consul HTTP API & UI Port:** \`8500\`.
5. **Gateway & Frontend Port:** \`3000\` (Express serves pre-compiled \`frontend/dist\`).
6. **Payment Microservice Port:** \`8001\` (simulated AWS instance).
7. **Health Probing Mechanism:** Active HTTP GET to \`/health\` every 10 seconds.
8. **Automated Triage:** When a service returns 503, Consul marks it \`critical\`, and discovery queries with \`?passing=true\` automatically exclude it.
9. **Duplicate Prevention:** Express queries Consul before registration; duplicate IDs return \`HTTP 409 Conflict\`.
10. **Test Suite:** 18 automated integration tests using Node's native \`node:test\` runner.

---

## ⚡ 5 Common Tricky Questions & Quick Answers

- **"Are you actually paying for AWS, Azure, and GCP?"**
  - *Answer:* No, for college demonstration purposes, we run microservices on local loopback addresses tagged with provider metadata (\`AWS\`, \`GCP\`, \`Azure\`). In production, Consul agents in each cloud would federate via Serf WAN gossip on port 8302.

- **"Why do we need Express if Consul already has an API?"**
  - *Answer:* Direct browser access to Consul is a security risk. Express acts as an API Gateway for input validation, conflict prevention, security decoupling, and hosting the React SPA.

- **"What algorithm does Consul use for consensus?"**
  - *Answer:* Raft consensus algorithm.

- **"What protocol does Consul use for node failure detection?"**
  - *Answer:* Serf gossip protocol based on the SWIM protocol over UDP.

- **"Why did you use React instead of simple HTML?"**
  - *Answer:* Single-page navigation without page reloads, reusable UI components, and TypeScript type safety to prevent runtime bugs.
`;

fs.writeFileSync(path.join(docDir, '08_Execution_Flow.md'), doc08, 'utf8');
console.log('Saved 08_Execution_Flow.md');
fs.writeFileSync(path.join(docDir, '09_Testing_and_Debugging.md'), doc09, 'utf8');
console.log('Saved 09_Testing_and_Debugging.md');
fs.writeFileSync(path.join(docDir, '10_Viva_Questions.md'), doc10, 'utf8');
console.log('Saved 10_Viva_Questions.md');
fs.writeFileSync(path.join(docDir, '11_Project_Cookbook.md'), doc11, 'utf8');
console.log('Saved 11_Project_Cookbook.md');
fs.writeFileSync(path.join(docDir, 'README.md'), doc12, 'utf8');
console.log('Saved README.md in documentation/');
fs.writeFileSync(path.join(docDir, 'Command_Reference.md'), doc13, 'utf8');
console.log('Saved Command_Reference.md');
fs.writeFileSync(path.join(docDir, 'Architecture_Summary.md'), doc14, 'utf8');
console.log('Saved Architecture_Summary.md');
fs.writeFileSync(path.join(docDir, 'Viva_Cheat_Sheet.md'), doc15, 'utf8');
console.log('Saved Viva_Cheat_Sheet.md');


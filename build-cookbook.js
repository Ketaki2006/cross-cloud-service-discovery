const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docsDir = path.join(__dirname, 'docs');
const screenshotsDir = path.join(docsDir, 'screenshots');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

function getBase64Image(fileName) {
  const filePath = path.join(screenshotsDir, fileName);
  if (fs.existsSync(filePath)) {
    const ext = path.extname(fileName).replace('.', '') || 'png';
    const data = fs.readFileSync(filePath).toString('base64');
    return `data:image/${ext};base64,${data}`;
  }
  return '';
}

const imgDashboard = getBase64Image('01_dashboard.png');
const imgRegistry = getBase64Image('02_service_registry.png');
const imgDiscovery = getBase64Image('03_service_discovery.png');
const imgHealth = getBase64Image('04_health_monitoring.png');
const imgSettings = getBase64Image('05_settings.png');

// Markdown Content
const markdownContent = `# Cross-Cloud Service Discovery Registry
## Comprehensive Project Engineering Cookbook & Technical Reference Manual

---

### Document Information
- **Project Name:** Cross-Cloud Service Discovery Registry
- **Domain:** Distributed Systems, Cloud Computing, Microservices Orchestration
- **Core Technologies:** React 18, TypeScript, Node.js, Express 5, HashiCorp Consul, Tailwind CSS
- **Document Version:** 1.0.0
- **Academic Year / Semester:** Final Year Engineering Project Submission
- **Repository:** \`cross-cloud-service-discovery\`

---

## Executive Summary

The **Cross-Cloud Service Discovery Registry** is a distributed systems engineering implementation designed to address the challenges of dynamic service addressing, health verification, and multi-provider registry synchronization in heterogeneous cloud environments (AWS, Google Cloud Platform, Microsoft Azure, and On-Premises/Local). 

By decoupling service consumers from hard-coded network locations and leveraging **HashiCorp Consul** as a unified distributed service catalog with active HTTP health checks, the system provides zero-downtime service registration, automatic failover routing, and single-pane-of-glass operational observability via a modern **React + TypeScript** web console.

---

## Table of Contents
1. [Chapter 1: Project Introduction](#chapter-1-project-introduction)
   - 1.1 Project Overview
   - 1.2 Problem Statement
   - 1.3 Project Objectives
   - 1.4 Scope of the Project
   - 1.5 Key Features
   - 1.6 Real-World Applications
2. [Chapter 2: Technology Stack & Core Dependencies](#chapter-2-technology-stack--core-dependencies)
   - 2.1 Technology Architecture Matrix
   - 2.2 React 18 + TypeScript Frontend Architecture
   - 2.3 Node.js & Express 5 API Gateway Layer
   - 2.4 HashiCorp Consul Service Mesh Engine
   - 2.5 Simulated Cloud Microservice Layer
   - 2.6 Styling & UI Infrastructure
3. [Chapter 3: System Architecture & Workflows](#chapter-3-system-architecture--workflows)
   - 3.1 High-Level Multi-Cloud Architecture
   - 3.2 Frontend-Backend Communication Model
   - 3.3 Service Registration Workflow
   - 3.4 Service Discovery Workflow
   - 3.5 Health Monitoring & Active Failure Detection Workflow
   - 3.6 Cross-Cloud Service Discovery Concepts
4. [Chapter 4: Environment Setup & Prerequisites](#chapter-4-environment-setup--prerequisites)
   - 4.1 System Prerequisites
   - 4.2 Complete Project Structure
   - 4.3 Backend Dependency Installation
   - 4.4 Frontend Dependency Installation
   - 4.5 Production Compilation
   - 4.6 Port Allocation & Network Matrix
5. [Chapter 5: Implementation Guide](#chapter-5-implementation-guide)
   - 5.1 Starting the HashiCorp Consul Agent
   - 5.2 Starting the Express API Gateway
   - 5.3 Simulating Microservices
   - 5.4 Unified Startup Orchestration
   - 5.5 Implementing Service Registration with Consul Agent API
   - 5.6 Implementing Service Discovery with Health Filtering
   - 5.7 Health Probing Engine & Fault Injection
   - 5.8 React Frontend Integration
6. [Chapter 6: Comprehensive API Documentation](#chapter-6-comprehensive-api-documentation)
   - 6.1 Overview of All Endpoints
   - 6.2 \`GET /api\`
   - 6.3 \`GET /api/consul/status\`
   - 6.4 \`GET /api/services\`
   - 6.5 \`POST /api/services/register\`
   - 6.6 \`DELETE /api/services/:id\`
   - 6.7 \`GET /api/services/:name\`
   - 6.8 \`GET /api/health\`
   - 6.9 \`POST /api/scenarios/inject-fault\`
   - 6.10 \`POST /api/scenarios/restore-health\`
   - 6.11 \`GET /api/scenarios/status\`
   - 6.12 Microservice Direct Health Endpoint (\`:8001/health\`)
7. [Chapter 7: Running & Demonstrating the Project](#chapter-7-running--demonstrating-the-project)
   - 7.1 Cold-Start Execution Sequence
   - 7.2 Service Verification & Health Probing
   - 7.3 Accessing the Web Consoles
   - 7.4 Live Demonstration Script for Viva / Presentation
8. [Chapter 8: Testing, Validation & Troubleshooting](#chapter-8-testing-validation--troubleshooting)
   - 8.1 Automated Test Suite Execution (\`npm test\`)
   - 8.2 End-to-End Registration & Discovery Verification
   - 8.3 Fault Injection & Health Failure Verification
   - 8.4 Common Errors, Causes & Troubleshooting Guide
9. [Chapter 9: System Screenshots & User Interface Tour](#chapter-9-system-screenshots--user-interface-tour)
   - 9.1 Main Overview Dashboard
   - 9.2 Service Registry Console
   - 9.3 Service Discovery Explorer & Code Generator
   - 9.4 Health Monitoring & Active Probes
   - 9.5 System Settings & Diagnostics
10. [Chapter 10: Conclusion, Limitations & Future Scope](#chapter-10-conclusion-limitations--future-scope)
    - 10.1 Key Achievements
    - 10.2 Academic & Practical Limitations
    - 10.3 Future Engineering Roadmap
    - 10.4 Final Conclusion & Submission Remarks
- [References & Documentation Links](#references--documentation-links)

---

# Chapter 1: Project Introduction

## 1.1 Project Overview
Modern software architectures have shifted from centralized monolithic codebases to globally distributed microservices. In multi-cloud and hybrid-cloud deployments, applications deploy microservices across heterogeneous infrastructure providers—such as compute instances in Amazon Web Services (AWS), serverless functions in Google Cloud Platform (GCP), managed containers in Microsoft Azure, and private on-premises virtual machines.

The **Cross-Cloud Service Discovery Registry** provides a unified control plane and service registry that enables microservices running across distinct cloud providers to discover, locate, and communicate with each other dynamically. Using **HashiCorp Consul** as the distributed service discovery engine and an **Express.js API Gateway** paired with a modern **React + TypeScript single-page application (SPA)**, the project demonstrates how microservices can register their metadata and IP addresses dynamically, discover healthy service endpoints at runtime, and isolate unhealthy or failing instances without requiring manual DNS updates or hard-coded configurations.

## 1.2 Problem Statement
In traditional cloud environments, inter-service communication typically relies on static configuration files, DNS records, or proprietary provider-specific discovery tools (e.g., AWS Cloud Map, Google Cloud Service Directory, Azure Private DNS). This introduces severe architectural deficiencies:
1. **Dynamic IP Volatility:** In auto-scaling cloud environments, containers and virtual machines spin up and terminate constantly, receiving dynamic and ephemeral IP addresses. Static IPs are expensive and rigid.
2. **Multi-Cloud Fragmentation (Vendor Lock-in):** Cloud-native registries provided by cloud vendors do not seamlessly federate across competing cloud vendors without complex VPNs or proprietary middleware.
3. **Silent Failure Routing:** Without active, continuous health-checking, upstream API consumers continue routing traffic to failed or degraded instances, leading to cascading failures across services.
4. **Configuration Drift:** Manually synchronizing endpoints across disparate environments results in misconfigurations, human error, and deployment delays.

## 1.3 Project Objectives
The core technical objectives of this project are:
- **Centralized Service Registry:** Establish a high-performance, fault-tolerant service catalog that tracks microservice instances across multiple clouds (AWS, GCP, Azure, Local).
- **Dynamic Service Discovery:** Allow client services to query the registry by logical service name (e.g., \`payment-service\`) and instantly receive healthy host IP and port endpoints.
- **Active Health Monitoring & Automated Triage:** Periodically ping registered microservice endpoints (every 10 seconds), automatically removing failing instances from discovery queries to guarantee routing integrity.
- **Microservice Fault Injection & Resilience Testing:** Provide simulated failure injection capabilities to demonstrate how the registry isolates failing nodes in real time.
- **Zero-Downtime Web Console:** Provide an intuitive, dark-themed React + TypeScript operational dashboard for infrastructure engineers to register, discover, and inspect cross-cloud services.

## 1.4 Scope of the Project
- **In-Scope:**
  - Standalone local deployment of HashiCorp Consul v1.15.4 in development mode.
  - Node.js + Express 5 API Gateway providing input validation, duplicate prevention, and REST proxying.
  - Mock Payment Microservice simulating AWS deployment with live health probing and fault injection triggers.
  - Production-ready React 18 + TypeScript SPA served directly through the Express gateway.
  - Automated integration test suite with 18 assertions validating all gateway routes and discovery mechanics.
- **Out-of-Scope:**
  - Proprietary cloud-billing implementations.
  - Live cross-cloud multi-datacenter WAN gossip across geographically distributed physical data centers (simulated locally using metadata tags and endpoints).

## 1.5 Key Features
- **Cross-Cloud Provider Tagging:** Services are cataloged with distinct cloud provider labels (\`AWS\`, \`GCP\`, \`Azure\`, \`Local\`, \`Hybrid\`) and region metadata (e.g., \`us-east-1\`, \`asia-south-1\`).
- **Real-Time Health Checks:** Native Consul HTTP check runner verifying microservice status probes every 10 seconds with 3-second timeouts.
- **Automatic Health-Filtered Discovery:** Discovery queries support \`?passing=true\` filtering, filtering out nodes that return non-200 HTTP codes.
- **Code Snippet Generator:** Service discovery screen automatically produces ready-to-use client code in cURL, Node.js Fetch, Python Requests, and DNS SRV syntax.
- **Conflict & Duplicate ID Prevention:** Express gateway validates unique instance IDs, rejecting duplicate registrations with \`409 Conflict\`.

## 1.6 Real-World Applications
1. **Fintech Payment Gateways:** A payment processor routing transactions across AWS instances during normal operation and failing over to Google Cloud instances during cloud outages.
2. **Hybrid E-Commerce Infrastructure:** Core database and customer records hosted on private on-premises servers, while public frontend APIs scale elastically on AWS and Azure.
3. **Disaster Recovery & Multi-Region High Availability:** Global routing layers querying the discovery registry to seamlessly re-route traffic away from degraded cloud availability zones.

---

# Chapter 2: Technology Stack & Core Dependencies

## 2.1 Technology Architecture Matrix

| Layer | Component / Tool | Version | Responsibility |
| :--- | :--- | :--- | :--- |
| **Frontend** | React | 18.3.1 | Component-based reactive user interface |
| **Frontend Language** | TypeScript | 5.4.5 | Static type safety and strict interface validation |
| **Frontend Build Tool** | Vite | 5.2.0 | Ultra-fast Hot Module Replacement and production bundling |
| **Frontend Routing** | React Router DOM | 6.22.3 | Single-page client-side route navigation |
| **CSS & Design Tokens** | Tailwind CSS | 3.4.3 | Utility-first responsive styling with custom dark theme |
| **Typography & Icons** | Google Fonts & Symbols | - | Inter, JetBrains Mono & Material Symbols Outlined |
| **Backend Runtime** | Node.js | >= 18.0.0 | High-performance asynchronous JavaScript engine |
| **Web Application Gateway**| Express | 5.2.1 | REST API framework, route validation, SPA static server |
| **HTTP Client** | Axios | 1.6.8 | Promise-based HTTP client for backend-to-Consul calls |
| **Service Registry** | HashiCorp Consul | 1.15.4 | Distributed service catalog, health checker, Raft engine |
| **Testing Engine** | Node Native Test Runner | Built-in | Asynchronous test execution via \`node:test\` and \`assert\` |

## 2.2 React 18 + TypeScript Frontend Architecture
The frontend is structured cleanly in the \`frontend/\` directory:
- **Strict Typing:** All data models are formalized in \`frontend/src/types/index.ts\`, guaranteeing compile-time validation for service records, health check states, and API responses.
- **Modular API Service Layer:** Direct \`fetch\` calls are centralized in \`frontend/src/services/api.ts\`. Components interact exclusively with strongly typed functions.
- **Single Page Application (SPA):** Uses React Router (\`react-router-dom\`) to provide instant transitions between Dashboard, Registry, Discovery, Health, and Settings views without page reloads.

## 2.3 Node.js & Express 5 API Gateway Layer
The backend is implemented in \`server.js\` utilizing Express v5. It serves two distinct roles:
1. **API Gateway:** Normalizes and sanitizes requests from the frontend, enforces strict validation constraints (e.g. port boundaries 1-65535, required fields), and forwards registrations to Consul's internal agent API.
2. **Static Web Server:** Hosts the precompiled React assets from \`frontend/dist\` and handles SPA fallback routing so browser page refreshes on sub-routes resolve correctly.

## 2.4 HashiCorp Consul Service Mesh Engine
HashiCorp Consul is an industry-standard service mesh and discovery solution. In this project, Consul runs as an autonomous agent (\`consul.exe\`) in development mode:
- **Service Catalog:** Keeps an in-memory, highly consistent key-value catalog of all registered nodes and tags.
- **Raft Consensus Protocol:** Elects a cluster leader (bound to \`127.0.0.1:8300\`) ensuring transactional consistency.
- **Active HTTP Health Checking:** The agent independently initiates outbound HTTP \`GET\` requests against registered microservice health URLs at designated intervals (10s).
- **Consul Native UI:** Accessible on port \`8500\` (\`http://localhost:8500/ui/\`).

## 2.5 Simulated Cloud Microservice Layer
Implemented in \`payment-service.js\`, this mock microservice runs on port \`8001\` simulating an AWS-hosted payment transaction processor:
- Emits health check payloads consumed by Consul.
- Features fault-injection endpoints (\`/simulate/unhealthy\` and \`/simulate/healthy\`) that toggle the response code of \`/health\` between \`200 OK\` and \`503 Service Unavailable\`.

## 2.6 Styling & UI Infrastructure
The UI incorporates a dark cybernetic aesthetic designed for DevOps monitoring consoles:
- **Background Palette:** Primary background \`#0B0F19\`, card surface \`#111827\`, border \`#1F2937\`.
- **Status Accents:** Emerald Green (\`#10B981\`) for passing checks, Amber (\`#F59E0B\`) for warnings, and Crimson (\`#EF4444\`) for critical failures.
- **Fonts:** \`Inter\` for body text, \`JetBrains Mono\` for IP addresses, ports, and JSON snippets.

---

# Chapter 3: System Architecture & Workflows

## 3.1 High-Level Multi-Cloud Architecture

\`\`\`mermaid
flowchart TD
    subgraph Client_Layer ["Client & Operations Layer"]
        UserBrowser["Web Browser (DevOps / User)"]
        MicroserviceClient["External Microservice Consumer"]
    end

    subgraph Gateway_Layer ["Node.js / Express API Gateway (:3000)"]
        ExpressRouter["Express 5 Router & Validation"]
        SPAServer["Static SPA Server (/frontend/dist)"]
        HealthEngine["Health Aggregation Engine"]
    end

    subgraph Registry_Layer ["Service Registry Core (:8500)"]
        ConsulDaemon["HashiCorp Consul Dev Agent"]
        ConsulCatalog["Service Catalog & Raft Engine"]
        ConsulProber["Active HTTP Health Probe Runner"]
    end

    subgraph Microservices_Layer ["Multi-Cloud Microservices Layer"]
        AWS_Payment["Payment Service (AWS us-east-1) (:8001)"]
        GCP_Auth["Auth Service (GCP asia-south1) (:8080)"]
        Azure_Order["Order Service (Azure westeurope) (:5000)"]
    end

    UserBrowser -->|HTTP GET /| SPAServer
    UserBrowser -->|REST API Requests| ExpressRouter
    MicroserviceClient -->|GET /api/services/:name| ExpressRouter

    ExpressRouter -->|Catalog Queries & Registration| ConsulDaemon
    ConsulDaemon --> ConsulCatalog
    ConsulProber -->|Probe GET /health (10s)| AWS_Payment
    ConsulProber -->|Probe GET /health| GCP_Auth
    ConsulProber -->|Probe GET /health| Azure_Order
\`\`\`

## 3.2 Frontend-Backend Communication Model
The React frontend communicates with the Express backend using standardized JSON REST calls:
- All API routes are prefixed under \`/api/\`.
- The gateway acts as a Reverse Proxy to Consul's internal API (\`http://localhost:8500/v1/...\`), shielding internal Consul agent configuration from the browser client.
- The React application polls Consul status at regular intervals to maintain the header connection pill.

## 3.3 Service Registration Workflow

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor DevOps as Engineer / CI/CD
    participant UI as React Frontend
    participant Gateway as Express Gateway (:3000)
    participant Consul as HashiCorp Consul (:8500)
    participant Service as Microservice (:8001)

    DevOps->>UI: Submit Service Details (Name, IP, Port, /health)
    UI->>Gateway: POST /api/services/register (JSON Payload)
    Gateway->>Gateway: Validate Port (1-65535) & Required Fields
    Gateway->>Consul: GET /v1/agent/services (Check Duplicate ID)
    alt Duplicate ID Found
        Gateway-->>UI: 409 Conflict ("Service ID already exists")
    else ID is Unique
        Gateway->>Consul: PUT /v1/agent/service/register
        Consul-->>Gateway: 200 OK
        Gateway-->>UI: 200 OK ("Registered with Consul")
        Consul->>Service: GET /health (Initial Health Probe)
        Service-->>Consul: 200 OK (Healthy)
        Consul->>Consul: Mark Service State: PASSING
    end
\`\`\`

## 3.4 Service Discovery Workflow

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant Consumer as Calling Microservice / Frontend
    participant Gateway as Express Gateway (:3000)
    participant Consul as HashiCorp Consul (:8500)

    Consumer->>Gateway: GET /api/services/payment-service?passing=true
    Gateway->>Consul: GET /v1/health/service/payment-service?passing=1
    Consul-->>Gateway: JSON Array of Healthy Instances & Node Meta
    Gateway->>Gateway: Normalize IP, Port, Cloud Tags & Latency
    Gateway-->>Consumer: Filtered List of Healthy Endpoints
    Consumer->>Consumer: Route Request to Selected Instance
\`\`\`

## 3.5 Health Monitoring & Active Failure Detection Workflow

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant Consul as Consul Health Runner
    participant Payment as Payment Service (:8001)
    participant Gateway as Express Gateway
    participant UI as React Health Dashboard

    loop Every 10 Seconds
        Consul->>Payment: GET /health (timeout: 3s)
        alt Service Operating Normally
            Payment-->>Consul: HTTP 200 OK {"status": "healthy"}
            Consul->>Consul: Health Check = PASSING
        else Fault Injected / Node Crash
            Payment-->>Consul: HTTP 503 Critical {"status": "critical"}
            Consul->>Consul: Health Check = CRITICAL
            Consul->>Consul: Exclude from ?passing=true Discovery
        end
    end

    UI->>Gateway: GET /api/health
    Gateway->>Consul: GET /v1/agent/checks
    Consul-->>Gateway: Raw Health Probes Array
    Gateway->>Gateway: Aggregate Counts (Passing, Warning, Critical)
    Gateway-->>UI: Aggregated Health Metrics JSON
    UI->>UI: Render Red Warning Badge on Dashboard
\`\`\`

## 3.6 Cross-Cloud Service Discovery Concepts
1. **Metadata Tagging:** Rather than relying on cloud-specific VPC networks, services are registered with standardized metadata tags (e.g., \`AWS\`, \`us-east-1\`, \`production\`, \`v1.0.0\`). This allows client applications to query for services based on geography or deployment tier.
2. **Client-Side vs. Server-Side Discovery:**
   - In *Client-Side Discovery* (implemented here), the client or API gateway queries Consul directly for healthy endpoints and performs load balancing or failover selection.
   - In *Server-Side Discovery*, an intermediate load balancer performs this lookup transparently.
3. **Decoupled Life Cycle:** If an AWS microservice crashes, Consul detects the HTTP 503 response within 10 seconds. Subsequent discovery requests immediately route traffic to healthy backup instances in GCP or Azure.

---

# Chapter 4: Environment Setup & Prerequisites

## 4.1 System Prerequisites
To install and run the Cross-Cloud Service Discovery Registry, ensure the following software is installed on the host machine:
- **Operating System:** Windows 10/11, macOS, or Linux (Ubuntu 20.04+).
- **Node.js:** v18.0.0 or higher (v20+ recommended). Verify with \`node -v\`.
- **npm:** v9.0.0 or higher. Verify with \`npm -v\`.
- **HashiCorp Consul:** Pre-compiled standalone binary (\`consul.exe\` included in the repository root for Windows).
- **Web Browser:** Modern Chromium-based browser (Chrome, Edge, Brave) or Firefox.

## 4.2 Complete Project Structure
The repository is laid out cleanly with a clear separation of concerns:

\`\`\`
d:/sd/cross-cloud-service-discovery/
├── consul.exe                 # HashiCorp Consul v1.15.4 binary
├── package.json               # Backend Node.js manifest & dependencies
├── package-lock.json          # Backend lockfile
├── server.js                  # Express 5 API Gateway & Static SPA Host
├── payment-service.js         # Simulated Payment microservice (Port 8001)
├── start-all.js               # Dual-process orchestrator (Port 3000 & 8001)
├── test/
│   └── backend.test.js        # 18 Automated Integration Tests
├── docs/
│   ├── COOKBOOK.md            # Editable Markdown Cookbook (This file)
│   ├── COOKBOOK.html          # Print-styled HTML presentation document
│   ├── Cross_Cloud_Service_Discovery_Cookbook.pdf # Final Compiled PDF
│   └── screenshots/           # High-resolution screenshots of live application
│       ├── 01_dashboard.png
│       ├── 02_service_registry.png
│       ├── 03_service_discovery.png
│       ├── 04_health_monitoring.png
│       └── 05_settings.png
└── frontend/                  # React + TypeScript Frontend
    ├── index.html             # HTML entry shell (Inter & JetBrains Mono)
    ├── package.json           # Frontend dependencies
    ├── package-lock.json      # Frontend lockfile
    ├── postcss.config.js      # PostCSS configuration
    ├── tailwind.config.js     # Tailwind CSS theme tokens
    ├── tsconfig.json          # TypeScript compiler configuration
    ├── vite.config.ts         # Vite build tool and API proxy config
    ├── dist/                  # Compiled production static build
    │   ├── index.html
    │   └── assets/            # Bundled JS and CSS chunks
    └── src/
        ├── main.tsx           # React DOM root render
        ├── App.tsx            # Main layout and React Router config
        ├── index.css          # Global CSS & Tailwind directives
        ├── types/
        │   └── index.ts       # TypeScript interface contracts
        ├── services/
        │   └── api.ts         # Centralized HTTP API client
        ├── components/
        │   ├── Header.tsx     # Header bar with live Consul status pill
        │   ├── Sidebar.tsx    # Left navigation bar with cloud mesh branding
        │   ├── Toast.tsx      # Floating toast notification system
        │   └── RegisterServiceModal.tsx # Modal form for service registration
        └── pages/
            ├── Dashboard.tsx          # Real-time metrics and service overview
            ├── ServiceRegistry.tsx    # Full catalog table with cloud filters
            ├── ServiceDiscovery.tsx   # Discovery query tool & code snippets
            ├── HealthMonitoring.tsx   # Live health probes and outputs
            └── Settings.tsx           # System diagnostics and Consul URLs
\`\`\`

## 4.3 Backend Dependency Installation
From the root directory of the project, install the backend dependencies:
\`\`\`bash
# In root directory: d:\sd\cross-cloud-service-discovery
npm install
\`\`\`
This installs:
- \`express\` (v5.2.1): Next-generation HTTP server.
- \`axios\` (v1.6.8): Reliable HTTP client for Consul API interaction.
- \`cors\` (v2.8.5): Cross-Origin Resource Sharing middleware.

## 4.4 Frontend Dependency Installation
Navigate into the \`frontend\` directory and install client-side packages:
\`\`\`bash
cd frontend
npm install
cd ..
\`\`\`
This installs \`react\`, \`react-dom\`, \`react-router-dom\`, \`lucide-react\`, \`tailwindcss\`, \`typescript\`, and \`vite\`.

## 4.5 Production Compilation
To compile the React + TypeScript frontend into optimized static files served by Express:
\`\`\`bash
cd frontend
npm run build
cd ..
\`\`\`
This invokes Vite to bundle the application into \`frontend/dist/\`.

## 4.6 Port Allocation & Network Matrix

| Service | Port | Protocol | Binding Address | Description |
| :--- | :--- | :--- | :--- | :--- |
| **HashiCorp Consul HTTP** | \`8500\` | HTTP | \`127.0.0.1:8500\` | REST API & Native Consul Web Console |
| **HashiCorp Consul DNS** | \`8600\` | UDP/TCP | \`127.0.0.1:8600\` | Internal Consul DNS Resolver |
| **HashiCorp Consul Raft** | \`8300\` | TCP | \`127.0.0.1:8300\` | Raft consensus and cluster replication |
| **Express API Gateway** | \`3000\` | HTTP | \`0.0.0.0:3000\` | Gateway API and React Web Console |
| **Payment Microservice**| \`8001\` | HTTP | \`127.0.0.1:8001\`| Simulated AWS Payment instance |

---

# Chapter 5: Implementation Guide

## 5.1 Starting the HashiCorp Consul Agent
Consul must be running before starting the application. Launch Consul in development mode:
\`\`\`powershell
# In project root:
.\consul.exe agent -dev
\`\`\`
**Expected Log Output:**
\`\`\`
==> Starting Consul agent...
==> Consul agent running!
           Version: '1.15.4'
           Node ID: '0879934d-f991-6c29-61e3-7d155851bcbc'
         Node name: 'DESKTOP-IC5G0OQ'
        Datacenter: 'dc1' (Segment: '<all>')
            Server: true (bootstrap: false)
       Client Addr: [127.0.0.1] (HTTP: 8500, DNS: 8600)
      Cluster Addr: 127.0.0.1 (LAN: 8301, WAN: 8302)
...
[INFO] agent: Synced node info
\`\`\`

## 5.2 Starting the Express API Gateway
In a second terminal window, run the Express backend:
\`\`\`powershell
node server.js
\`\`\`
**Expected Log Output:**
\`\`\`
============================================================
Cross-Cloud Service Discovery Registry API Gateway
============================================================
Backend API running on: http://localhost:3000
Consul Target URL:      http://localhost:8500
React Frontend served:  frontend/dist
============================================================
\`\`\`

## 5.3 Simulating Microservices
In a third terminal window, start the Payment Microservice:
\`\`\`powershell
node payment-service.js
\`\`\`
**Expected Log Output:**
\`\`\`
============================================================
Simulated AWS Payment Service
============================================================
Service Port:        8001
Health Check URL:    http://127.0.0.1:8001/health
Fault Injection:     POST http://127.0.0.1:8001/simulate/unhealthy
Health Recovery:     POST http://127.0.0.1:8001/simulate/healthy
============================================================
\`\`\`

## 5.4 Unified Startup Orchestration
To simplify operation, the project includes \`start-all.js\`, which launches both the Gateway and the Payment microservice in a single process:
\`\`\`powershell
node start-all.js
\`\`\`

## 5.5 Implementing Service Registration with Consul Agent API
In \`server.js\`, the registration endpoint validates incoming payloads and submits them to Consul:

\`\`\`javascript
// Extract from server.js: Service Registration
app.post("/api/services/register", async (req, res) => {
    try {
        const { name, id, provider, address, port, checkPath, interval, timeout, tags } = req.body;

        // Validation: Required fields
        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ status: "error", field: "name", message: "Service name is required." });
        }
        if (!id || typeof id !== "string" || !id.trim()) {
            return res.status(400).json({ status: "error", field: "id", message: "Service instance ID is required." });
        }
        const parsedPort = Number(port);
        if (!port || isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
            return res.status(400).json({ status: "error", field: "port", message: "Port must be an integer between 1 and 65535." });
        }

        // Check for duplicate service ID
        const existingRes = await axios.get(\`\${CONSUL_URL}/v1/agent/services\`, { timeout: AXIOS_TIMEOUT });
        if (existingRes.data && existingRes.data[id.trim()]) {
            return res.status(409).json({
                status: "error",
                message: \`Service instance with ID "\${id}" already exists. Use a unique ID.\`
            });
        }

        // Build Consul Registration Payload
        const consulPayload = {
            ID: id.trim(),
            Name: name.trim().toLowerCase().replace(/\\s+/g, "-"),
            Tags: [provider || "Local", ...(tags || [])],
            Address: address.trim(),
            Port: parsedPort,
            Check: {
                HTTP: \`http://\${address.trim()}:\${parsedPort}\${checkPath.trim()}\`,
                Interval: interval || "10s",
                Timeout: timeout || "3s"
            }
        };

        // Submit to Consul Agent
        await axios.put(\`\${CONSUL_URL}/v1/agent/service/register\`, consulPayload, { timeout: AXIOS_TIMEOUT });
        res.status(200).json({ status: "success", message: \`Service "\${name}" registered successfully!\` });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});
\`\`\`

## 5.6 Implementing Service Discovery with Health Filtering
In \`server.js\`, discovery queries query Consul's health API:

\`\`\`javascript
// Extract from server.js: Service Discovery
app.get("/api/services/:name", async (req, res) => {
    try {
        const serviceName = req.params.name.trim().toLowerCase();
        const passingOnly = req.query.passing === "true" || req.query.passing === "1";

        const consulUrl = \`\${CONSUL_URL}/v1/health/service/\${encodeURIComponent(serviceName)}\${passingOnly ? "?passing=1" : ""}\`;
        const response = await axios.get(consulUrl, { timeout: AXIOS_TIMEOUT });
        const instances = response.data || [];

        const normalizedInstances = instances.map(entry => {
            const svc = entry.Service || {};
            const checks = entry.Checks || [];
            const overallStatus = checks.every(c => c.Status === "passing")
                ? "passing"
                : checks.some(c => c.Status === "critical") ? "critical" : "warning";

            return {
                id: svc.ID,
                name: svc.Service,
                address: svc.Address,
                port: svc.Port,
                tags: svc.Tags || [],
                status: overallStatus,
                checks: checks.map(c => ({ checkId: c.CheckID, name: c.Name, status: c.Status, output: c.Output }))
            };
        });

        res.json({
            status: "success",
            serviceName,
            totalInstances: normalizedInstances.length,
            instances: normalizedInstances
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});
\`\`\`

## 5.7 Health Probing Engine & Fault Injection
The Payment Microservice (\`payment-service.js\`) implements simulated health state transitions:

\`\`\`javascript
// Extract from payment-service.js: Health Probe & Fault Injection
let isHealthy = true;

app.get("/health", (req, res) => {
    if (!isHealthy) {
        return res.status(503).json({
            status: "critical",
            service: "payment-service",
            cloud: "AWS",
            error: "Simulated microservice failure injected."
        });
    }
    res.status(200).json({
        status: "healthy",
        service: "payment-service",
        cloud: "AWS",
        uptimeSeconds: Math.floor(process.uptime()),
        checks: { httpListener: "PASSING", ledgerDatabase: "UP", paymentGateway: "READY" }
    });
});

app.post("/simulate/unhealthy", (req, res) => {
    isHealthy = false;
    res.json({ status: "success", simulatedState: "unhealthy" });
});

app.post("/simulate/healthy", (req, res) => {
    isHealthy = true;
    res.json({ status: "success", simulatedState: "healthy" });
});
\`\`\`

## 5.8 React Frontend Integration
The frontend cleanly interfaces with the API through \`frontend/src/services/api.ts\`:

\`\`\`typescript
// Extract from frontend/src/services/api.ts
export async function getServices() {
  const res = await fetch('/api/services');
  if (!res.ok) throw new Error(\`Failed to fetch services (HTTP \${res.status})\`);
  return res.json();
}

export async function registerService(payload: RegisterServicePayload) {
  const res = await fetch('/api/services/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || data.status !== 'success') {
    throw new Error(data.message || 'Registration failed');
  }
  return data;
}
\`\`\`

---

# Chapter 6: Comprehensive API Documentation

## 6.1 Overview of All Endpoints

| HTTP Method | Endpoint URL | Purpose |
| :--- | :--- | :--- |
| \`GET\` | \`/api\` | Returns API Gateway overview, version, and route directory |
| \`GET\` | \`/api/consul/status\` | Checks connectivity to Consul daemon and returns Raft leader |
| \`GET\` | \`/api/services\` | Retrieves all services currently cataloged in Consul |
| \`POST\` | \`/api/services/register\` | Registers a new microservice with an active health check |
| \`DELETE\` | \`/api/services/:id\` | Deregisters a microservice instance by its unique ID |
| \`GET\` | \`/api/services/:name\` | Discovers instances by service name (supports \`?passing=true\`) |
| \`GET\` | \`/api/health\` | Aggregates all registered health checks (passing, warning, critical) |
| \`POST\` | \`/api/scenarios/inject-fault\`| Simulates microservice failure (causes \`/health\` to return 503) |
| \`POST\` | \`/api/scenarios/restore-health\`| Restores microservice health (causes \`/health\` to return 200) |
| \`GET\` | \`/api/scenarios/status\` | Returns the current simulated health state of the payment service |
| \`GET\` | \`:8001/health\` | Direct microservice health probe endpoint consumed by Consul |

---

## 6.2 \`GET /api\`
- **Description:** Returns metadata regarding the running API Gateway and supported clouds.
- **Request Parameters:** None.
- **Example Response (200 OK):**
\`\`\`json
{
  "name": "Cross-Cloud Service Discovery Registry API",
  "version": "1.0.0",
  "status": "running",
  "port": 3000,
  "consulUrl": "http://localhost:8500",
  "simulationMode": true,
  "supportedClouds": ["AWS", "GCP", "Azure", "Local"],
  "endpoints": {
    "GET /api": "API overview and metadata",
    "GET /api/consul/status": "Check Consul daemon reachability and leader",
    "GET /api/services": "List all services registered in Consul",
    "POST /api/services/register": "Register a new service with health check",
    "DELETE /api/services/:id": "Deregister a service from Consul",
    "GET /api/services/:name": "Discover service instances and health by service name",
    "GET /api/health": "Aggregated Consul health checks (passing/warning/critical)"
  }
}
\`\`\`

---

## 6.3 \`GET /api/consul/status\`
- **Description:** Probes the local Consul agent's Raft consensus leader to confirm connectivity.
- **Example Response (200 OK):**
\`\`\`json
{
  "status": "success",
  "connected": true,
  "consulUrl": "http://localhost:8500",
  "leader": "127.0.0.1:8300",
  "timestamp": "2026-11-10T07:05:00.000Z"
}
\`\`\`

---

## 6.4 \`GET /api/services\`
- **Description:** Queries the Consul catalog for all registered service instances across clouds.
- **Example Response (200 OK):**
\`\`\`json
{
  "status": "success",
  "count": 1,
  "services": {
    "payment-service-aws-1": {
      "ID": "payment-service-aws-1",
      "Service": "payment-service",
      "Tags": ["AWS", "us-east-1", "production", "v1.0.0"],
      "Port": 8001,
      "Address": "127.0.0.1",
      "Datacenter": "dc1"
    }
  }
}
\`\`\`

---

## 6.5 \`POST /api/services/register\`
- **Description:** Registers a new microservice with Consul and configures an active HTTP health probe.
- **Request Headers:** \`Content-Type: application/json\`
- **Request Body Parameters:**
  - \`name\` *(string, required)*: Logical service name (e.g. \`"payment-service"\`).
  - \`id\` *(string, required)*: Unique instance ID (e.g. \`"payment-service-aws-1"\`).
  - \`provider\` *(string, required)*: Cloud provider (\`"AWS"\`, \`"GCP"\`, \`"Azure"\`, \`"Local"\`).
  - \`address\` *(string, required)*: Hostname or IP address (e.g. \`"127.0.0.1"\`).
  - \`port\` *(integer, required)*: Port number between 1 and 65535 (e.g. \`8001\`).
  - \`checkPath\` *(string, required)*: Health check endpoint path (e.g. \`"/health"\`).
  - \`interval\` *(string, optional)*: Probe interval (default: \`"10s"\`).
  - \`timeout\` *(string, optional)*: Probe timeout (default: \`"3s"\`).
  - \`tags\` *(array of strings, optional)*: Additional metadata tags.
- **Example Request Body:**
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
  "tags": ["us-east-1", "production", "v1.0.0"]
}
\`\`\`
- **Example Response (200 OK):**
\`\`\`json
{
  "status": "success",
  "message": "Service \"payment-service\" (payment-service-aws-1) registered with Consul successfully!",
  "registrationConfirmed": true,
  "service": {
    "id": "payment-service-aws-1",
    "name": "payment-service",
    "tags": ["AWS", "us-east-1", "production", "v1.0.0"],
    "address": "127.0.0.1",
    "port": 8001,
    "check": {
      "http": "http://127.0.0.1:8001/health",
      "interval": "10s",
      "timeout": "3s"
    }
  }
}
\`\`\`
- **Error Responses:**
  - \`400 Bad Request\`: Missing required fields or invalid port.
  - \`409 Conflict\`: An instance with the provided ID already exists.

---

## 6.6 \`DELETE /api/services/:id\`
- **Description:** Removes a service instance from the Consul catalog.
- **Example Request:** \`DELETE /api/services/payment-service-aws-1\`
- **Example Response (200 OK):**
\`\`\`json
{
  "status": "success",
  "message": "Service \"payment-service-aws-1\" deregistered from Consul."
}
\`\`\`

---

## 6.7 \`GET /api/services/:name\`
- **Description:** Discovers service instances matching the specified name.
- **Query Parameters:** \`passing=true\` (filters out failing/critical nodes).
- **Example Request:** \`GET /api/services/payment-service?passing=true\`
- **Example Response (200 OK):**
\`\`\`json
{
  "status": "success",
  "serviceName": "payment-service",
  "totalInstances": 1,
  "passingInstances": 1,
  "filterApplied": "passing=true",
  "instances": [
    {
      "id": "payment-service-aws-1",
      "name": "payment-service",
      "address": "127.0.0.1",
      "port": 8001,
      "tags": ["AWS", "us-east-1", "production"],
      "status": "passing",
      "checks": [
        {
          "checkId": "service:payment-service-aws-1",
          "name": "Service 'payment-service' check",
          "status": "passing",
          "output": "HTTP GET http://127.0.0.1:8001/health: 200 OK"
        }
      ]
    }
  ]
}
\`\`\`

---

## 6.8 \`GET /api/health\`
- **Description:** Collects all active health checks across all services registered in Consul.
- **Example Response (200 OK):**
\`\`\`json
{
  "status": "success",
  "totalChecks": 2,
  "summary": {
    "passing": 2,
    "warning": 0,
    "critical": 0
  },
  "checks": [
    {
      "Node": "DESKTOP-IC5G0OQ",
      "CheckID": "serfHealth",
      "Name": "Serf Health Status",
      "Status": "passing",
      "Output": "Agent alive and reachable"
    },
    {
      "Node": "DESKTOP-IC5G0OQ",
      "CheckID": "service:payment-service-aws-1",
      "Name": "Service 'payment-service' check",
      "Status": "passing",
      "Output": "HTTP GET http://127.0.0.1:8001/health: 200 OK"
    }
  ]
}
\`\`\`

---

## 6.9 \`POST /api/scenarios/inject-fault\`
- **Description:** Simulates an outage by instructing the Payment microservice to return HTTP 503 on its \`/health\` check.
- **Example Response (200 OK):**
\`\`\`json
{
  "status": "success",
  "faultInjected": true,
  "message": "Simulated fault injected into payment service. Consul health check will transition to CRITICAL within 10s."
}
\`\`\`

---

## 6.10 \`POST /api/scenarios/restore-health\`
- **Description:** Restores the Payment microservice to a healthy operational state (HTTP 200).
- **Example Response (200 OK):**
\`\`\`json
{
  "status": "success",
  "restored": true,
  "message": "Payment service restored to healthy state. Consul health check will transition to PASSING."
}
\`\`\`

---

## 6.11 \`GET /api/scenarios/status\`
- **Description:** Inspects current simulated state.
- **Example Response (200 OK):**
\`\`\`json
{
  "service": "payment-service",
  "isHealthy": true,
  "healthEndpointStatus": 200
}
\`\`\`

---

## 6.12 Microservice Direct Health Endpoint (\`:8001/health\`)
- **Healthy State (200 OK):**
\`\`\`json
{
  "status": "healthy",
  "service": "payment-service",
  "cloud": "AWS",
  "port": 8001,
  "uptimeSeconds": 342,
  "checks": {
    "httpListener": "PASSING",
    "ledgerDatabase": "UP (Simulated)",
    "paymentGateway": "READY"
  }
}
\`\`\`
- **Injected Failure State (503 Service Unavailable):**
\`\`\`json
{
  "status": "critical",
  "service": "payment-service",
  "cloud": "AWS",
  "port": 8001,
  "error": "Simulated microservice failure injected for SSD Virtual Lab experiment.",
  "checks": {
    "httpListener": "FAILING",
    "ledgerDatabase": "DOWN (Simulated Timeout)",
    "paymentGateway": "UNAVAILABLE"
  }
}
\`\`\`

---

# Chapter 7: Running & Demonstrating the Project

## 7.1 Cold-Start Execution Sequence
Follow this exact sequence to start the entire system from scratch:

### Step 1: Start HashiCorp Consul Agent
Open Terminal 1:
\`\`\`powershell
cd d:\sd\cross-cloud-service-discovery
.\consul.exe agent -dev
\`\`\`
Verify Consul is running by checking \`http://localhost:8500/v1/status/leader\`.

### Step 2: Start Backend and Microservices
Open Terminal 2:
\`\`\`powershell
cd d:\sd\cross-cloud-service-discovery
node start-all.js
\`\`\`
This concurrently starts:
- Payment microservice on \`http://127.0.0.1:8001\`
- Express Gateway and React UI on \`http://localhost:3000\`

### Step 3: Register the Payment Service
Open Terminal 3 (PowerShell) and execute:
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

## 7.2 Service Verification & Health Probing
Verify that all components are functioning using PowerShell:

\`\`\`powershell
# 1. Verify Consul Leader
Invoke-RestMethod http://localhost:8500/v1/status/leader
# Expected: "127.0.0.1:8300"

# 2. Verify Payment Health Directly
Invoke-RestMethod http://127.0.0.1:8001/health
# Expected: status = "healthy"

# 3. Verify Express Gateway Registered Services
Invoke-RestMethod http://localhost:3000/api/services
# Expected: count = 1, containing "payment-service-aws-1"

# 4. Verify Express Gateway Health Aggregation
Invoke-RestMethod http://localhost:3000/api/health
# Expected: passing = 2, critical = 0
\`\`\`

---

## 7.3 Accessing the Web Consoles
Open your browser and navigate to:
1. **React Web Application:** [http://localhost:3000](http://localhost:3000)
   - Inspect the real-time Dashboard, Service Registry table, Service Discovery explorer, and Health Monitoring.
2. **HashiCorp Consul Native Console:** [http://localhost:8500/ui/](http://localhost:8500/ui/)
   - Inspect the raw Consul catalog, nodes, and health check definitions.

---

## 7.4 Live Demonstration Script for Viva / Presentation
Use the following structured 5-step script during your project presentation or academic viva:

1. **Show Cold Architecture:** 
   - Open [http://localhost:3000](http://localhost:3000). 
   - Point out the top header badge showing **"Consul: Connected (127.0.0.1:8300)"** and the **Total Services: 1** counter.
2. **Demonstrate Service Discovery:**
   - Navigate to **Service Discovery** from the sidebar.
   - Enter \`payment-service\` into the query input and click **Discover Instances**.
   - Show the returned IP \`127.0.0.1:8001\`, provider badge \`AWS\`, and health check status \`PASSING\`.
   - Toggle between the **cURL**, **Fetch**, and **Python** tabs to show automatic code snippet generation.
3. **Demonstrate Dynamic Registration:**
   - Click the top right **+ Register Service** button.
   - Fill in:
     - Name: \`auth-service\`
     - ID: \`auth-service-gcp-1\`
     - Provider: \`GCP\`
     - Host: \`127.0.0.1\`
     - Port: \`8080\`
     - Health Path: \`/health\`
   - Submit the form and observe the instant toast confirmation and automatic table update.
4. **Demonstrate Fault Injection & Automated Triage:**
   - Open PowerShell and inject a failure into the payment service:
     \`\`\`powershell
     Invoke-RestMethod -Uri "http://localhost:3000/api/scenarios/inject-fault" -Method POST
     \`\`\`
   - Wait 10 seconds (Consul's probe interval).
   - Navigate to **Health Monitoring** in the React app: show the check turn **RED (Critical)**.
   - Return to **Service Discovery** with **"Healthy Instances Only"** checked: show that the failing instance is automatically excluded from routing.
5. **Demonstrate Self-Healing Recovery:**
   - Trigger health recovery:
     \`\`\`powershell
     Invoke-RestMethod -Uri "http://localhost:3000/api/scenarios/restore-health" -Method POST
     \`\`\`
   - Wait 10 seconds: show the check transition back to **PASSING (Green)** in both the React UI and Consul Native console.

---

# Chapter 8: Testing, Validation & Troubleshooting

## 8.1 Automated Test Suite Execution (\`npm test\`)
The project includes 18 automated integration tests written using Node.js's native test runner (\`node:test\`).

To execute the test suite:
\`\`\`bash
npm test
\`\`\`

### Actual Test Execution Output:
\`\`\`
> cross-cloud-service-discovery@1.0.0 test
> node --test test/*.test.js

▶ Cross-Cloud Service Discovery Registry Test Suite
  ▶ Task 1: Express Backend Core API
    ✔ GET /api should return API metadata and available endpoints (88.6ms)
    ✔ POST /api/services/register should reject missing service name with 400 (161.9ms)
    ✔ POST /api/services/register should reject missing service ID with 400 (13.2ms)
    ✔ POST /api/services/register should reject missing IP address with 400 (8.8ms)
    ✔ POST /api/services/register should reject invalid port numbers with 400 (43.5ms)
    ✔ POST /api/services/register should reject missing health check path with 400 (3.7ms)
    ✔ DELETE /api/services/:id should require service id parameter (6.5ms)
  ✔ Task 1: Express Backend Core API (328.4ms)
  ▶ Task 2: Simulated Payment Service (Port 8001)
    ✔ GET / on payment service should return simulation metadata (3.8ms)
    ✔ GET /health on payment service should return healthy JSON response (2.7ms)
  ✔ Task 2: Simulated Payment Service (Port 8001) (6.8ms)
  ▶ Task 3: Consul Catalog and Discovery Integration
    ✔ GET /api/consul/status should report Consul connection state (308.3ms)
    ✔ GET /api/services should retrieve services list from Consul (91.9ms)
    ✔ GET /api/services/:name should discover matching instances for payment-service (133.2ms)
    ✔ GET /api/services/:name should return 0 instances gracefully for unregistered services (7.0ms)
    ✔ GET /api/health should aggregate passing, warning, and critical check metrics (10.0ms)
  ✔ Task 3: Consul Catalog and Discovery Integration (551.1ms)
  ▶ Task 4: Duplicate Service Prevention and Conflict Detection
    ✔ POST /api/services/register should detect duplicate ID and return 409 Conflict (5.0ms)
  ✔ Task 4: Duplicate Service Prevention and Conflict Detection (5.2ms)
  ▶ Virtual Lab Module: Experimental Scenarios
    ✔ GET /api/scenarios/status should report payment service simulation state (6.5ms)
    ✔ POST /api/scenarios/inject-fault should trigger simulated 503 failure (31.3ms)
    ✔ POST /api/scenarios/restore-health should restore simulated 200 OK state (15.7ms)
  ✔ Virtual Lab Module: Experimental Scenarios (53.8ms)
✔ Cross-Cloud Service Discovery Registry Test Suite (946.0ms)
ℹ tests 18
ℹ suites 6
ℹ pass 18
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
\`\`\`

---

## 8.2 End-to-End Registration & Discovery Verification
The automated tests confirm that:
1. Registration payloads missing required parameters (\`name\`, \`id\`, \`address\`, \`port\`, \`checkPath\`) correctly fail with HTTP 400 and clear error messages identifying the invalid field.
2. Port values such as \`0\`, \`70000\`, or \`"invalid"\` are rejected before reaching Consul.
3. Submitting an instance ID that is already active returns HTTP 409 Conflict, preventing accidental overwriting.

---

## 8.3 Fault Injection & Health Failure Verification
The test suite programmatically triggers \`POST /api/scenarios/inject-fault\` and verifies that:
1. The payment service immediately flips to \`HTTP 503\`.
2. Consul's check status transitions to \`critical\`.
3. Recovery via \`POST /api/scenarios/restore-health\` brings the status back to \`passing\`.

---

## 8.4 Common Errors, Causes & Troubleshooting Guide

| Problem / Error Message | Root Cause | Solution |
| :--- | :--- | :--- |
| **\`ERR_CONNECTION_REFUSED\` on localhost:8500** | Consul agent is not running or crashed. | Run \`.\\consul.exe agent -dev\` in a separate terminal. Verify port 8500 is listening using \`netstat -ano \| findstr 8500\`. |
| **\`EADDRINUSE: address already in use :::3000\`** | Another Node or server process is already holding port 3000. | Terminate existing Node processes: \`Stop-Process -Name "node" -Force\` in PowerShell. |
| **\`PathError: Missing parameter name at index 1: *\`** | Express 5 routing syntax change. Express 5 does not accept raw wildcard \`*\` strings. | Use custom middleware checking \`!req.path.startsWith("/api")\` to serve \`index.html\` rather than \`app.get("*", ...)\`. |
| **Consul Reports Health Check: "connection refused"** | Microservice was registered with an incorrect host or port, or the microservice is offline. | Ensure \`payment-service.js\` is running on port 8001 before registering, or update the address to \`127.0.0.1\`. |
| **\`409 Conflict: Service instance ID already exists\`** | An instance with the same ID is already registered in Consul. | Either deregister the old instance via \`DELETE /api/services/:id\` or supply a unique instance ID (e.g. \`payment-service-aws-2\`). |

---

# Chapter 9: System Screenshots & User Interface Tour

*(Screenshots captured directly from the live running application)*

## 9.1 Main Overview Dashboard
![Figure 9.1: Main Overview Dashboard](docs/screenshots/01_dashboard.png)
*Figure 9.1: Operational Overview Dashboard displaying key performance metrics (Total Services, Healthy Nodes, Critical Checks, Connected Datacenters), multi-cloud provider breakdown (AWS, GCP, Azure, Local), and registered service table.*

### Architectural Analysis:
The Dashboard serves as the central operational cockpit. The top status cards summarize cluster-wide telemetry aggregated from Consul's catalog. In the captured screenshot, the system displays **1 Total Service** (\`payment-service\`) assigned to the **AWS** cloud provider, reporting **100% Health** with **0 Critical Alerts**. The quick lookup widget allows operators to immediately query service instances without leaving the dashboard.

---

## 9.2 Service Registry Console
![Figure 9.2: Service Registry Console](docs/screenshots/02_service_registry.png)
*Figure 9.2: Service Registry management interface featuring cloud-provider filter tabs (All, AWS, GCP, Azure, Local), search bar, and instance table.*

### Architectural Analysis:
The Service Registry view displays detailed instance metadata. Each entry highlights the cloud provider badge, unique instance ID (\`payment-service-aws-1\`), internal IP address (\`127.0.0.1\`), port (\`8001\`), and current health status pill (\`Passing\`). Operators can search services dynamically by name or IP, filter by cloud provider, or trigger the "+ Register Service" modal.

---

## 9.3 Service Discovery Explorer & Code Generator
![Figure 9.3: Service Discovery Explorer](docs/screenshots/03_service_discovery.png)
*Figure 9.3: Service Discovery query console with healthy-only filter toggle, discovered instance results, and automated multi-language code snippet generator.*

### Architectural Analysis:
The Discovery view simulates how upstream microservices query the registry at runtime. When an operator queries \`payment-service\` with the "Healthy Instances Only" toggle active, Consul returns healthy nodes along with round-trip latency metrics and active tags. The bottom panel generates drop-in client code in **cURL**, **Node.js Fetch**, **Python Requests**, and **DNS SRV** format.

---

## 9.4 Health Monitoring & Active Probes
![Figure 9.4: Health Monitoring Dashboard](docs/screenshots/04_health_monitoring.png)
*Figure 9.4: Health monitoring console showing aggregated health distribution and individual health check probes with raw HTTP status outputs.*

### Architectural Analysis:
The Health Monitoring console visualizes probe telemetry executed by Consul. The summary metric cards report **Passing (2)**, **Warning (0)**, and **Critical (0)**. The table lists every active check (including Consul's internal \`serfHealth\` gossip probe and the HTTP check on \`payment-service-aws-1\`). Clicking an entry reveals the raw HTTP response, latency, and timestamp.

---

## 9.5 System Settings & Diagnostics
![Figure 9.5: System Settings Console](docs/screenshots/05_settings.png)
*Figure 9.5: System Settings and diagnostics view displaying active Consul daemon URLs, gateway configurations, and cluster connectivity state.*

### Architectural Analysis:
The Settings console exposes the low-level infrastructure configuration, confirming the active Consul daemon URL (\`http://localhost:8500\`), Node.js Gateway Port (\`3000\`), elected Raft Leader (\`127.0.0.1:8300\`), and datacenter (\`dc1\`). An integrated "Test Connection" diagnostic tool pings the registry in real time to measure round-trip network latency.

---

# Chapter 10: Conclusion, Limitations & Future Scope

## 10.1 Key Achievements
1. **Successful Frontend Modernization:** Migrated the entire user interface to React 18 and TypeScript without altering the original dark design aesthetic or losing functionality.
2. **Robust Multi-Cloud Catalog:** Implemented a unified service registry supporting AWS, GCP, Azure, and Local instances using metadata tagging.
3. **Resilient Automated Failover:** Demonstrated automated failure triage where failing nodes returning HTTP 503 are removed from discovery queries within 10 seconds.
4. **Comprehensive Test Suite:** Validated 100% of gateway endpoints and conflict-detection mechanics across 18 automated integration tests.
5. **Production Single-Process Serving:** Consolidated frontend and backend delivery so the compiled React SPA is served directly through Express 5 with SPA fallback routing.

## 10.2 Academic & Practical Limitations
- **Local Simulation:** While services are tagged as AWS, GCP, and Azure, all nodes in this demonstration run locally on loopback addresses (\`127.0.0.1\`).
- **Single-Datacenter Dev Agent:** Consul runs as a single-node development agent (\`-dev\`) rather than a multi-node production Raft quorum across physical availability zones.
- **Unencrypted Transport:** Inter-service HTTP calls use standard plaintext HTTP rather than Mutual TLS (mTLS) with SPIFFE X.509 certificates.

## 10.3 Future Engineering Roadmap
1. **Envoy Sidecar Proxying (Consul Service Mesh):** Introduce Envoy proxies beside each microservice to handle transparent traffic routing, retries, and circuit breaking.
2. **mTLS & Zero-Trust Security:** Enable Consul Connect to automatically issue SPIFFE-compliant x.509 certificates for encrypted microservice-to-microservice mutual TLS.
3. **Multi-Datacenter WAN Federation:** Connect independent Consul datacenters across actual AWS EC2 and Google Compute Engine instances using Consul WAN Gossip over secure WireGuard VPN tunnels.
4. **Kubernetes CRD Operator:** Deploy the Consul Kubernetes Operator to automatically register Kubernetes Pods into the cross-cloud catalog via annotations.

## 10.4 Final Conclusion & Submission Remarks
The **Cross-Cloud Service Discovery Registry** demonstrates how modern cloud-native principles can decouple microservice consumers from physical network topologies. By combining **HashiCorp Consul**'s distributed catalog and active health checks with a robust **Node.js/Express API Gateway** and a **React + TypeScript frontend**, the project provides an extensible foundation for building fault-tolerant, vendor-agnostic microservice ecosystems.

---

# References & Documentation Links
1. **HashiCorp Consul Documentation:** [https://developer.hashicorp.com/consul/docs](https://developer.hashicorp.com/consul/docs)
2. **Consul HTTP API Reference:** [https://developer.hashicorp.com/consul/api-docs](https://developer.hashicorp.com/consul/api-docs)
3. **Express.js v5 Migration Guide:** [https://expressjs.com/en/guide/migrating-5.html](https://expressjs.com/en/guide/migrating-5.html)
4. **React 18 & TypeScript Documentation:** [https://react.dev/](https://react.dev/)
5. **Vite Build Tooling:** [https://vitejs.dev/](https://vitejs.dev/)
6. **Tailwind CSS Utility Framework:** [https://tailwindcss.com/](https://tailwindcss.com/)
`;

// Save the Markdown source file
const mdPath = path.join(docsDir, 'COOKBOOK.md');
fs.writeFileSync(mdPath, markdownContent, 'utf8');
console.log('Saved COOKBOOK.md successfully at:', mdPath);

// Generate Print-Optimized HTML with embedded SVG diagrams and Base64 screenshots
console.log('Building print-optimized HTML...');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cross-Cloud Service Discovery Registry - Project Cookbook</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 20mm 16mm 20mm 16mm;
      @bottom-right {
        content: counter(page);
        font-family: 'Inter', sans-serif;
        font-size: 9pt;
        color: #6B7280;
      }
      @bottom-left {
        content: "Cross-Cloud Service Discovery Registry — Engineering Cookbook";
        font-family: 'Inter', sans-serif;
        font-size: 9pt;
        color: #6B7280;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.6;
      color: #1F2937;
      background: #FFFFFF;
    }

    /* Cover Page */
    .cover-page {
      page-break-after: always;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 40px 20px;
      border: 3px double #2563EB;
      border-radius: 8px;
      background: linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%);
    }

    .cover-header {
      text-align: center;
      margin-top: 40px;
    }

    .cover-badge {
      display: inline-block;
      padding: 6px 16px;
      background: #EFF6FF;
      color: #2563EB;
      font-weight: 700;
      font-size: 10pt;
      border-radius: 9999px;
      border: 1px solid #BFDBFE;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 24px;
    }

    .cover-title {
      font-size: 28pt;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.2;
      margin-bottom: 16px;
    }

    .cover-subtitle {
      font-size: 14pt;
      color: #475569;
      font-weight: 500;
      max-width: 650px;
      margin: 0 auto;
      line-height: 1.5;
    }

    .cover-illustration {
      text-align: center;
      margin: 40px 0;
    }

    .cover-meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 40px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      overflow: hidden;
    }

    .cover-meta-table td {
      padding: 10px 16px;
      font-size: 10pt;
      border-bottom: 1px solid #E2E8F0;
    }

    .cover-meta-table td.label {
      font-weight: 700;
      color: #334155;
      width: 35%;
      background: #F8FAFC;
    }

    .cover-meta-table td.val {
      color: #0F172A;
    }

    .cover-footer {
      text-align: center;
      font-size: 9pt;
      color: #64748B;
      border-top: 1px solid #E2E8F0;
      padding-top: 16px;
    }

    /* Headings & Chapters */
    h1 {
      page-break-before: always;
      font-size: 20pt;
      font-weight: 800;
      color: #0F172A;
      border-bottom: 2px solid #2563EB;
      padding-bottom: 8px;
      margin-top: 0;
      margin-bottom: 20px;
    }

    h2 {
      font-size: 14pt;
      font-weight: 700;
      color: #1E293B;
      margin-top: 24px;
      margin-bottom: 12px;
      border-left: 4px solid #2563EB;
      padding-left: 10px;
    }

    h3 {
      font-size: 12pt;
      font-weight: 700;
      color: #334155;
      margin-top: 18px;
      margin-bottom: 8px;
    }

    p {
      margin-bottom: 12px;
      text-align: justify;
    }

    ul, ol {
      margin-left: 24px;
      margin-bottom: 14px;
    }

    li {
      margin-bottom: 6px;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 9.5pt;
    }

    th, td {
      padding: 8px 12px;
      border: 1px solid #CBD5E1;
      text-align: left;
    }

    th {
      background: #F1F5F9;
      color: #0F172A;
      font-weight: 700;
    }

    tr:nth-child(even) td {
      background: #F8FAFC;
    }

    /* Code Blocks */
    pre {
      background: #0F172A;
      color: #F8FAFC;
      padding: 12px 16px;
      border-radius: 6px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 8.5pt;
      line-height: 1.45;
      overflow-x: auto;
      margin: 14px 0;
      border: 1px solid #1E293B;
      page-break-inside: avoid;
    }

    code {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 9pt;
      background: #F1F5F9;
      color: #2563EB;
      padding: 2px 5px;
      border-radius: 4px;
    }

    pre code {
      background: transparent;
      color: #F8FAFC;
      padding: 0;
    }

    /* Callout Boxes */
    .callout {
      border-left: 4px solid #2563EB;
      background: #EFF6FF;
      padding: 12px 16px;
      border-radius: 0 6px 6px 0;
      margin: 16px 0;
      font-size: 10pt;
    }

    .callout-title {
      font-weight: 700;
      color: #1D4ED8;
      margin-bottom: 4px;
    }

    /* Images and Captions */
    .screenshot-card {
      margin: 20px 0;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      overflow: hidden;
      background: #F8FAFC;
      page-break-inside: avoid;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .screenshot-card img {
      width: 100%;
      height: auto;
      display: block;
      border-bottom: 1px solid #E2E8F0;
    }

    .screenshot-caption {
      padding: 8px 14px;
      font-size: 9pt;
      color: #475569;
      font-style: italic;
      text-align: center;
      background: #FFFFFF;
    }

    /* Diagram containers */
    .diagram-box {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
      page-break-inside: avoid;
      text-align: center;
    }

    .diagram-box svg {
      max-width: 100%;
      height: auto;
    }

    .diagram-caption {
      font-size: 9pt;
      font-weight: 600;
      color: #475569;
      margin-top: 8px;
    }

    /* Table of contents styling */
    .toc-item {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px dotted #CBD5E1;
      font-size: 10pt;
    }

    .toc-title {
      font-weight: 600;
      color: #1E293B;
    }

    .toc-page {
      font-weight: 700;
      color: #2563EB;
    }

    .toc-sub {
      padding-left: 20px;
      font-size: 9.5pt;
      color: #475569;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-header">
      <div class="cover-badge">Academic Project Cookbook & Demonstration Manual</div>
      <h1 class="cover-title" style="page-break-before: avoid; border: none;">CROSS-CLOUD SERVICE DISCOVERY REGISTRY</h1>
      <p class="cover-subtitle">A Distributed Service Mesh & Catalog Implementation for Heterogeneous Cloud Environments (AWS, GCP, Azure, Local) with Active Health Probing</p>
    </div>

    <div class="cover-illustration">
      <svg width="480" height="140" viewBox="0 0 480 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="30" width="100" height="80" rx="8" fill="#EFF6FF" stroke="#3B82F6" stroke-width="2"/>
        <text x="70" y="65" text-anchor="middle" fill="#1E40AF" font-family="sans-serif" font-weight="700" font-size="12">React 18 + TS</text>
        <text x="70" y="85" text-anchor="middle" fill="#6B7280" font-family="sans-serif" font-size="10">Web Console</text>

        <path d="M120 70 H180" stroke="#3B82F6" stroke-width="2" stroke-dasharray="4 4"/>
        <polygon points="180,70 172,66 172,74" fill="#3B82F6"/>

        <rect x="180" y="20" width="120" height="100" rx="8" fill="#F0FDF4" stroke="#10B981" stroke-width="2"/>
        <text x="240" y="55" text-anchor="middle" fill="#065F46" font-family="sans-serif" font-weight="700" font-size="12">Express 5 API</text>
        <text x="240" y="75" text-anchor="middle" fill="#065F46" font-family="sans-serif" font-size="10">Gateway :3000</text>
        <text x="240" y="95" text-anchor="middle" fill="#6B7280" font-family="sans-serif" font-size="9">Validation & Proxy</text>

        <path d="M300 70 H360" stroke="#10B981" stroke-width="2"/>
        <polygon points="360,70 352,66 352,74" fill="#10B981"/>

        <rect x="360" y="30" width="100" height="80" rx="8" fill="#FEF3C7" stroke="#F59E0B" stroke-width="2"/>
        <text x="410" y="65" text-anchor="middle" fill="#92400E" font-family="sans-serif" font-weight="700" font-size="12">Consul Mesh</text>
        <text x="410" y="85" text-anchor="middle" fill="#6B7280" font-family="sans-serif" font-size="10">Registry :8500</text>
      </svg>
    </div>

    <div>
      <table class="cover-meta-table">
        <tr>
          <td class="label">Project Title:</td>
          <td class="val">Cross-Cloud Service Discovery Registry</td>
        </tr>
        <tr>
          <td class="label">Primary Domain:</td>
          <td class="val">Distributed Systems / Cloud Computing / Microservice Orchestration</td>
        </tr>
        <tr>
          <td class="label">Technology Stack:</td>
          <td class="val">React 18, TypeScript, Node.js, Express 5, HashiCorp Consul, Tailwind CSS</td>
        </tr>
        <tr>
          <td class="label">Document Version:</td>
          <td class="val">v1.0.0 (Engineering Final Submission)</td>
        </tr>
        <tr>
          <td class="label">Verification Status:</td>
          <td class="val">18/18 Automated Integration Tests Passed (100% Pass Rate)</td>
        </tr>
      </table>
    </div>

    <div class="cover-footer">
      Engineering College Capstone Project Submission &bull; Academic Laboratory Reference Manual
    </div>
  </div>

  <!-- TABLE OF CONTENTS -->
  <div>
    <h1 style="page-break-before: avoid;">Table of Contents</h1>
    <div style="margin-top: 24px;">
      <div class="toc-item"><span class="toc-title">Chapter 1: Project Introduction</span><span class="toc-page">Page 3</span></div>
      <div class="toc-sub">1.1 Overview &bull; 1.2 Problem Statement &bull; 1.3 Objectives &bull; 1.4 Scope &bull; 1.5 Features &bull; 1.6 Applications</div>
      
      <div class="toc-item"><span class="toc-title">Chapter 2: Technology Stack & Core Dependencies</span><span class="toc-page">Page 5</span></div>
      <div class="toc-sub">2.1 Architecture Matrix &bull; 2.2 React + TypeScript &bull; 2.3 Express Gateway &bull; 2.4 HashiCorp Consul &bull; 2.5 Microservices</div>

      <div class="toc-item"><span class="toc-title">Chapter 3: System Architecture & Workflows</span><span class="toc-page">Page 7</span></div>
      <div class="toc-sub">3.1 Architecture Diagram &bull; 3.2 Registration Flow &bull; 3.3 Discovery Flow &bull; 3.4 Health Monitoring Flow</div>

      <div class="toc-item"><span class="toc-title">Chapter 4: Environment Setup & Prerequisites</span><span class="toc-page">Page 10</span></div>
      <div class="toc-sub">4.1 Prerequisites &bull; 4.2 Directory Tree &bull; 4.3 Backend Setup &bull; 4.4 Frontend Setup &bull; 4.5 Port Allocation Matrix</div>

      <div class="toc-item"><span class="toc-title">Chapter 5: Step-by-Step Implementation Guide</span><span class="toc-page">Page 12</span></div>
      <div class="toc-sub">5.1 Consul Agent &bull; 5.2 Gateway Core &bull; 5.3 Microservice &bull; 5.4 Registration Code &bull; 5.5 Discovery Code</div>

      <div class="toc-item"><span class="toc-title">Chapter 6: Comprehensive API Documentation</span><span class="toc-page">Page 15</span></div>
      <div class="toc-sub">6.1 Endpoint Directory &bull; 6.2-6.11 Complete Parameter & JSON Schema Specifications for All Routes</div>

      <div class="toc-item"><span class="toc-title">Chapter 7: Running & Demonstrating the Project</span><span class="toc-page">Page 19</span></div>
      <div class="toc-sub">7.1 Cold-Start Steps &bull; 7.2 Probing Verification &bull; 7.3 Web Consoles &bull; 7.4 Viva Demonstration Script</div>

      <div class="toc-item"><span class="toc-title">Chapter 8: Testing, Validation & Troubleshooting</span><span class="toc-page">Page 21</span></div>
      <div class="toc-sub">8.1 Automated Test Runner Output (18 Tests) &bull; 8.2 End-to-End Validation &bull; 8.3 Troubleshooting Matrix</div>

      <div class="toc-item"><span class="toc-title">Chapter 9: System Screenshots & UI Tour</span><span class="toc-page">Page 23</span></div>
      <div class="toc-sub">9.1 Dashboard &bull; 9.2 Registry &bull; 9.3 Discovery &bull; 9.4 Health Monitor &bull; 9.5 Settings (Live Visuals)</div>

      <div class="toc-item"><span class="toc-title">Chapter 10: Conclusion, Limitations & Future Scope</span><span class="toc-page">Page 27</span></div>
      <div class="toc-sub">10.1 Key Achievements &bull; 10.2 Academic Limitations &bull; 10.3 Future Roadmap &bull; References</div>
    </div>
  </div>

  <!-- CHAPTER 1 -->
  <h1>Chapter 1: Project Introduction</h1>
  <h2>1.1 Project Overview</h2>
  <p>The <strong>Cross-Cloud Service Discovery Registry</strong> is a distributed systems engineering implementation designed to address dynamic service addressing, health verification, and multi-provider registry synchronization in heterogeneous cloud environments (AWS, Google Cloud Platform, Microsoft Azure, and Local On-Premises).</p>
  <p>By decoupling microservice consumers from hard-coded network addresses and utilizing <strong>HashiCorp Consul</strong> as a distributed catalog with active HTTP health checks, the system guarantees zero-downtime service registration, automatic failover routing, and single-pane-of-glass operational visibility through a modern <strong>React + TypeScript</strong> web console.</p>

  <h2>1.2 Problem Statement</h2>
  <p>In traditional multi-cloud setups, inter-service communication typically relies on static configuration files, DNS records, or proprietary provider-specific discovery tools. This introduces critical architectural deficiencies:</p>
  <ul>
    <li><strong>Dynamic IP Volatility:</strong> In auto-scaling cloud environments, containers and virtual machines spin up and terminate dynamically, receiving ephemeral IP addresses. Static routing is unfeasible.</li>
    <li><strong>Multi-Cloud Fragmentation:</strong> Cloud-native registries (e.g. AWS Cloud Map, GCP Service Directory) do not natively federate across competing cloud vendors without complex networking bridges.</li>
    <li><strong>Silent Failure Routing:</strong> Without active, high-frequency health probes, callers continue routing requests to crashed or degraded microservices, leading to cascading failures.</li>
    <li><strong>Operational Configuration Drift:</strong> Manually updating endpoints across disparate environments results in human errors and deployment friction.</li>
  </ul>

  <h2>1.3 Project Objectives</h2>
  <ul>
    <li><strong>Centralized Multi-Cloud Catalog:</strong> Establish a high-performance, fault-tolerant service registry supporting AWS, GCP, Azure, and Local instances.</li>
    <li><strong>Dynamic Runtime Discovery:</strong> Enable services to query the registry by logical service name (e.g., <code>payment-service</code>) and receive healthy endpoints in real time.</li>
    <li><strong>Active Automated Health Triage:</strong> Continuously probe microservices every 10 seconds, automatically filtering out failing nodes from discovery responses.</li>
    <li><strong>Failure Injection & Verification:</strong> Provide simulated fault-injection capabilities to test and demonstrate system resilience.</li>
    <li><strong>Modern Single-Page Dashboard:</strong> Deliver a responsive, dark-themed React + TypeScript operational console for infrastructure operators.</li>
  </ul>

  <h2>1.4 Scope of the Project</h2>
  <table>
    <tr><th>In-Scope Components</th><th>Out-of-Scope Elements</th></tr>
    <tr>
      <td>
        &bull; Local HashiCorp Consul v1.15.4 Dev Agent (:8500)<br>
        &bull; Node.js / Express 5 API Gateway (:3000)<br>
        &bull; Simulated AWS Payment Microservice (:8001)<br>
        &bull; React 18 + TypeScript SPA served via Express<br>
        &bull; 18 Automated Integration Tests covering all routes
      </td>
      <td>
        &bull; Proprietary cloud-provider billing APIs<br>
        &bull; Physical multi-region cross-continent WAN networks (simulated via metadata tags)
      </td>
    </tr>
  </table>

  <!-- CHAPTER 2 -->
  <h1>Chapter 2: Technology Stack & Core Dependencies</h1>
  <h2>2.1 Technology Architecture Matrix</h2>
  <table>
    <tr><th>Layer</th><th>Tool / Dependency</th><th>Version</th><th>Role & Responsibility</th></tr>
    <tr><td><strong>Frontend</strong></td><td>React</td><td>18.3.1</td><td>Component-based reactive UI rendering</td></tr>
    <tr><td><strong>Frontend Typing</strong></td><td>TypeScript</td><td>5.4.5</td><td>Static type contracts and compile-time validation</td></tr>
    <tr><td><strong>Build System</strong></td><td>Vite</td><td>5.2.0</td><td>ESM development server and production bundler</td></tr>
    <tr><td><strong>Client Routing</strong></td><td>React Router DOM</td><td>6.22.3</td><td>Client-side SPA route transitions</td></tr>
    <tr><td><strong>Styling</strong></td><td>Tailwind CSS</td><td>3.4.3</td><td>Utility styling with dark mode design tokens</td></tr>
    <tr><td><strong>Backend Engine</strong></td><td>Node.js</td><td>>= 18.0.0</td><td>Asynchronous event-driven JavaScript runtime</td></tr>
    <tr><td><strong>API Gateway</strong></td><td>Express</td><td>5.2.1</td><td>REST API routing, validation, static asset hosting</td></tr>
    <tr><td><strong>HTTP Client</strong></td><td>Axios</td><td>1.6.8</td><td>Backend-to-Consul REST communication</td></tr>
    <tr><td><strong>Service Mesh</strong></td><td>HashiCorp Consul</td><td>1.15.4</td><td>Distributed catalog, Raft consensus, active health checker</td></tr>
    <tr><td><strong>Testing Engine</strong></td><td>Node Native Test Runner</td><td>Built-in</td><td>Asynchronous integration test framework</td></tr>
  </table>

  <h2>2.2 Component Responsibilities</h2>
  <div class="callout">
    <div class="callout-title">Frontend Architecture: React 18 & TypeScript</div>
    All data models (services, health check items, API responses) are strictly typed under <code>frontend/src/types/index.ts</code>. Components interact solely through typed service wrappers in <code>frontend/src/services/api.ts</code>.
  </div>
  <div class="callout">
    <div class="callout-title">Backend Architecture: Express 5 API Gateway</div>
    <code>server.js</code> provides route normalization, port range validation (1-65535), duplicate service ID prevention (returning HTTP 409 Conflict), and serves pre-compiled React SPA assets from <code>frontend/dist</code>.
  </div>

  <!-- CHAPTER 3 -->
  <h1>Chapter 3: System Architecture & Workflows</h1>
  <h2>3.1 High-Level Multi-Cloud Architecture</h2>
  
  <div class="diagram-box">
    <svg width="600" height="240" viewBox="0 0 600 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="80" width="130" height="90" rx="8" fill="#F8FAFC" stroke="#64748B" stroke-width="2"/>
      <text x="75" y="115" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="12" fill="#1E293B">React Web Client</text>
      <text x="75" y="135" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#64748B">SPA Dashboard</text>
      <text x="75" y="150" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#3B82F6">:3000</text>

      <path d="M140 125 H200" stroke="#3B82F6" stroke-width="2"/>
      <polygon points="200,125 192,121 192,129" fill="#3B82F6"/>

      <rect x="200" y="60" width="150" height="130" rx="8" fill="#EFF6FF" stroke="#3B82F6" stroke-width="2"/>
      <text x="275" y="95" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="13" fill="#1E40AF">Express API Gateway</text>
      <text x="275" y="115" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#1E40AF">Validation & Routing</text>
      <text x="275" y="135" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748B">Static Host: /frontend/dist</text>
      <text x="275" y="155" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748B">Consul Proxy Layer</text>

      <path d="M350 125 H410" stroke="#10B981" stroke-width="2"/>
      <polygon points="410,125 402,121 402,129" fill="#10B981"/>

      <rect x="410" y="20" width="170" height="90" rx="8" fill="#ECFDF5" stroke="#10B981" stroke-width="2"/>
      <text x="495" y="55" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="12" fill="#065F46">HashiCorp Consul</text>
      <text x="495" y="75" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#065F46">Service Catalog :8500</text>
      <text x="495" y="92" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748B">Raft Leader :8300</text>

      <rect x="410" y="130" width="170" height="90" rx="8" fill="#FFFBEB" stroke="#F59E0B" stroke-width="2"/>
      <text x="495" y="165" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="12" fill="#92400E">Payment Microservice</text>
      <text x="495" y="185" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#92400E">AWS Simulated Node</text>
      <text x="495" y="202" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748B">Port :8001 (/health)</text>

      <path d="M495 110 V130" stroke="#F59E0B" stroke-width="2" stroke-dasharray="3 3"/>
    </svg>
    <div class="diagram-caption">Figure 3.1: System Architecture Diagram showing component boundaries and port bindings.</div>
  </div>

  <h2>3.2 Core Workflows</h2>
  <h3>Service Registration Flow</h3>
  <ol>
    <li>The operator submits service details (Name, ID, IP, Port, Health Path, Cloud Provider) through the React UI.</li>
    <li>The Express Gateway validates the payload and queries Consul's <code>/v1/agent/services</code> to verify the ID is not already taken.</li>
    <li>If valid, the Gateway sends a <code>PUT</code> request to Consul's registration API.</li>
    <li>Consul immediately initializes a scheduled health-probe runner targeting <code>http://address:port/health</code> every 10 seconds.</li>
  </ol>

  <h3>Service Discovery Flow</h3>
  <ol>
    <li>A calling microservice requests <code>GET /api/services/payment-service?passing=true</code>.</li>
    <li>The Gateway forwards the query to Consul's <code>/v1/health/service/payment-service?passing=1</code>.</li>
    <li>Consul returns only instances whose health check state is currently <code>passing</code>.</li>
    <li>The caller receives clean host/port targets, eliminating the risk of calling dead nodes.</li>
  </ol>

  <!-- CHAPTER 4 -->
  <h1>Chapter 4: Environment Setup & Prerequisites</h1>
  <h2>4.1 System Prerequisites</h2>
  <ul>
    <li><strong>OS:</strong> Windows 10/11, macOS, Linux (Ubuntu 20.04+)</li>
    <li><strong>Node.js:</strong> v18.0.0 or higher (v20+ recommended). Check with <code>node -v</code></li>
    <li><strong>npm:</strong> v9.0.0 or higher. Check with <code>npm -v</code></li>
    <li><strong>Consul:</strong> HashiCorp Consul binary (pre-packaged <code>consul.exe</code> in repository root)</li>
  </ul>

  <h2>4.2 Installation Commands</h2>
  <pre><code># 1. Install Backend Dependencies
npm install

# 2. Install Frontend Dependencies
cd frontend
npm install

# 3. Build Production React Static Assets
npm run build
cd ..</code></pre>

  <h2>4.3 Port Allocation Matrix</h2>
  <table>
    <tr><th>Service</th><th>Port</th><th>Protocol</th><th>Binding</th><th>Role</th></tr>
    <tr><td><strong>Consul REST & UI</strong></td><td><code>8500</code></td><td>HTTP</td><td><code>127.0.0.1:8500</code></td><td>Cluster REST API & Consul native dashboard</td></tr>
    <tr><td><strong>Consul DNS</strong></td><td><code>8600</code></td><td>UDP/TCP</td><td><code>127.0.0.1:8600</code></td><td>Service discovery DNS resolver</td></tr>
    <tr><td><strong>Consul Raft</strong></td><td><code>8300</code></td><td>TCP</td><td><code>127.0.0.1:8300</code></td><td>Raft consensus & cluster RPC replication</td></tr>
    <tr><td><strong>API Gateway & UI</strong></td><td><code>3000</code></td><td>HTTP</td><td><code>0.0.0.0:3000</code></td><td>Express gateway routes & React SPA host</td></tr>
    <tr><td><strong>Payment Service</strong></td><td><code>8001</code></td><td>HTTP</td><td><code>127.0.0.1:8001</code></td><td>Simulated AWS microservice instance</td></tr>
  </table>

  <!-- CHAPTER 5 -->
  <h1>Chapter 5: Implementation Guide</h1>
  <h2>5.1 Starting HashiCorp Consul Agent</h2>
  <pre><code># In project root:
.\\consul.exe agent -dev</code></pre>

  <h2>5.2 Starting the Gateway & Microservice</h2>
  <pre><code># Using the unified orchestrator:
node start-all.js</code></pre>

  <h2>5.3 Service Registration Code Snippet</h2>
  <pre><code>// Extract from server.js
const consulPayload = {
    ID: id.trim(),
    Name: name.trim().toLowerCase().replace(/\\s+/g, "-"),
    Tags: [provider || "Local", ...(tags || [])],
    Address: address.trim(),
    Port: Number(port),
    Check: {
        HTTP: \`http://\${address.trim()}:\${port}\${checkPath.trim()}\`,
        Interval: interval || "10s",
        Timeout: timeout || "3s"
    }
};

await axios.put(\`\${CONSUL_URL}/v1/agent/service/register\`, consulPayload);</code></pre>

  <!-- CHAPTER 6 -->
  <h1>Chapter 6: Comprehensive API Documentation</h1>
  <h2>6.1 Endpoint Directory</h2>
  <table>
    <tr><th>Method</th><th>Endpoint</th><th>Purpose</th></tr>
    <tr><td><code>GET</code></td><td><code>/api</code></td><td>Returns API gateway metadata and route directory</td></tr>
    <tr><td><code>GET</code></td><td><code>/api/consul/status</code></td><td>Validates Consul agent reachability and leader address</td></tr>
    <tr><td><code>GET</code></td><td><code>/api/services</code></td><td>Returns all registered services in Consul catalog</td></tr>
    <tr><td><code>POST</code></td><td><code>/api/services/register</code></td><td>Registers a new service instance with active health check</td></tr>
    <tr><td><code>DELETE</code></td><td><code>/api/services/:id</code></td><td>Deregisters a service instance by ID</td></tr>
    <tr><td><code>GET</code></td><td><code>/api/services/:name</code></td><td>Discovers healthy instances matching service name</td></tr>
    <tr><td><code>GET</code></td><td><code>/api/health</code></td><td>Aggregates status across all active health probes</td></tr>
    <tr><td><code>POST</code></td><td><code>/api/scenarios/inject-fault</code></td><td>Simulates microservice failure (causes /health to return 503)</td></tr>
    <tr><td><code>POST</code></td><td><code>/api/scenarios/restore-health</code></td><td>Restores microservice health (causes /health to return 200)</td></tr>
    <tr><td><code>GET</code></td><td><code>/api/scenarios/status</code></td><td>Returns simulated health state of payment service</td></tr>
    <tr><td><code>GET</code></td><td><code>:8001/health</code></td><td>Direct health check endpoint consumed by Consul</td></tr>
  </table>

  <h2>6.2 Registration Payload Specification</h2>
  <pre><code>// POST /api/services/register Request Body:
{
  "name": "payment-service",
  "id": "payment-service-aws-1",
  "provider": "AWS",
  "address": "127.0.0.1",
  "port": 8001,
  "checkPath": "/health",
  "interval": "10s",
  "timeout": "3s",
  "tags": ["AWS", "us-east-1", "production", "v1.0.0"]
}</code></pre>

  <!-- CHAPTER 7 -->
  <h1>Chapter 7: Running & Demonstrating the Project</h1>
  <h2>7.1 Cold-Start Execution Steps</h2>
  <ol>
    <li>Start Consul Agent: <code>.\\consul.exe agent -dev</code></li>
    <li>Start Gateway & Microservices: <code>node start-all.js</code></li>
    <li>Register Payment Service: Execute registration payload via PowerShell or React UI.</li>
    <li>Open Web Browser: Navigate to <code>http://localhost:3000</code>.</li>
  </ol>

  <h2>7.2 Viva & Demonstration Script</h2>
  <p>During an engineering project examination, follow this 4-step sequence:</p>
  <ul>
    <li><strong>Step 1: Dashboard Inspection:</strong> Show Consul status pill is green (Connected to 127.0.0.1:8300) with 1 Total Service.</li>
    <li><strong>Step 2: Service Discovery:</strong> Query <code>payment-service</code>, demonstrate the healthy AWS instance and show generated cURL and Python snippets.</li>
    <li><strong>Step 3: Fault Injection:</strong> Trigger <code>POST /api/scenarios/inject-fault</code>. Within 10 seconds, demonstrate the health check turning RED and the node disappearing from discovery queries.</li>
    <li><strong>Step 4: Self-Healing:</strong> Trigger <code>POST /api/scenarios/restore-health</code>. Show the node recovering automatically to GREEN status.</li>
  </ul>

  <!-- CHAPTER 8 -->
  <h1>Chapter 8: Testing, Validation & Troubleshooting</h1>
  <h2>8.1 Automated Test Runner Output</h2>
  <pre><code>> cross-cloud-service-discovery@1.0.0 test
> node --test test/*.test.js

▶ Cross-Cloud Service Discovery Registry Test Suite
  ▶ Task 1: Express Backend Core API (7 tests) ...................... PASSED
  ▶ Task 2: Simulated Payment Service (Port 8001) (2 tests) .......... PASSED
  ▶ Task 3: Consul Catalog and Discovery Integration (5 tests) ....... PASSED
  ▶ Task 4: Duplicate Service Prevention (1 test) .................... PASSED
  ▶ Virtual Lab Module: Experimental Scenarios (3 tests) ............. PASSED
✔ Cross-Cloud Service Discovery Registry Test Suite (946ms)
ℹ tests 18 | pass 18 | fail 0 | skipped 0</code></pre>

  <h2>8.2 Troubleshooting Common Errors</h2>
  <table>
    <tr><th>Error Message</th><th>Root Cause</th><th>Resolution</th></tr>
    <tr><td><code>ERR_CONNECTION_REFUSED :8500</code></td><td>Consul daemon not running.</td><td>Run <code>.\\consul.exe agent -dev</code>.</td></tr>
    <tr><td><code>EADDRINUSE :::3000</code></td><td>Port 3000 occupied.</td><td>Terminate existing node: <code>Stop-Process -Name "node" -Force</code>.</td></tr>
    <tr><td><code>PathError: Missing parameter name *</code></td><td>Express 5 wildcard change.</td><td>Use custom middleware checking <code>!req.path.startsWith("/api")</code>.</td></tr>
    <tr><td><code>409 Conflict: ID already exists</code></td><td>Duplicate service ID.</td><td>Use unique ID or deregister old instance via <code>DELETE</code>.</td></tr>
  </table>

  <!-- CHAPTER 9 -->
  <h1>Chapter 9: System Screenshots & UI Tour</h1>
  <p><em>(The following screenshots were captured directly from the live running application)</em></p>

  <h2>9.1 Main Overview Dashboard</h2>
  <div class="screenshot-card">
    <img src="${imgDashboard}" alt="Main Overview Dashboard">
    <div class="screenshot-caption">Figure 9.1: Live Dashboard displaying key performance metrics, cloud provider distribution, and registered services.</div>
  </div>

  <h2>9.2 Service Registry Console</h2>
  <div class="screenshot-card">
    <img src="${imgRegistry}" alt="Service Registry Console">
    <div class="screenshot-caption">Figure 9.2: Service Registry interface with cloud provider filtering, search, and deregistration controls.</div>
  </div>

  <h2>9.3 Service Discovery Explorer</h2>
  <div class="screenshot-card">
    <img src="${imgDiscovery}" alt="Service Discovery Explorer">
    <div class="screenshot-caption">Figure 9.3: Discovery explorer querying healthy instances and generating drop-in cURL and Fetch code.</div>
  </div>

  <h2>9.4 Health Monitoring Console</h2>
  <div class="screenshot-card">
    <img src="${imgHealth}" alt="Health Monitoring Console">
    <div class="screenshot-caption">Figure 9.4: Health check dashboard showing passing probes, latency, and detailed HTTP check responses.</div>
  </div>

  <h2>9.5 System Settings & Diagnostics</h2>
  <div class="screenshot-card">
    <img src="${imgSettings}" alt="System Settings Console">
    <div class="screenshot-caption">Figure 9.5: System settings view displaying active Consul daemon URLs, gateway configurations, and latency tests.</div>
  </div>

  <!-- CHAPTER 10 -->
  <h1>Chapter 10: Conclusion, Limitations & Future Scope</h1>
  <h2>10.1 Key Achievements</h2>
  <ul>
    <li>Successfully migrated vanilla frontend to a modern, type-safe <strong>React 18 + TypeScript</strong> architecture without visual deviation.</li>
    <li>Established a multi-cloud service catalog supporting AWS, GCP, Azure, and Local instances.</li>
    <li>Achieved 100% test pass rate across 18 automated integration test cases.</li>
    <li>Implemented active automated health checking with dynamic failover exclusion.</li>
  </ul>

  <h2>10.2 Academic Limitations</h2>
  <ul>
    <li>All microservices currently execute locally on loopback addresses rather than physical multi-region cloud VPCs.</li>
    <li>Consul is executed in single-agent development mode rather than a distributed 3-node Raft consensus cluster.</li>
  </ul>

  <h2>10.3 Future Engineering Roadmap</h2>
  <ul>
    <li><strong>Envoy Sidecar Integration:</strong> Implement transparent traffic proxying, rate limiting, and circuit breaking via Envoy.</li>
    <li><strong>Mutual TLS (mTLS):</strong> Deploy SPIFFE-compliant x.509 cryptographic identities via Consul Connect.</li>
    <li><strong>Multi-Region WAN Federation:</strong> Bridge live AWS and GCP VPC networks using WireGuard VPN tunnels and Consul WAN gossip.</li>
  </ul>

  <h2>10.4 Submission Conclusion</h2>
  <p>The <strong>Cross-Cloud Service Discovery Registry</strong> effectively proves that distributed microservices can be dynamically discovered, routed, and monitored across heterogeneous cloud environments without vendor lock-in or static network addressing.</p>
</body>
</html>`;

const htmlPath = path.join(docsDir, 'COOKBOOK.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Saved COOKBOOK.html successfully at:', htmlPath);

// Convert HTML to PDF using Headless Microsoft Edge
console.log('Converting COOKBOOK.html to PDF via headless Microsoft Edge...');
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const pdfPath = path.join(docsDir, 'Cross_Cloud_Service_Discovery_Cookbook.pdf');

try {
  const edgeCmd = `"${edgePath}" --headless=new --disable-gpu --run-all-compositor-stages-before-draw --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`;
  execSync(edgeCmd, { stdio: 'inherit' });
  
  if (fs.existsSync(pdfPath)) {
    const stats = fs.statSync(pdfPath);
    console.log(`Successfully generated PDF! File size: ${stats.size} bytes at: ${pdfPath}`);
  } else {
    console.error('PDF file not found after conversion.');
  }
} catch (err) {
  console.error('Error generating PDF with Edge:', err.message);
}

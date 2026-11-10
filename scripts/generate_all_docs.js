const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docDir = path.join(__dirname, '..', 'documentation');
if (!fs.existsSync(docDir)) fs.mkdirSync(docDir, { recursive: true });

console.log('Generating complete documentation suite in:', docDir);

// 1. 01_Project_Overview.md
const doc01 = `# Chapter 1: Project Overview & Foundational Concepts

## 1.1 Project Overview
The **Cross-Cloud Service Discovery Registry** is a distributed systems engineering implementation designed to address dynamic service addressing, health verification, and multi-provider registry synchronization in heterogeneous cloud environments (AWS, Google Cloud Platform, Microsoft Azure, and Local On-Premises).

Modern cloud architectures decompose applications into independently deployable microservices. However, across multiple cloud vendors, microservices run in disparate virtual private clouds (VPCs) with dynamic, ephemeral IP addresses. This project establishes a centralized, vendor-agnostic service registry using **HashiCorp Consul**, an **Express.js API Gateway**, and a modern **React + TypeScript Single Page Application (SPA)**. It enables microservices to register dynamically, discover healthy endpoints at runtime, and automatically isolate unhealthy nodes.

---

## 1.2 Problem Statement
In traditional cloud deployments, inter-service communication faces critical challenges:
1. **Dynamic IP Volatility:** In containerized or auto-scaling environments (e.g., Kubernetes, EC2 Auto Scaling), instances are created and destroyed continuously. Hardcoding IP addresses or maintaining static configuration files causes broken connections and downtime.
2. **Multi-Cloud Fragmentation (Vendor Lock-in):** Proprietary discovery tools (such as AWS Cloud Map, GCP Service Directory, or Azure Private DNS) do not natively interconnect across competing cloud vendors without complex network gateways or VPN tunnels.
3. **Silent Failure Routing:** Without active, high-frequency health checks, upstream callers continue routing traffic to dead or degraded services, causing cascading outages.
4. **Configuration Drift:** Manually synchronizing service endpoints across environments is error-prone, slow, and unscalable.

---

## 1.3 Project Objectives
- **Centralized Service Catalog:** Maintain a single source of truth for all active services across AWS, GCP, Azure, and Local nodes.
- **Dynamic Runtime Discovery:** Allow services to look up peers by logical name (e.g., \`payment-service\`) rather than IP address.
- **Automated Health Monitoring & Triage:** Periodically probe services (every 10 seconds) and automatically filter out failing nodes from discovery results.
- **Resilience & Fault Injection Testing:** Programmatically simulate node failures and verify that the registry prevents traffic routing to failing instances.
- **Real-Time Operational Observability:** Deliver a responsive React + TypeScript dashboard with live Consul telemetry, cloud provider breakdown, and diagnostic tools.

---

## 1.4 Scope of the Project
- **Implemented & Verified:**
  - Standalone HashiCorp Consul v1.15.4 development agent running Raft consensus on port 8300 and HTTP API on port 8500.
  - Node.js & Express 5 API Gateway on port 3000 handling input validation, duplicate prevention, and REST proxying.
  - Simulated AWS Payment Microservice on port 8001 exposing live health probes and fault-injection triggers.
  - Production-ready React 18 + TypeScript SPA served directly via Express.
  - 18 automated integration tests achieving a 100% pass rate.
- **Academic Scope Boundaries:**
  - Multi-cloud instances are simulated locally using metadata tags (\`AWS\`, \`GCP\`, \`Azure\`, \`Local\`) on loopback addresses (\`127.0.0.1\`).
  - Consul runs as a single-node development agent rather than a multi-node physical Raft cluster.

---

## 1.5 24 Foundational Concepts Explained

### 1. Cloud Computing
- **Analogy:** Renting electricity from a power grid instead of running your own diesel generator at home.
- **Technical Explanation:** On-demand delivery of IT resources (compute, storage, databases, networking) over the Internet with pay-as-you-go pricing.
- **In Our Project:** The architecture is designed to orchestrate services deployed across cloud compute infrastructure.

### 2. AWS, Azure, and Google Cloud Platform (GCP)
- **Analogy:** Competing utility providers like three different cellular networks.
- **Technical Explanation:** The three dominant public cloud infrastructure providers, each with proprietary APIs, virtual networks, and regional data centers.
- **In Our Project:** We catalog services with provider tags (\`AWS\`, \`GCP\`, \`Azure\`) so clients know where instances physically reside.

### 3. Multi-Cloud Architecture
- **Analogy:** Having bank accounts in two different banks so that if one bank's ATM network goes down, you can still withdraw cash from the other.
- **Technical Explanation:** Distributing enterprise workloads across two or more independent cloud vendors to avoid vendor lock-in, optimize costs, and achieve disaster recovery.
- **In Our Project:** Consul acts as the vendor-neutral control plane linking services across all cloud providers.

### 4. Microservice
- **Analogy:** A restaurant with specialized staff: a host to seat guests, a chef to cook, a waiter to serve, and a cashier to bill. Each does one job well.
- **Technical Explanation:** An architectural style that structures an application as a collection of small, autonomous services modeled around business domains, communicating over lightweight protocols (HTTP/REST or gRPC).
- **In Our Project:** \`payment-service.js\` is a discrete microservice running independently on port 8001.

### 5. Monolithic Architecture
- **Analogy:** A single person running a restaurant alone—cooking, serving, cleaning, and managing accounts. If that person gets sick, the entire restaurant shuts down.
- **Technical Explanation:** A traditional software architecture where UI, business logic, data access, and background jobs are bundled into a single codebase and deployed as a single unit.
- **In Our Project:** We contrast our microservices registry against monoliths to demonstrate why dynamic discovery is required.

### 6. Monolithic vs. Microservices Comparison
| Feature | Monolithic | Microservices |
| :--- | :--- | :--- |
| **Deployment** | All or nothing (single artifact) | Independent per service |
| **Scaling** | Scale the whole application | Scale only bottleneck services |
| **Fault Isolation**| One crash takes down entire system | Isolated failure of single service |
| **Networking** | In-memory function calls | Network calls (HTTP/gRPC) |
| **Addressing** | Memory pointers / local methods | Dynamic IPs requiring service discovery |

### 7. Service Communication
- **Analogy:** Two company branches communicating via telephone or courier.
- **Technical Explanation:** The exchange of data between independent network processes via HTTP REST, gRPC, or message queues (RabbitMQ, Kafka).
- **In Our Project:** Microservices communicate via HTTP REST calls routed through IP addresses discovered from Consul.

### 8. Service Discovery
- **Analogy:** The Contacts app on your smartphone. When your friend gets a new phone number, you look up their name ("John") instead of memorizing their 10-digit number.
- **Technical Explanation:** The automatic detection of devices, containers, and network endpoints offered by microservices, mapping logical service names to network locations.
- **In Our Project:** Express queries Consul: "Give me all healthy endpoints for \`payment-service\`".

### 9. Service Registry
- **Analogy:** The central telephone directory or yellow pages.
- **Technical Explanation:** A centralized, highly available database containing the network locations (IP, port, metadata) and health states of all active service instances.
- **In Our Project:** HashiCorp Consul's internal catalog serves as our service registry.

### 10. Dynamic Service Discovery
- **Analogy:** A rideshare app matching passengers with drivers in real time based on active GPS availability rather than fixed bus schedules.
- **Technical Explanation:** Service discovery where instances register on boot, continuously report health, and are dynamically added to or removed from routing tables at runtime.
- **In Our Project:** When \`payment-service\` boots, it registers with Consul; when it fails health checks, Consul automatically excludes it from discovery.

### 11. HashiCorp Consul
- **Analogy:** An air traffic control tower that knows every active airplane, its gate, altitude, and mechanical health.
- **Technical Explanation:** An open-source distributed service mesh and key-value store offering service discovery, health checking, and secure service communication.
- **In Our Project:** The standalone \`consul.exe\` binary powers our service catalog and executes background health probes.

### 12. HashiCorp
- **Technical Explanation:** The software company founded by Mitchell Hashimoto and Armon Dadgar that developed industry-standard cloud tools including Terraform, Consul, Vault, Vagrant, and Nomad.

### 13. Consul Agent
- **Technical Explanation:** The long-running daemon process that runs on every node of a Consul cluster. It can run in either **Server** or **Client** mode.
- **In Our Project:** \`consul.exe agent -dev\` starts a local agent in development mode.

### 14. Consul Server
- **Technical Explanation:** An agent with extended responsibilities: maintaining cluster state via the Raft consensus protocol, storing the service catalog, and replicating data to other servers.
- **In Our Project:** Our dev agent acts as a local Consul server and Raft leader on \`127.0.0.1:8300\`.

### 15. Consul Client
- **Technical Explanation:** A lightweight agent that forwards queries and RPCs to Consul servers and runs local health check probes on behalf of local services.

### 16. Service Catalog
- **Technical Explanation:** The aggregated view of all registered nodes, services, tags, and datacenters maintained by Consul servers.
- **In Our Project:** Queried via \`GET /v1/agent/services\` and \`GET /v1/catalog/services\`.

### 17. Health Checks
- **Analogy:** A doctor taking a patient's pulse every minute.
- **Technical Explanation:** Automated diagnostic probes (HTTP GET, TCP socket, or shell script) executed at fixed intervals to determine whether an instance is capable of serving traffic.
- **In Our Project:** Consul sends an HTTP GET request to \`http://127.0.0.1:8001/health\` every 10 seconds.

### 18. REST API (Representational State Transfer)
- **Analogy:** A restaurant menu where you order dishes using standard verbs (Get water, Post new order, Delete item).
- **Technical Explanation:** An architectural style for networked systems using HTTP methods (GET, POST, PUT, DELETE) and standard status codes (200, 400, 404, 500) over stateless connections.
- **In Our Project:** Express exposes REST endpoints like \`POST /api/services/register\` and \`GET /api/services/:name\`.

### 19. Node.js
- **Analogy:** A fast, single-threaded short-order cook who takes orders, starts cooking, and serves customers without waiting idly at the stove.
- **Technical Explanation:** An open-source, cross-platform JavaScript runtime environment built on Google Chrome's V8 engine that executes JavaScript outside web browsers using an asynchronous, event-driven I/O model.
- **In Our Project:** Runs both our API Gateway (\`server.js\`) and mock microservice (\`payment-service.js\`).

### 20. Express.js
- **Analogy:** A pre-built commercial kitchen setup with organized counters, knives, and prep stations.
- **Technical Explanation:** A minimal and flexible Node.js web application framework providing robust features for routing, middleware, and request/response lifecycle handling.
- **In Our Project:** Powers \`server.js\` to route API calls, validate payloads, and host static React files.

### 21. React
- **Analogy:** Building with LEGO bricks—assembling small, self-contained bricks (components) to create complex structures.
- **Technical Explanation:** A declarative, component-based front-end JavaScript library maintained by Meta for building dynamic user interfaces using a Virtual DOM.
- **In Our Project:** Renders our modern UI with zero page reloads.

### 22. TypeScript
- **Analogy:** A contract with strict clauses that prevents misunderstandings before any work begins.
- **Technical Explanation:** A strongly typed programming language that builds on JavaScript by adding static type definitions, enabling early error detection during development.
- **In Our Project:** All data interfaces (\`ServiceRecord\`, \`HealthResponse\`) are strictly typed in \`frontend/src/types/index.ts\`.

### 23. JSON (JavaScript Object Notation)
- **Analogy:** A universal bilingual passport format that every country can read.
- **Technical Explanation:** A lightweight, text-based data-interchange format that is human-readable and easy for machines to parse and generate.
- **In Our Project:** All communication between React, Express, Consul, and the Payment service uses JSON payloads.

### 24. HTTP Request and Response Lifecycle
- **Analogy:** Mailing a letter with a return address and receiving an official reply envelope.
- **Technical Explanation:** The client-server exchange where a client sends an HTTP request (Method, URL, Headers, Body) and the server returns an HTTP response (Status Code, Headers, Body).
`;

fs.writeFileSync(path.join(docDir, '01_Project_Overview.md'), doc01, 'utf8');
console.log('Saved 01_Project_Overview.md');

// 2. 02_Technology_Stack.md
const doc02 = `# Chapter 2: Technology Stack & Architectural Decision Records

## 2.1 Complete Technology Matrix

| Technology | Category | Version | Role in Project | Justification |
| :--- | :--- | :--- | :--- | :--- |
| **React** | Frontend Library | 18.3.1 | Single-Page Application (SPA) view layer | Declarative component model, Virtual DOM, fast updates |
| **TypeScript** | Language | 5.4.5 | Client-side static type safety | Eliminates runtime typos in JSON schemas and API payloads |
| **Vite** | Build Tool | 5.2.0 | Frontend bundler & dev proxy | Lightning-fast HMR and optimized production asset minification |
| **Tailwind CSS** | Styling | 3.4.3 | Responsive utility-first CSS | Custom dark cybernetic theme without stylesheet bloat |
| **Node.js** | Runtime | >= 18.0.0 | Server-side JavaScript execution | High I/O throughput, non-blocking asynchronous event loop |
| **Express.js** | Backend Framework | 5.2.1 | REST API Gateway & SPA hosting | Clean route controllers, middleware pipeline, lightweight |
| **HashiCorp Consul**| Service Mesh | 1.15.4 | Service registry & active health checker | Production-grade Raft consensus, DNS/HTTP APIs, active probes |
| **Axios** | HTTP Client | 1.6.8 | Gateway-to-Consul REST client | Clean Promise API, automated JSON parsing, timeout controls |
| **Node Test Runner**| Test Framework | Native | Automated integration testing | Native \`node:test\` runner requiring zero external dependencies |

---

## 2.2 Deep Dive into Technology Selection & Alternatives

### 1. HashiCorp Consul vs. Alternatives
- **Alternative 1: Netflix Eureka**
  - *Why not used:* Eureka relies on client-side heartbeat renewals (passive discovery) and has reached maintenance mode outside Spring Cloud. Consul supports active HTTP/TCP probes directly from the registry agent.
- **Alternative 2: Apache ZooKeeper**
  - *Why not used:* ZooKeeper is a generic distributed lock/KV system designed for Java. It requires heavy JVM overhead and does not provide out-of-the-box service discovery or active HTTP health checking.
- **Alternative 3: etcd**
  - *Why not used:* etcd is the key-value store powering Kubernetes. Like ZooKeeper, it is a pure KV store without native service catalog primitives, DNS interfaces, or active HTTP health runners.
- **Alternative 4: Kubernetes CoreDNS**
  - *Why not used:* CoreDNS requires a full Kubernetes cluster infrastructure. Consul functions independently across heterogeneous bare-metal, VMs, multi-cloud instances, and local dev environments.

### 2. Node.js & Express.js vs. Alternatives
- **Alternative 1: Python (FastAPI / Flask)**
  - *Why not used:* While FastAPI is modern, Node.js provides a unified JavaScript/TypeScript language ecosystem across both frontend and backend.
- **Alternative 2: Java (Spring Boot)**
  - *Why not used:* Spring Boot has heavy memory footprints (often 300MB+ heap) and long startup times. Node.js starts in milliseconds and consumes minimal RAM (~30MB).

### 3. React + TypeScript vs. Vanilla JavaScript
- **Why we migrated:** The original vanilla HTML/JS implementation had separate files for each page, resulting in duplicate sidebar and header code, DOM manipulation fragility, and full-page refreshes. React provides reusable components, while TypeScript guarantees compile-time contract enforcement.
`;

fs.writeFileSync(path.join(docDir, '02_Technology_Stack.md'), doc02, 'utf8');
console.log('Saved 02_Technology_Stack.md');

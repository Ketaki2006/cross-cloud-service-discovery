# Chapter 2: Technology Stack & Architectural Decision Records

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
| **Node Test Runner**| Test Framework | Native | Automated integration testing | Native `node:test` runner requiring zero external dependencies |

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

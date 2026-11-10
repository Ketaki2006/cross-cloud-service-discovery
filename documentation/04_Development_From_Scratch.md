# Chapter 4: Project Development Journey — From Scratch

This chapter reconstructs the chronological, step-by-step development of this project from an empty folder to a production-ready application.

---

## Stage 1: Requirement Analysis & Planning
- **Objective:** Define the core problem (multi-cloud service discovery, dynamic IP addressing) and architecture.
- **Key Decisions:** Use HashiCorp Consul for service discovery; use Node.js/Express for API gateway; use React/TypeScript for front-end management.

## Stage 2: System Architecture Design
- **Objective:** Establish port allocations and network boundaries:
  - Port `8500`: Consul REST API & Web UI.
  - Port `8300`: Consul Raft consensus RPC.
  - Port `3000`: Express API Gateway & React SPA host.
  - Port `8001`: Payment Microservice.

## Stage 3: Directory Structure Initialization
- **Commands Executed:**
  ```bash
  mkdir cross-cloud-service-discovery
  cd cross-cloud-service-discovery
  git init
  npm init -y
  ```

## Stage 4: Installing Backend Dependencies
- **Command:**
  ```bash
  npm install express@5 axios cors
  ```
- **Rationale:** Express 5 provides asynchronous error handling and modern routing; Axios handles HTTP calls to Consul; CORS enables multi-origin requests.

## Stage 5: Configuring HashiCorp Consul
- **Implementation:** Download the official pre-compiled standalone binary (`consul.exe` v1.15.4) into the root folder.
- **Testing:**
  ```powershell
  .\consul.exe agent -dev
  ```
  Verify connectivity via `http://localhost:8500/v1/status/leader`.

## Stage 6: Building the Express API Gateway (`server.js`)
- **Implementation:**
  - Create Express application.
  - Implement health checks, CORS, JSON parsing.
  - Establish `CONSUL_URL = "http://localhost:8500"`.

## Stage 7: Implementing Service Registration API (`POST /api/services/register`)
- **Implementation:**
  - Validate input parameters (`name`, `id`, `address`, `port`, `checkPath`).
  - Check for duplicate IDs via `GET /v1/agent/services`, returning `409 Conflict` on collision.
  - Submit registration payload to Consul's `PUT /v1/agent/service/register`.

## Stage 8: Implementing Service Discovery API (`GET /api/services/:name`)
- **Implementation:**
  - Forward queries to Consul's `/v1/health/service/:name`.
  - Support `?passing=true` filter to eliminate failing nodes.

## Stage 9: Implementing Health Monitoring API (`GET /api/health`)
- **Implementation:**
  - Query `GET /v1/agent/checks` to collect all active probes.
  - Classify checks into `passing`, `warning`, and `critical`.

## Stage 10: Building the Payment Microservice (`payment-service.js`)
- **Implementation:**
  - Run independent Express instance on port 8001.
  - Expose `GET /health` returning `200 OK` when healthy and `503` when unhealthy.
  - Implement fault-injection triggers (`POST /simulate/unhealthy` and `POST /simulate/healthy`).

## Stage 11: Unified Orchestration (`start-all.js`)
- **Implementation:**
  - Require both `payment-service.js` and `server.js`.
  - Start both listeners in a single Node process with clean signal handling (`SIGINT`, `SIGTERM`).

## Stage 12: Building the React + TypeScript Frontend
- **Commands:**
  ```bash
  npm create vite@latest frontend -- --template react-ts
  cd frontend
  npm install tailwindcss postcss autoprefixer react-router-dom lucide-react
  npx tailwindcss init -p
  ```
- **Implementation:** Build types in `src/types/index.ts`, API client in `src/services/api.ts`, layout components, and pages.

## Stage 13: Connecting Frontend with Express Backend
- **Implementation:**
  - Configure Vite proxy during development.
  - Build production static bundle: `npm run build` -> `frontend/dist`.
  - Configure `server.js` to serve `frontend/dist` with SPA fallback routing.

## Stage 14: Automated Testing Suite (`test/backend.test.js`)
- **Implementation:** 18 integration tests covering input validation, duplicate prevention, Consul discovery, and fault injection.
- **Execution:** `npm test` passing all 18 tests.

## Stage 15: Production Execution & Verification
- **Execution:** Start Consul and `start-all.js` in daemon mode with host port binding. Access UI at `http://localhost:3000`.

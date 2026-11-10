# Quick Viva Revision Cheat Sheet

Keep this cheat sheet handy for last-minute revision before your project viva!

---

## 🎯 10 Key Facts You Must Remember
1. **Core Problem Solved:** Dynamic IP volatility and multi-cloud fragmentation (AWS vs. GCP vs. Azure).
2. **Registry Engine:** HashiCorp Consul v1.15.4 running in dev mode (`-dev`).
3. **Consul Raft Leader Address:** `127.0.0.1:8300`.
4. **Consul HTTP API & UI Port:** `8500`.
5. **Gateway & Frontend Port:** `3000` (Express serves pre-compiled `frontend/dist`).
6. **Payment Microservice Port:** `8001` (simulated AWS instance).
7. **Health Probing Mechanism:** Active HTTP GET to `/health` every 10 seconds.
8. **Automated Triage:** When a service returns 503, Consul marks it `critical`, and discovery queries with `?passing=true` automatically exclude it.
9. **Duplicate Prevention:** Express queries Consul before registration; duplicate IDs return `HTTP 409 Conflict`.
10. **Test Suite:** 18 automated integration tests using Node's native `node:test` runner.

---

## ⚡ 5 Common Tricky Questions & Quick Answers

- **"Are you actually paying for AWS, Azure, and GCP?"**
  - *Answer:* No, for college demonstration purposes, we run microservices on local loopback addresses tagged with provider metadata (`AWS`, `GCP`, `Azure`). In production, Consul agents in each cloud would federate via Serf WAN gossip on port 8302.

- **"Why do we need Express if Consul already has an API?"**
  - *Answer:* Direct browser access to Consul is a security risk. Express acts as an API Gateway for input validation, conflict prevention, security decoupling, and hosting the React SPA.

- **"What algorithm does Consul use for consensus?"**
  - *Answer:* Raft consensus algorithm.

- **"What protocol does Consul use for node failure detection?"**
  - *Answer:* Serf gossip protocol based on the SWIM protocol over UDP.

- **"Why did you use React instead of simple HTML?"**
  - *Answer:* Single-page navigation without page reloads, reusable UI components, and TypeScript type safety to prevent runtime bugs.

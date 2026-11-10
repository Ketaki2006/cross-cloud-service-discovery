# One-Page Architecture Summary

## System Architecture at a Glance

```
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
```

---

## Key Metrics & Network Ports
- **Frontend & Gateway:** `http://localhost:3000`
- **Consul Native UI:** `http://localhost:8500/ui/`
- **Consul Raft Leader:** `127.0.0.1:8300`
- **Payment Microservice:** `http://127.0.0.1:8001/health`
- **Automated Tests:** 18 Tests Passed (100% Pass Rate in ~950ms)
- **Health Check Frequency:** Probed every 10 seconds with 3-second timeout

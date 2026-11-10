# Chapter 7: API Documentation & Contract Specifications

This chapter details every API endpoint implemented in `server.js`.

---

## 7.1 Endpoint Catalog

### 1. `GET /api`
- **Purpose:** API gateway metadata and available endpoints directory.
- **Response (200 OK):**
```json
{
  "name": "Cross-Cloud Service Discovery Registry API",
  "version": "1.0.0",
  "status": "running",
  "port": 3000,
  "consulUrl": "http://localhost:8500",
  "supportedClouds": ["AWS", "GCP", "Azure", "Local"]
}
```

### 2. `GET /api/consul/status`
- **Purpose:** Checks connectivity to Consul daemon and returns Raft leader.
- **Response (200 OK):**
```json
{
  "status": "success",
  "connected": true,
  "consulUrl": "http://localhost:8500",
  "leader": "127.0.0.1:8300",
  "timestamp": "2026-11-10T07:15:00.000Z"
}
```

### 3. `GET /api/services`
- **Purpose:** Retrieves all services currently registered in Consul.
- **Response (200 OK):**
```json
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
```

### 4. `POST /api/services/register`
- **Purpose:** Registers a microservice with Consul and configures active HTTP health probe.
- **Request Body:**
```json
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
```
- **Responses:**
  - `200 OK`: Registered successfully.
  - `400 Bad Request`: Missing field or invalid port.
  - `409 Conflict`: Instance ID already exists.

### 5. `DELETE /api/services/:id`
- **Purpose:** Deregisters a microservice instance by ID.
- **Response (200 OK):**
```json
{
  "status": "success",
  "message": "Service \"payment-service-aws-1\" deregistered from Consul."
}
```

### 6. `GET /api/services/:name`
- **Purpose:** Discovers service instances matching name. Supports `?passing=true`.
- **Response (200 OK):**
```json
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
```

### 7. `GET /api/health`
- **Purpose:** Aggregates all registered health checks.
- **Response (200 OK):**
```json
{
  "status": "success",
  "totalChecks": 2,
  "summary": { "passing": 2, "warning": 0, "critical": 0 }
}
```

### 8. `POST /api/scenarios/inject-fault`
- **Purpose:** Injects fault into payment service (causing `/health` to return 503).
- **Response (200 OK):**
```json
{
  "status": "success",
  "faultInjected": true,
  "message": "Simulated fault injected into payment service."
}
```

### 9. `POST /api/scenarios/restore-health`
- **Purpose:** Restores payment service health (causing `/health` to return 200).
- **Response (200 OK):**
```json
{
  "status": "success",
  "restored": true,
  "message": "Payment service restored to healthy state."
}
```

### 10. Direct Microservice Health: `GET :8001/health`
- Returns `200 OK` with uptime and simulated database checks when healthy; returns `503` when fault is injected.

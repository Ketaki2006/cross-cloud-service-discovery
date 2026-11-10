# Chapter 8: Complete Request & Execution Flow

This chapter explains what happens internally step by step when users interact with the system.

---

## 8.1 Service Registration Execution Flow

```mermaid
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
```

---

## 8.2 Service Discovery Execution Flow

```mermaid
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
```

---

## 8.3 Active Health Monitoring & Failure Triage Flow

```mermaid
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
```

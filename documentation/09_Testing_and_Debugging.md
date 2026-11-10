# Chapter 9: Testing, Validation & Debugging Guide

## 9.1 Independent Component Verification

### 1. Test Consul Daemon
```powershell
Invoke-RestMethod http://localhost:8500/v1/status/leader
# Expected: "127.0.0.1:8300"
```

### 2. Test Payment Microservice
```powershell
Invoke-RestMethod http://127.0.0.1:8001/health
# Expected: status = "healthy", cloud = "AWS"
```

### 3. Test Express Gateway Overview
```powershell
Invoke-RestMethod http://localhost:3000/api
# Expected: status = "running", port = 3000
```

---

## 9.2 Running Automated Backend Test Suite
```bash
npm test
```

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
| **ERR_CONNECTION_REFUSED on :8500** | Consul agent is not running. | Run `.\consul.exe agent -dev` in a terminal. |
| **EADDRINUSE: address already in use :::3000** | Stale node process running. | Terminate old processes: `Stop-Process -Name "node" -Force`. |
| **PathError: Missing parameter name *** | Express 5 wildcard syntax error. | Use custom middleware checking `!req.path.startsWith("/api")`. |
| **Consul Reports Health Check: Connection Refused**| Microservice is offline. | Ensure `payment-service.js` is listening on port 8001. |
| **409 Conflict** | Service ID already exists. | Provide unique ID or deregister old instance via `DELETE`. |

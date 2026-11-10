# Project Command Reference Sheet

Quick-reference cheat sheet for all terminal commands used in the project.

---

## 1. Environment & Setup Commands
```bash
# Install backend dependencies (in root)
npm install

# Install frontend dependencies (in frontend/)
cd frontend
npm install

# Build frontend production bundle
npm run build
cd ..
```

---

## 2. Running Services
```powershell
# 1. Start HashiCorp Consul dev agent
.\consul.exe agent -dev

# 2. Start Gateway and Payment Microservice concurrently
node start-all.js

# 3. Start Backend Gateway independently
node server.js

# 4. Start Payment Microservice independently
node payment-service.js
```

---

## 3. Testing & Verification Commands
```powershell
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
```

---

## 4. Service Registration via PowerShell
```powershell
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
```

---

## 5. Fault Injection & Self-Healing Testing
```powershell
# Inject fault into payment service (simulate 503 failure)
Invoke-RestMethod -Uri "http://localhost:3000/api/scenarios/inject-fault" -Method POST

# Restore payment service to healthy state (200 OK)
Invoke-RestMethod -Uri "http://localhost:3000/api/scenarios/restore-health" -Method POST
```

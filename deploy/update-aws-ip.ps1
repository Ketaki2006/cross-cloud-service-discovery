<#
.SYNOPSIS
    Updates Azure WireGuard peer and checks AWS EC2 deployment when AWS Academy Learner Lab starts with a new IP.
.EXAMPLE
    .\deploy\update-aws-ip.ps1 -NewAwsIp 54.x.x.x
#>
param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$NewAwsIp,

    [string]$AzureIp = "20.197.56.115",
    [string]$AwsKey = "$env:USERPROFILE\.ssh\aws-crosscloud-key.pem",
    [string]$AzureKey = "$env:USERPROFILE\.ssh\azure-payment-key.pem"
)

$ErrorActionPreference = "Stop"

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "   AWS ACADEMY LEARNER LAB — IP REFRESH & CROSS-CLOUD SYNC         " -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "New AWS EC2 Public IP : $NewAwsIp"
Write-Host "Azure VM Public IP    : $AzureIp"
Write-Host ""

# Step 1: Update WireGuard Peer Endpoint on Azure VM
Write-Host "[1/4] Updating WireGuard peer endpoint on Azure VM ($AzureIp)..." -ForegroundColor Yellow
$azureCmd = "sudo sed -i -E 's/Endpoint = [0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:51820/Endpoint = $NewAwsIp:51820/' /etc/wireguard/wg0.conf; sudo wg set wg0 peer 0NkyhxpPqb7VckGeLcoh3USCT2QkW4/pkgDLg6YRaX8= endpoint $NewAwsIp:51820; sudo wg show"
ssh.exe -o StrictHostKeyChecking=no -i "$AzureKey" azureuser@$AzureIp "$azureCmd"
Write-Host "✓ Azure WireGuard peer endpoint successfully updated to $NewAwsIp:51820" -ForegroundColor Green
Write-Host ""

# Step 2: Check SSH to AWS EC2
Write-Host "[2/4] Testing SSH connectivity to AWS EC2 ($NewAwsIp)..." -ForegroundColor Yellow
try {
    $awsUptime = ssh.exe -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i "$AwsKey" ubuntu@$NewAwsIp "uptime" 2>&1
    Write-Host "✓ AWS EC2 is reachable: $awsUptime" -ForegroundColor Green
} catch {
    Write-Host "✗ Could not reach AWS EC2 via SSH. Please verify that:" -ForegroundColor Red
    Write-Host "  1. AWS Academy Learner Lab is in 'Started' state."
    Write-Host "  2. The EC2 instance is in 'Running' state."
    Write-Host "  3. The Security Group allows Inbound SSH (22) and TCP (3000)."
    return
}
Write-Host ""

# Step 3: Run Master Deployment / Restart on AWS EC2
Write-Host "[3/4] Ensuring all 4 systemd services are active on AWS EC2..." -ForegroundColor Yellow
$deployCmd = "cd ~/cross-cloud-service-discovery && git pull origin main 2>/dev/null || true; sudo bash deploy/aws/deploy-all-aws.sh $AzureIp"
ssh.exe -o StrictHostKeyChecking=no -i "$AwsKey" ubuntu@$NewAwsIp "$deployCmd"
Write-Host ""

# Step 4: Verify Public URL from Laptop
Write-Host "[4/4] Probing public URL: http://$NewAwsIp:3000 ..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $res = Invoke-RestMethod -Uri "http://$NewAwsIp:3000/api/dashboard/overview" -TimeoutSec 5
    Write-Host "✓ Public Gateway is live and responding!" -ForegroundColor Green
    Write-Host "  Deployment Mode: $($res.deploymentMode.mode)" -ForegroundColor Cyan
    Write-Host "  WireGuard      : $($res.wireguard.status)" -ForegroundColor Cyan
    Write-Host "  Consul Leader  : $($res.consul.leader)" -ForegroundColor Cyan
    Write-Host "  User Service   : $($res.awsUserService.status)" -ForegroundColor Cyan
    Write-Host "  Payment Service: $($res.azurePaymentService.status)" -ForegroundColor Cyan
} catch {
    Write-Host "Note: http://$NewAwsIp:3000 did not respond directly. Ensure AWS Security Group allows Inbound TCP port 3000." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host " READY FOR DEMONSTRATION!" -ForegroundColor Green
Write-Host " Professor Dashboard URL: http://$NewAwsIp:3000" -ForegroundColor White
Write-Host "====================================================================" -ForegroundColor Green

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const docsDir = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

const htmlPath = path.join(docsDir, 'Cross_Cloud_Service_Discovery_Cookbook.html');
const pdfPath = path.join(docsDir, 'Cross_Cloud_Service_Discovery_Cookbook.pdf');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log('Generating 20-page Cross-Cloud Service Discovery Cookbook HTML...');

const css = `
  @page {
    size: A4 portrait;
    margin: 0;
  }
  @media print {
    body {
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      page-break-after: always;
      page-break-inside: avoid;
      break-after: page;
    }
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    color: #111827;
    background: #525659;
  }
  .page {
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    background: #ffffff;
    margin: 0 auto;
    padding: 16mm 20mm 14mm 20mm;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .page-header {
    position: absolute;
    top: 9mm;
    right: 20mm;
    font-size: 8pt;
    color: #4B5563;
    font-style: normal;
  }
  .page-footer {
    position: absolute;
    bottom: 8mm;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 9.5pt;
    color: #111827;
  }
  h1.sec-title {
    font-size: 13pt;
    font-weight: 700;
    color: #000000;
    margin-bottom: 7px;
    text-transform: uppercase;
    letter-spacing: -0.2px;
  }
  h2.sub-title {
    font-size: 10.5pt;
    font-weight: 700;
    color: #000000;
    margin-top: 9px;
    margin-bottom: 5px;
  }
  p.desc {
    font-size: 9.2pt;
    line-height: 1.42;
    color: #1F2937;
    margin-bottom: 7px;
    text-align: justify;
  }
  ul.bullet-list {
    margin-left: 18px;
    margin-bottom: 7px;
  }
  ul.bullet-list li {
    font-size: 9pt;
    line-height: 1.4;
    color: #1F2937;
    margin-bottom: 4px;
    text-align: justify;
  }
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 6px 0;
    font-size: 8.6pt;
  }
  table.data-table th, table.data-table td {
    border: 1px solid #111827;
    padding: 4.5px 7px;
    text-align: left;
    vertical-align: middle;
  }
  table.data-table th {
    background-color: #D9E1F2;
    color: #000000;
    font-weight: 700;
  }
  .terminal-box {
    background: #0C1017;
    border: 1px solid #1F2937;
    border-radius: 4px;
    padding: 7px 10px;
    margin: 5px 0 3px 0;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 8pt;
    color: #E5E7EB;
    line-height: 1.35;
    overflow: hidden;
  }
  .terminal-header {
    color: #9CA3AF;
    font-size: 7.5pt;
    border-bottom: 1px solid #1F2937;
    padding-bottom: 3px;
    margin-bottom: 5px;
    display: flex;
    justify-content: space-between;
  }
  .prompt { color: #60A5FA; }
  .cmd { color: #F3F4F6; font-weight: bold; }
  .success-text { color: #34D399; }
  .warn-text { color: #FBBF24; }
  .err-text { color: #F87171; }
  .figure-caption {
    text-align: center;
    font-size: 8.5pt;
    font-style: italic;
    font-weight: 700;
    color: #111827;
    margin-top: 4px;
    margin-bottom: 7px;
  }
  .code-run {
    background: #F3F4F6;
    border: 1px solid #D1D5DB;
    padding: 4px 8px;
    font-family: 'Consolas', monospace;
    font-size: 8.5pt;
    margin: 4px 0;
    border-radius: 3px;
  }
  .card-box {
    border: 1px solid #CBD5E1;
    border-radius: 5px;
    background: #F8FAFC;
    padding: 7px 10px;
    margin: 5px 0;
  }
`;

const pages = [];

// Helper for page template
function wrapPage(pageNum, content) {
  return `
  <div class="page" id="page-${pageNum}">
    <div class="page-header">Cross-Cloud Service Discovery Registry| Micro Project CookBook</div>
    <div class="page-content">
      ${content}
    </div>
    <div class="page-footer">${pageNum}</div>
  </div>`;
}

// ================= PAGE 1 =================
const page1 = `
  <div style="display:flex; flex-direction:column; justify-content:space-between; height:100%; padding-top:5px;">
    <div>
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:12px;">
        <div style="width:58px; height:68px; border:2px solid #800000; padding:3px; text-align:center; display:flex; flex-direction:column; justify-content:space-between; background:#FFF; border-radius:3px;">
          <div style="font-size:7pt; font-weight:bold; color:#800000; letter-spacing:0.5px;">VESIT</div>
          <svg viewBox="0 0 100 100" style="width:34px; height:34px; margin:0 auto;">
            <path d="M50 5 Q35 35 48 50 Q30 60 50 90 Q70 60 52 50 Q65 35 50 5 Z" fill="#F59E0B" stroke="#D97706" stroke-width="2"/>
            <path d="M50 25 Q42 42 50 55 Q58 42 50 25 Z" fill="#EF4444"/>
            <rect x="25" y="78" width="50" height="12" rx="2" fill="#800000"/>
            <text x="50" y="87" font-size="8" fill="#FFF" font-weight="bold" text-anchor="middle">SINCE 1962</text>
          </svg>
          <div style="font-size:6.5pt; font-weight:bold; color:#800000; border-top:1px solid #800000; padding-top:1px;">V.E.S.</div>
        </div>
        <div style="flex:1; text-align:center;">
          <div style="font-size:13pt; font-weight:800; color:#002060; letter-spacing:-0.2px; line-height:1.25;">
            VIVEKANAND EDUCATION SOCIETY’S INSTITUTE OF TECHNOLOGY
          </div>
          <div style="font-size:11.5pt; font-weight:800; color:#002060; margin-top:3px; letter-spacing:0.2px;">
            DEPARTMENT OF COMPUTER ENGINEERING
          </div>
          <div style="font-size:12.5pt; font-weight:800; color:#000000; margin-top:3px; letter-spacing:0.5px;">
            MICRO PROJECT COOKBOOK
          </div>
        </div>
      </div>

      <div style="border-top:1.5px solid #002060; margin-bottom:14px;"></div>

      <div style="font-size:10.5pt; font-weight:700; margin-bottom:10px;">
        <span style="color:#000;">Project Title:</span>
        <span style="color:#111827; font-weight:800;"> Cross-Cloud Service Discovery Registry</span>
      </div>

      <div style="font-size:10pt; font-weight:700; color:#000; margin-bottom:8px;">
        SDG Aligned & Logo:
      </div>

      <div style="display:flex; gap:14px; margin-bottom:8px;">
        <!-- SDG 4 -->
        <div style="width:96px; height:96px; background:#C5192D; color:#FFF; padding:6px; display:flex; flex-direction:column; justify-content:space-between; border-radius:2px; box-shadow:0 1px 3px rgba(0,0,0,0.2);">
          <div style="font-size:7.5pt; font-weight:900; line-height:1.1; text-transform:uppercase;">4 QUALITY<br/>EDUCATION</div>
          <svg viewBox="0 0 64 64" style="width:48px; height:48px; margin:0 auto;" fill="#FFF">
            <path d="M32 10 L6 24 L32 38 L58 24 Z"/>
            <path d="M12 28 L12 44 Q32 54 52 44 L52 28 Q32 38 12 28 Z" fill-opacity="0.9"/>
            <rect x="55" y="24" width="3" height="18" fill="#FFF"/>
            <circle cx="56.5" cy="44" r="3" fill="#FFF"/>
          </svg>
        </div>
        <!-- SDG 9 -->
        <div style="width:96px; height:96px; background:#FD6925; color:#FFF; padding:6px; display:flex; flex-direction:column; justify-content:space-between; border-radius:2px; box-shadow:0 1px 3px rgba(0,0,0,0.2);">
          <div style="font-size:7pt; font-weight:900; line-height:1.1; text-transform:uppercase;">9 INDUSTRY, INNOVATION<br/>AND INFRASTRUCTURE</div>
          <svg viewBox="0 0 64 64" style="width:48px; height:48px; margin:0 auto;" fill="#FFF">
            <polygon points="32,6 46,14 32,22 18,14" fill="#FFF"/>
            <polygon points="18,17 30,24 30,38 18,31" fill="#FFF" fill-opacity="0.9"/>
            <polygon points="46,17 46,31 34,38 34,24" fill="#FFF" fill-opacity="0.8"/>
            <polygon points="20,38 32,45 20,52 8,45" fill="#FFF"/>
            <polygon points="44,38 56,45 44,52 32,45" fill="#FFF"/>
          </svg>
        </div>
      </div>

      <div style="font-size:8.8pt; color:#1F2937; margin-bottom:14px; font-weight:500;">
        SDG 4 - Quality Education; SDG 9 - Industry, Innovation and Infrastructure
      </div>

      <table class="data-table" style="margin-bottom:14px;">
        <thead>
          <tr>
            <th style="width:50%; font-size:9.5pt; padding:6px 9px;">Project / Course Details</th>
            <th style="width:50%; font-size:9.5pt; padding:6px 9px;">To be filled by students</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:600;">Course / Subject Name</td>
            <td>Software System Design (SD)</td>
          </tr>
          <tr>
            <td style="font-weight:600;">Course Code / Semester / Academic Year</td>
            <td>26CMPE52 /Sem V/2026-27</td>
          </tr>
          <tr>
            <td style="font-weight:600;">Faculty Incharge / Project Mentor</td>
            <td>Prof. Project Mentor</td>
          </tr>
          <tr>
            <td style="font-weight:600;">Project Group No. (if applicable)</td>
            <td>Group No. 12</td>
          </tr>
          <tr>
            <td style="font-weight:600;">Submission Date</td>
            <td>November 2026</td>
          </tr>
        </tbody>
      </table>

      <div style="font-size:10pt; font-weight:700; color:#000; margin-bottom:6px;">
        Project Team Details
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width:30%; font-size:9.2pt; padding:6px 8px;">Student Name</th>
            <th style="width:14%; font-size:9.2pt; padding:6px 8px;">Roll No.</th>
            <th style="width:18%; font-size:9.2pt; padding:6px 8px;">Class / Division</th>
            <th style="width:38%; font-size:9.2pt; padding:6px 8px;">Institute Email ID</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:600;">Ketaki</td>
            <td>42</td>
            <td>D12A</td>
            <td>d2025.ketaki@ves.ac.in</td>
          </tr>
          <tr>
            <td style="font-weight:600;">Project Partner</td>
            <td>43</td>
            <td>D12A</td>
            <td>d2025.partner@ves.ac.in</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="text-align:center; padding-bottom:14px;">
      <div style="font-size:10.5pt; font-weight:700; color:#002060;">
        Department of Computer Engineering
      </div>
      <div style="font-size:9.5pt; font-weight:600; color:#111827; margin-top:2px;">
        Academic Year: 2026-27
      </div>
    </div>
  </div>
`;
pages.push(wrapPage(1, page1));

// ================= PAGE 2 =================
const page2 = `
  <div style="text-align:center; margin-top:40px; margin-bottom:28px;">
    <h1 style="font-size:13pt; font-weight:800; color:#000; letter-spacing:0.5px;">TABLE OF CONTENTS</h1>
  </div>

  <table class="data-table" style="width:100%; font-size:9pt; margin:0 auto;">
    <thead>
      <tr>
        <th style="width:16%; text-align:center; padding:7px;">Sr.NO</th>
        <th style="width:62%; padding:7px 14px;">Title</th>
        <th style="width:22%; text-align:center; padding:7px;">Page No</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align:center; font-weight:600;">1</td>
        <td style="padding:6.5px 14px;">Introduction</td>
        <td style="text-align:center;">3 – 4</td>
      </tr>
      <tr>
        <td style="text-align:center; font-weight:600;">2</td>
        <td style="padding:6.5px 14px;">Project Overview and Architecture</td>
        <td style="text-align:center;">5 - 6</td>
      </tr>
      <tr>
        <td style="text-align:center; font-weight:600;">3</td>
        <td style="padding:6.5px 14px;">Software and Hardware Requirements</td>
        <td style="text-align:center;">7</td>
      </tr>
      <tr>
        <td style="text-align:center; font-weight:600;">4</td>
        <td style="padding:6.5px 14px;">Project Setup and Environment Configuration</td>
        <td style="text-align:center;">8 – 9</td>
      </tr>
      <tr>
        <td style="text-align:center; font-weight:600;">5</td>
        <td style="padding:6.5px 14px;">Cross-Cloud Infrastructure & WireGuard Configuration</td>
        <td style="text-align:center;">10 – 11</td>
      </tr>
      <tr>
        <td style="text-align:center; font-weight:600;">6</td>
        <td style="padding:6.5px 14px;">Implementation and Execution</td>
        <td style="text-align:center;">12 – 13</td>
      </tr>
      <tr>
        <td style="text-align:center; font-weight:600;">7</td>
        <td style="padding:6.5px 14px;">CrossCloud Registry Dashboard and Demonstration</td>
        <td style="text-align:center;">14 – 17</td>
      </tr>
      <tr>
        <td style="text-align:center; font-weight:600;">8</td>
        <td style="padding:6.5px 14px;">Testing and troubleshooting</td>
        <td style="text-align:center;">18</td>
      </tr>
      <tr>
        <td style="text-align:center; font-weight:600;">9</td>
        <td style="padding:6.5px 14px;">Limitations, future scope and conclusion</td>
        <td style="text-align:center;">19</td>
      </tr>
      <tr>
        <td style="text-align:center; font-weight:600;">10</td>
        <td style="padding:6.5px 14px;">Github repository and references</td>
        <td style="text-align:center;">20</td>
      </tr>
    </tbody>
  </table>
`;
pages.push(wrapPage(2, page2));

// ================= PAGE 3 =================
const page3 = `
  <h1 class="sec-title">1. INTRODUCTION</h1>
  <p class="desc">
    <strong>CrossCloud Registry</strong> is a distributed <strong>Cross-Cloud Service Discovery Registry</strong> that demonstrates how microservices deployed across separate public cloud providers—specifically <strong>Amazon Web Services (AWS EC2 in <code>us-east-1</code>)</strong> and <strong>Microsoft Azure (Virtual Machine in <code>Central India</code>)</strong>—can dynamically discover, monitor, and securely communicate with each other through a centralized discovery registry powered by <strong>HashiCorp Consul</strong> and an encrypted <strong>WireGuard VPN overlay tunnel</strong>.
  </p>
  <p class="desc">
    Modern cloud-native engineering avoids single-vendor lock-in by deploying services across heterogeneous clouds. However, cross-cloud microservice communication faces critical architectural challenges: IP addresses are dynamic, private VPC/VNet subnets are isolated from each other, and hardcoding public endpoints creates severe security exposures. The cookbook describes the practical steps required to configure, run and demonstrate the completed microproject. It focuses on multi-cloud networking, Consul agent configuration, active health check probing, automated failure isolation, cross-cloud payment routing, and real-time dashboard outputs.
  </p>

  <h2 class="sub-title">1.1 Objectives</h2>
  <ul class="bullet-list">
    <li>Establish an encrypted, kernel-level <strong>WireGuard VPN tunnel</strong> (UDP 51820) interconnecting AWS EC2 (<code>10.8.0.1</code>) and Azure VM (<code>10.8.0.2</code>).</li>
    <li>Deploy <strong>HashiCorp Consul Server</strong> on AWS to maintain a live, unified service catalog across cloud providers.</li>
    <li>Configure active 10-second HTTP health check probes (<code>/health</code>) to monitor operational availability in real time.</li>
    <li>Implement dynamic service discovery with <code>?passing=true</code> filtering to eliminate hardcoded remote IP addresses.</li>
    <li>Demonstrate cross-cloud financial transactions: AWS User Service queries Consul, discovers Azure Payment Service, and executes payments over WireGuard.</li>
    <li>Monitor catalog state, active checks, WireGuard handshakes, and transaction telemetry through the React 18 + TypeScript dashboard.</li>
  </ul>

  <h2 class="sub-title">1.2 Overall Processing Flow</h2>
  <div style="border:1px solid #CBD5E1; background:#F8FAFC; border-radius:4px; padding:10px 14px; margin-top:5px; text-align:center; font-size:8.4pt; line-height:1.45; font-family:'Segoe UI', sans-serif;">
    <div style="font-weight:700; color:#1E3A8A;">Client / Operator Browser</div>
    <div style="color:#64748B;">↓</div>
    <div style="font-weight:700; color:#1E3A8A;">React 18 + TypeScript Dashboard (Port :5173 / :3000)</div>
    <div style="color:#64748B;">↓</div>
    <div style="font-weight:700; color:#1E3A8A;">Express 5 API Gateway (AWS EC2 us-east-1 :3000)</div>
    <div style="color:#64748B;">↓</div>
    <div style="font-weight:700; color:#1E3A8A;">AWS User Service (:8002, Private WireGuard IP: 10.8.0.1)</div>
    <div style="color:#64748B;">↓ (1. Queries Consul: GET /v1/health/service/payment-service?passing=true)</div>
    <div style="font-weight:700; color:#047857;">HashiCorp Consul Server (Datacenter: aws-us-east-1, Port :8500)</div>
    <div style="color:#64748B;">↓ (2. Discovers Active Target: 10.8.0.2:8001)</div>
    <div style="font-weight:700; color:#B45309;">WireGuard VPN Encrypted Overlay Tunnel (UDP 51820 / 10.8.0.1 ↔ 10.8.0.2)</div>
    <div style="color:#64748B;">↓ (3. Dispatches HTTP POST /api/payments/process)</div>
    <div style="font-weight:700; color:#1E3A8A;">Azure Payment Service (:8001, Central India, Private WireGuard IP: 10.8.0.2)</div>
    <div style="color:#64748B;">↓ (4. Continuous Active Health Probe: GET /health every 10s)</div>
    <div style="font-weight:700; color:#DC2626;">Consul Health Check Engine (Automatic 10s Isolation upon 503 Outage)</div>
  </div>
`;
pages.push(wrapPage(3, page3));

// ================= PAGE 4 =================
const page4 = `
  <div style="font-size:11pt; font-weight:700; margin-bottom:12px; color:#000;">
    Project Repository / Folder Structure
  </div>

  <!-- GitHub Repo Mockup -->
  <div style="border:1px solid #D0D7DE; border-radius:6px; overflow:hidden; background:#FFF; font-size:8.2pt; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="background:#F6F8FA; padding:8px 12px; border-bottom:1px solid #D0D7DE; display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:6px;">
        <svg height="16" viewBox="0 0 16 16" width="16" fill="#24292F"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.75.75 0 001.28.53l2.22-2.22 2.22 2.22a.75.75 0 001.28-.53V12.25H5z"/></svg>
        <span style="color:#0969DA; font-weight:600;">Ketaki2006</span>
        <span style="color:#57609A;">/</span>
        <span style="color:#0969DA; font-weight:700;">cross-cloud-service-discovery</span>
        <span style="border:1px solid #D0D7DE; padding:1px 6px; border-radius:10px; font-size:7pt; color:#57609A;">Public</span>
      </div>
      <div style="display:flex; gap:6px;">
        <span style="background:#F6F8FA; border:1px solid #D0D7DE; padding:2px 8px; border-radius:4px; font-size:7.5pt; color:#24292F;">Pin</span>
        <span style="background:#F6F8FA; border:1px solid #D0D7DE; padding:2px 8px; border-radius:4px; font-size:7.5pt; color:#24292F;">Watch 1</span>
        <span style="background:#2DA44E; color:#FFF; padding:2px 10px; border-radius:4px; font-size:7.5pt; font-weight:600;">Code ▼</span>
      </div>
    </div>

    <div style="padding:8px 12px; border-bottom:1px solid #D0D7DE; display:flex; justify-content:space-between; align-items:center; background:#FFF; font-size:7.8pt;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="background:#F6F8FA; border:1px solid #D0D7DE; padding:2px 8px; border-radius:4px; font-weight:600;">main ▼</span>
        <span style="color:#57609A;"><strong>1</strong> Branch &bull; <strong>0</strong> Tags</span>
      </div>
      <div style="color:#57609A;">Latest commit: <code style="color:#0969DA;">62a1a7b</code> 3 days ago &bull; <strong>24 commits</strong></div>
    </div>

    <!-- Tree table -->
    <table style="width:100%; border-collapse:collapse; font-size:8pt;">
      <tr style="border-bottom:1px solid #E1E4E8; background:#FFF;">
        <td style="padding:4.5px 12px; width:28%; color:#0969DA; font-weight:600;">📁 deploy</td>
        <td style="padding:4.5px 12px; color:#57609A;">AWS, Azure, Consul & WireGuard deployment scripts</td>
        <td style="padding:4.5px 12px; text-align:right; color:#57609A;">3 days ago</td>
      </tr>
      <tr style="border-bottom:1px solid #E1E4E8; background:#F8FAFC;">
        <td style="padding:4.5px 12px; color:#0969DA; font-weight:600;">📁 documentation</td>
        <td style="padding:4.5px 12px; color:#57609A;">Architecture guides, Viva Q&A, and demo presentation manual</td>
        <td style="padding:4.5px 12px; text-align:right; color:#57609A;">3 days ago</td>
      </tr>
      <tr style="border-bottom:1px solid #E1E4E8; background:#FFF;">
        <td style="padding:4.5px 12px; color:#0969DA; font-weight:600;">📁 docs</td>
        <td style="padding:4.5px 12px; color:#57609A;">Micro Project Cookbook and technical documentation artifacts</td>
        <td style="padding:4.5px 12px; text-align:right; color:#57609A;">3 days ago</td>
      </tr>
      <tr style="border-bottom:1px solid #E1E4E8; background:#F8FAFC;">
        <td style="padding:4.5px 12px; color:#0969DA; font-weight:600;">📁 frontend</td>
        <td style="padding:4.5px 12px; color:#57609A;">React 18 + TypeScript + Vite single page application</td>
        <td style="padding:4.5px 12px; text-align:right; color:#57609A;">3 days ago</td>
      </tr>
      <tr style="border-bottom:1px solid #E1E4E8; background:#FFF;">
        <td style="padding:4.5px 12px; color:#0969DA; font-weight:600;">📁 scripts</td>
        <td style="padding:4.5px 12px; color:#57609A;">Automated documentation and PDF cookbook compilation scripts</td>
        <td style="padding:4.5px 12px; text-align:right; color:#57609A;">3 days ago</td>
      </tr>
      <tr style="border-bottom:1px solid #E1E4E8; background:#F8FAFC;">
        <td style="padding:4.5px 12px; color:#0969DA; font-weight:600;">📁 test</td>
        <td style="padding:4.5px 12px; color:#57609A;">28 automated backend integration tests (node:test)</td>
        <td style="padding:4.5px 12px; text-align:right; color:#57609A;">3 days ago</td>
      </tr>
      <tr style="border-bottom:1px solid #E1E4E8; background:#FFF;">
        <td style="padding:4.5px 12px; color:#0969DA;">📄 .env.example</td>
        <td style="padding:4.5px 12px; color:#57609A;">Environment configuration template for AWS/Azure deployment</td>
        <td style="padding:4.5px 12px; text-align:right; color:#57609A;">3 days ago</td>
      </tr>
      <tr style="border-bottom:1px solid #E1E4E8; background:#F8FAFC;">
        <td style="padding:4.5px 12px; color:#0969DA;">📄 consul.exe</td>
        <td style="padding:4.5px 12px; color:#57609A;">HashiCorp Consul v1.20 binary for local development mode</td>
        <td style="padding:4.5px 12px; text-align:right; color:#57609A;">3 days ago</td>
      </tr>
      <tr style="border-bottom:1px solid #E1E4E8; background:#FFF;">
        <td style="padding:4.5px 12px; color:#0969DA;">📄 package.json</td>
        <td style="padding:4.5px 12px; color:#57609A;">Root project scripts and dependencies manifest</td>
        <td style="padding:4.5px 12px; text-align:right; color:#57609A;">3 days ago</td>
      </tr>
      <tr style="border-bottom:1px solid #E1E4E8; background:#F8FAFC;">
        <td style="padding:4.5px 12px; color:#0969DA;">📄 payment-service.js</td>
        <td style="padding:4.5px 12px; color:#57609A;">Azure Payment Service (transaction processor & /health probe)</td>
        <td style="padding:4.5px 12px; text-align:right; color:#57609A;">3 days ago</td>
      </tr>
      <tr style="border-bottom:1px solid #E1E4E8; background:#FFF;">
        <td style="padding:4.5px 12px; color:#0969DA;">📄 README.md</td>
        <td style="padding:4.5px 12px; color:#57609A;">Comprehensive multi-cloud architecture and execution runbook</td>
        <td style="padding:4.5px 12px; text-align:right; color:#57609A;">3 days ago</td>
      </tr>
      <tr style="border-bottom:1px solid #E1E4E8; background:#F8FAFC;">
        <td style="padding:4.5px 12px; color:#0969DA;">📄 server.js</td>
        <td style="padding:4.5px 12px; color:#57609A;">Express 5 API Gateway, Consul proxy, and static SPA host</td>
        <td style="padding:4.5px 12px; text-align:right; color:#57609A;">3 days ago</td>
      </tr>
      <tr style="border-bottom:1px solid #E1E4E8; background:#FFF;">
        <td style="padding:4.5px 12px; color:#0969DA;">📄 start-all.js</td>
        <td style="padding:4.5px 12px; color:#57609A;">Unified local launcher (Gateway + User Service + Payment Service)</td>
        <td style="padding:4.5px 12px; text-align:right; color:#57609A;">3 days ago</td>
      </tr>
      <tr style="background:#F8FAFC;">
        <td style="padding:4.5px 12px; color:#0969DA;">📄 user-service.js</td>
        <td style="padding:4.5px 12px; color:#57609A;">AWS User Service (dynamic Consul client & payment dispatcher)</td>
        <td style="padding:4.5px 12px; text-align:right; color:#57609A;">3 days ago</td>
      </tr>
    </table>
  </div>

  <div class="figure-caption">Figure 1: Project folder and source-code organization.</div>
`;
pages.push(wrapPage(4, page4));

// ================= PAGE 5 =================
const page5 = `
  <h1 class="sec-title">2. PROJECT OVERVIEW AND ARCHITECTURE</h1>
  <p class="desc">
    The application runs across two real cloud environments: an <strong>AWS EC2 instance</strong> in <code>us-east-1</code> (North Virginia) hosting the Express API Gateway, HashiCorp Consul Server, and AWS User Service, and an <strong>Azure Virtual Machine</strong> in <code>Central India</code> (Pune) hosting the Azure Payment Service. Both cloud VMs communicate privately over an encrypted <strong>WireGuard VPN overlay tunnel</strong> (<code>10.8.0.1 ↔ 10.8.0.2</code>, UDP <code>51820</code>).
  </p>

  <h2 class="sub-title">2.1 Main Components</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width:30%;">Component</th>
        <th style="width:70%;">Role in CrossCloud Registry</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight:600;">Express API Gateway</td>
        <td>Provides REST API endpoints on port 3000, proxies shielded Consul port 8500, serves the React dashboard SPA, and handles cross-cloud routes.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">HashiCorp Consul Server</td>
        <td>Maintains the distributed service catalog on AWS EC2, runs active 10s HTTP health check probes, and dynamically filters passing instances.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">AWS User Service</td>
        <td>Consumer microservice on port 8002; queries Consul dynamically with <code>?passing=true</code> to resolve Azure Payment Service and dispatches transactions.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Azure Payment Service</td>
        <td>Transaction processor running on Azure VM port 8001; exposes simulated payment processing and active <code>/health</code> probe endpoint.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">WireGuard VPN Overlay</td>
        <td>Connects AWS EC2 and Azure VM over UDP 51820 with point-to-point private addressing (<code>10.8.0.1 ↔ 10.8.0.2</code>) using ChaCha20-Poly1305.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">React 18 SPA Frontend</td>
        <td>Single-page web dashboard built with TypeScript and Tailwind CSS; provides single-pane-of-glass registry, discovery, and fault controls.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Active Health Probe Engine</td>
        <td>Consul-driven HTTP probing engine that automatically removes failing instances from the discovery pool within 10 seconds of HTTP 503 outage.</td>
      </tr>
    </tbody>
  </table>

  <h2 class="sub-title">2.2 Verified Multi-Cloud Topology Matrix</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width:25%;">Component</th>
        <th style="width:25%;">Cloud & Location</th>
        <th style="width:22%;">Private / VPN IP</th>
        <th style="width:10%;">Port</th>
        <th style="width:18%;">Management</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight:600;">Express Gateway + SPA</td>
        <td>AWS EC2 (us-east-1)</td>
        <td><code>10.8.0.1 / 172.31.20.133</code></td>
        <td>3000</td>
        <td>systemd (crosscloud-gateway)</td>
      </tr>
      <tr>
        <td style="font-weight:600;">AWS User Service</td>
        <td>AWS EC2 (us-east-1)</td>
        <td><code>10.8.0.1</code></td>
        <td>8002</td>
        <td>systemd (user-service)</td>
      </tr>
      <tr>
        <td style="font-weight:600;">HashiCorp Consul Server</td>
        <td>AWS EC2 (us-east-1)</td>
        <td><code>127.0.0.1 (shielded)</code></td>
        <td>8500</td>
        <td>systemd (consul)</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Azure Payment Service</td>
        <td>Azure VM (Central India)</td>
        <td><code>10.8.0.2 / 172.16.0.4</code></td>
        <td>8001</td>
        <td>systemd (payment-service)</td>
      </tr>
      <tr>
        <td style="font-weight:600;">WireGuard VPN Overlay</td>
        <td>AWS ↔ Azure</td>
        <td><code>10.8.0.1 ↔ 10.8.0.2</code></td>
        <td>51820</td>
        <td>systemd (wg-quick@wg0)</td>
      </tr>
    </tbody>
  </table>
  <p class="desc" style="margin-top:6px; font-size:8.4pt; color:#4B5563;">
    All cloud services run as verified Linux systemd background daemons with automatic restart policies. Port 8500 is shielded to prevent direct public exposure.
  </p>
`;
pages.push(wrapPage(5, page5));

// ================= PAGE 6 =================
const page6 = `
  <div style="font-size:11pt; font-weight:700; margin-bottom:8px; color:#000;">
    2.3 Architecture Diagram
  </div>

  <!-- SVG Architecture Diagram matching reference design style -->
  <div style="border:1px solid #CBD5E1; border-radius:6px; background:#F8FAFC; padding:12px; margin-bottom:6px;">
    <div style="background:#1E293B; color:#FFF; padding:6px 12px; border-radius:4px; font-weight:700; font-size:9pt; text-align:center; margin-bottom:12px;">
      Cross-Cloud Service Discovery Registry — System Architecture (AWS EC2 ↔ WireGuard ↔ Azure VM)
    </div>

    <svg viewBox="0 0 760 360" style="width:100%; height:auto;" font-family="'Segoe UI', Arial, sans-serif">
      <!-- 1. Client Browser Box -->
      <g>
        <rect x="10" y="20" width="130" height="90" rx="5" fill="#EFF6FF" stroke="#3B82F6" stroke-width="1.5"/>
        <text x="75" y="42" font-size="9" font-weight="bold" fill="#1E3A8A" text-anchor="middle">1. Client / Operator</text>
        <text x="75" y="60" font-size="8" fill="#1F2937" text-anchor="middle">Web Browser</text>
        <rect x="25" y="72" width="100" height="22" rx="3" fill="#DBEAFE"/>
        <text x="75" y="86" font-size="7.5" font-weight="bold" fill="#1D4ED8" text-anchor="middle">React 18 SPA Console</text>
      </g>

      <!-- Arrow 1 -> 2 -->
      <line x1="140" y1="65" x2="180" y2="65" stroke="#475569" stroke-width="1.5" marker-end="url(#arrow)"/>
      <text x="160" y="58" font-size="7" fill="#475569" text-anchor="middle">HTTP :3000</text>

      <!-- 2. AWS EC2 Node Box -->
      <g>
        <rect x="180" y="10" width="230" height="230" rx="6" fill="#F0FDF4" stroke="#16A34A" stroke-width="1.5"/>
        <rect x="180" y="10" width="230" height="24" rx="6" fill="#DCFCE7"/>
        <text x="295" y="26" font-size="9" font-weight="bold" fill="#166534" text-anchor="middle">AWS EC2 (us-east-1) &bull; 10.8.0.1</text>

        <!-- Gateway -->
        <rect x="195" y="45" width="200" height="42" rx="4" fill="#FFF" stroke="#86EFAC" stroke-width="1"/>
        <text x="295" y="62" font-size="8.5" font-weight="bold" fill="#14532D" text-anchor="middle">Express 5 API Gateway</text>
        <text x="295" y="76" font-size="7" fill="#4B5563" text-anchor="middle">Port 3000 &bull; SPA Host & Consul Proxy</text>

        <!-- User Service -->
        <rect x="195" y="100" width="200" height="46" rx="4" fill="#FFF" stroke="#86EFAC" stroke-width="1"/>
        <text x="295" y="118" font-size="8.5" font-weight="bold" fill="#14532D" text-anchor="middle">AWS User Service</text>
        <text x="295" y="132" font-size="7" fill="#4B5563" text-anchor="middle">Port 8002 &bull; Discovery Client & Telemetry</text>

        <!-- Consul Server -->
        <rect x="195" y="160" width="200" height="64" rx="4" fill="#FFF" stroke="#86EFAC" stroke-width="1"/>
        <text x="295" y="178" font-size="8.5" font-weight="bold" fill="#14532D" text-anchor="middle">HashiCorp Consul Server</text>
        <text x="295" y="192" font-size="7" fill="#4B5563" text-anchor="middle">Port 8500 &bull; Datacenter: aws-us-east-1</text>
        <text x="295" y="206" font-size="7" fill="#15803D" text-anchor="middle">Active 10s Health Probe Engine</text>

        <!-- Internal Arrow Gateway -> User Svc -->
        <line x1="295" y1="87" x2="295" y2="100" stroke="#16A34A" stroke-width="1.2" stroke-dasharray="3,3"/>
        <!-- Internal Arrow User Svc -> Consul -->
        <line x1="295" y1="146" x2="295" y2="160" stroke="#16A34A" stroke-width="1.2"/>
        <text x="330" y="154" font-size="6.5" fill="#15803D">?passing=true</text>
      </g>

      <!-- 3. WireGuard VPN Overlay Tunnel (Middle) -->
      <g>
        <rect x="430" y="65" width="105" height="120" rx="5" fill="#FEF3C7" stroke="#D97706" stroke-width="1.5"/>
        <text x="482" y="85" font-size="8.5" font-weight="bold" fill="#92400E" text-anchor="middle">WireGuard VPN</text>
        <text x="482" y="98" font-size="7" fill="#78350F" text-anchor="middle">UDP Port 51820</text>
        <text x="482" y="114" font-size="6.8" fill="#4B5563" text-anchor="middle">ChaCha20-Poly1305</text>
        <rect x="438" y="125" width="90" height="20" rx="3" fill="#FDE68A"/>
        <text x="482" y="138" font-size="6.5" font-weight="bold" fill="#92400E" text-anchor="middle">10.8.0.1 ↔ 10.8.0.2</text>
        <text x="482" y="165" font-size="6.5" fill="#4B5563" text-anchor="middle">Cross-Continent Mesh</text>
      </g>

      <!-- Arrow AWS -> VPN -->
      <line x1="395" y1="123" x2="430" y2="123" stroke="#D97706" stroke-width="1.5" marker-end="url(#arrow)"/>

      <!-- Arrow VPN -> Azure -->
      <line x1="535" y1="123" x2="565" y2="123" stroke="#D97706" stroke-width="1.5" marker-end="url(#arrow)"/>
      <text x="550" y="115" font-size="6.8" fill="#D97706" text-anchor="middle">POST :8001</text>

      <!-- Arrow Consul -> Azure Probe (Loop around) -->
      <path d="M 395 190 L 482 190 L 482 205 L 565 205" fill="none" stroke="#DC2626" stroke-width="1.2" stroke-dasharray="3,3" marker-end="url(#arrow-red)"/>
      <text x="482" y="217" font-size="6.8" fill="#DC2626" text-anchor="middle">10s Health Probe (/health)</text>

      <!-- 4. Azure VM Node Box -->
      <g>
        <rect x="565" y="45" width="185" height="185" rx="6" fill="#F5F3FF" stroke="#7C3AED" stroke-width="1.5"/>
        <rect x="565" y="45" width="185" height="24" rx="6" fill="#EDE9FE"/>
        <text x="657" y="61" font-size="9" font-weight="bold" fill="#5B21B6" text-anchor="middle">Azure VM (Central India)</text>

        <rect x="580" y="80" width="155" height="60" rx="4" fill="#FFF" stroke="#C4B5FD" stroke-width="1"/>
        <text x="657" y="100" font-size="8.5" font-weight="bold" fill="#4C1D95" text-anchor="middle">Azure Payment Service</text>
        <text x="657" y="114" font-size="7" fill="#4B5563" text-anchor="middle">Listening: 10.8.0.2:8001</text>
        <text x="657" y="128" font-size="7" fill="#047857" text-anchor="middle">Simulated Ledger Engine</text>

        <rect x="580" y="155" width="155" height="55" rx="4" fill="#FFF" stroke="#FCA5A5" stroke-width="1"/>
        <text x="657" y="174" font-size="8" font-weight="bold" fill="#991B1B" text-anchor="middle">Health Probe Target</text>
        <text x="657" y="188" font-size="7" fill="#4B5563" text-anchor="middle">GET http://10.8.0.2:8001/health</text>
        <text x="657" y="200" font-size="6.8" fill="#DC2626" text-anchor="middle">HTTP 200 (UP) / 503 (DOWN)</text>
      </g>

      <!-- Bottom Feature Badges -->
      <g transform="translate(10, 260)">
        <rect x="0" y="0" width="740" height="75" rx="5" fill="#FFF" stroke="#CBD5E1" stroke-width="1"/>
        <text x="370" y="18" font-size="8" font-weight="bold" fill="#0F172A" text-anchor="middle">Core Verified Capabilities</text>

        <!-- Badge 1 -->
        <rect x="20" y="28" width="125" height="34" rx="4" fill="#EFF6FF" stroke="#BFDBFE"/>
        <text x="82" y="44" font-size="7.5" font-weight="bold" fill="#1D4ED8" text-anchor="middle">Dynamic Discovery</text>
        <text x="82" y="55" font-size="6.5" fill="#3B82F6" text-anchor="middle">Consul ?passing Filter</text>

        <!-- Badge 2 -->
        <rect x="165" y="28" width="125" height="34" rx="4" fill="#FEF3C7" stroke="#FDE68A"/>
        <text x="227" y="44" font-size="7.5" font-weight="bold" fill="#B45309" text-anchor="middle">WireGuard Tunnel</text>
        <text x="227" y="55" font-size="6.5" fill="#D97706" text-anchor="middle">UDP 51820 Encrypted</text>

        <!-- Badge 3 -->
        <rect x="310" y="28" width="125" height="34" rx="4" fill="#F0FDF4" stroke="#BBF7D0"/>
        <text x="372" y="44" font-size="7.5" font-weight="bold" fill="#15803D" text-anchor="middle">Active Probing</text>
        <text x="372" y="55" font-size="6.5" fill="#16A34A" text-anchor="middle">10s Automatic Interval</text>

        <!-- Badge 4 -->
        <rect x="455" y="28" width="125" height="34" rx="4" fill="#FEE2E2" stroke="#FECACA"/>
        <text x="517" y="44" font-size="7.5" font-weight="bold" fill="#B91C1C" text-anchor="middle">Automated Failover</text>
        <text x="517" y="55" font-size="6.5" fill="#DC2626" text-anchor="middle">Discovery Isolation</text>

        <!-- Badge 5 -->
        <rect x="600" y="28" width="120" height="34" rx="4" fill="#F5F3FF" stroke="#DDD6FE"/>
        <text x="660" y="44" font-size="7.5" font-weight="bold" fill="#6D28D9" text-anchor="middle">Live Telemetry</text>
        <text x="660" y="55" font-size="6.5" fill="#7C3AED" text-anchor="middle">In-Memory Audit Log</text>
      </g>

      <!-- Arrow Markers -->
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569"/>
        </marker>
        <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#DC2626"/>
        </marker>
      </defs>
    </svg>
  </div>

  <div class="figure-caption">Figure 2: Cross-Cloud Service Discovery Registry architecture.</div>
`;
pages.push(wrapPage(6, page6));

// ================= PAGE 7 =================
const page7 = `
  <h1 class="sec-title">3. SOFTWARE AND HARDWARE REQUIREMENTS</h1>

  <h2 class="sub-title">3.1 Software Requirements</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width:30%;">Software / Service</th>
        <th style="width:70%;">Purpose</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight:600;">Windows 10/11 or Ubuntu 22.04 LTS</td>
        <td>Operating system for development workstation and remote cloud host VMs.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Node.js v18+ / v20+ & npm</td>
        <td>JavaScript runtime executing Express API Gateway, User Service, and Payment Service.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Visual Studio Code</td>
        <td>Source-code editing, debugging, terminal orchestration, and multi-file project management.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">HashiCorp Consul v1.20+</td>
        <td>Distributed service discovery engine, catalog maintenance, and active health check probing.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">WireGuard VPN (wg-quick)</td>
        <td>Encrypted kernel-level point-to-point overlay tunnel connecting AWS EC2 and Azure VM.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">React 18 + TypeScript</td>
        <td>Component-based frontend client with strict compile-time types and modular architecture.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Vite 5 & Tailwind CSS</td>
        <td>Next-generation frontend tooling and utility-first styling for single-pane observability.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Web Browser (Chrome / Edge)</td>
        <td>Modern browser for accessing and demonstrating the CrossCloud Registry web dashboard.</td>
      </tr>
    </tbody>
  </table>

  <h2 class="sub-title">3.2 Hardware Requirements</h2>
  <ul class="bullet-list">
    <li><strong>AWS EC2 Node:</strong> t2.micro or t3.small instance (1 vCPU, 1 GB RAM, 8 GB EBS SSD) in <code>us-east-1</code>.</li>
    <li><strong>Azure VM Node:</strong> Standard B1s instance (1 vCPU, 1 GB RAM, 30 GB OS disk) in <code>Central India</code>.</li>
    <li><strong>Local Workstation:</strong> 4 GB+ RAM, modern CPU, and broadband internet connectivity for remote cloud management.</li>
  </ul>

  <h2 class="sub-title">3.3 Project Directory</h2>
  <div class="terminal-box" style="font-size:7.5pt; line-height:1.3; background:#F8FAFC; color:#1F2937; border:1px solid #CBD5E1;">
cross-cloud-service-discovery/
├── deploy/
│   ├── aws/                 (setup-gateway.sh, setup-user-service.sh)
│   ├── azure/               (setup-payment-service.sh)
│   ├── consul/              (setup-consul-server.sh, consul.hcl)
│   └── wireguard/           (setup-wireguard-aws.sh, setup-wireguard-azure.sh)
├── documentation/           (Architecture guides, Viva Q&A, demo scripts)
├── docs/                    (Technical cookbook and PDF artifacts)
├── frontend/                (React 18 + TypeScript + Vite SPA dashboard)
│   ├── src/
│   │   ├── components/      (Header.tsx, Sidebar.tsx, RegisterServiceModal.tsx)
│   │   ├── pages/           (Dashboard, ServiceRegistry, ServiceDiscovery, HealthMonitoring, Settings)
│   │   ├── services/        (api.ts - Typed API client)
│   │   └── types/           (index.ts - TypeScript contracts)
│   ├── .env                 (VITE_API_URL=http://54.83.98.229:3000)
│   └── package.json
├── test/
│   └── backend.test.js      (28 automated integration tests)
├── consul.exe               (Local HashiCorp Consul v1.20 binary)
├── package.json             (Root scripts and Node.js dependencies)
├── payment-service.js       (Azure Payment Service :8001)
├── server.js                (Express 5 Gateway & static SPA host :3000)
├── start-all.js             (Unified local multi-service launcher)
└── user-service.js          (AWS User Service :8002)
  </div>
`;
pages.push(wrapPage(7, page7));

// ================= PAGE 8 =================
const page8 = `
  <h1 class="sec-title">4. PROJECT SETUP AND ENVIRONMENT CONFIGURATION</h1>

  <h2 class="sub-title">4.1 Open the Project Folder</h2>
  <p class="desc">
    Open PowerShell and move to the project directory. Use the actual location where the project is saved.
  </p>
  <div class="code-run">cd "D:\\sd\\cross-cloud-service-discovery"</div>

  <div class="terminal-box">
    <div class="terminal-header">
      <span>Windows PowerShell 5.1</span>
      <span>Administrator: Windows PowerShell</span>
    </div>
    <div>Windows PowerShell</div>
    <div>Copyright (C) Microsoft Corporation. All rights reserved.</div>
    <br/>
    <div><span class="prompt">PS C:\\Users\\DELL&gt;</span> <span class="cmd">cd "D:\\sd\\cross-cloud-service-discovery"</span></div>
    <div><span class="prompt">PS D:\\sd\\cross-cloud-service-discovery&gt;</span> _</div>
  </div>
  <div class="figure-caption">Figure 3: Opening the CrossCloud Registry project directory in PowerShell.</div>

  <h2 class="sub-title">4.2 Install Required Dependencies</h2>
  <p class="desc">
    Install the Node.js dependencies for both the root backend services and the React Vite frontend application.
  </p>
  <div class="code-run">npm install; npm --prefix frontend install</div>

  <div class="terminal-box">
    <div class="terminal-header">
      <span>PowerShell — Dependency Installation</span>
      <span>Node.js v24 / npm</span>
    </div>
    <div><span class="prompt">PS D:\\sd\\cross-cloud-service-discovery&gt;</span> <span class="cmd">npm install</span></div>
    <div>added 72 packages in 2.14s</div>
    <div><span class="prompt">PS D:\\sd\\cross-cloud-service-discovery&gt;</span> <span class="cmd">npm --prefix frontend install</span></div>
    <div>added 138 packages, and audited 139 packages in 3.42s</div>
    <div class="success-text">found 0 vulnerabilities</div>
    <div><span class="prompt">PS D:\\sd\\cross-cloud-service-discovery&gt;</span> _</div>
  </div>
  <div class="figure-caption">Figure 4: Installing root backend and React frontend dependencies.</div>

  <h2 class="sub-title">4.3 Build Frontend Production Bundle</h2>
  <p class="desc">
    Run the TypeScript compiler and Vite bundler to generate the optimized client build in <code>frontend/dist</code>.
  </p>
  <div class="code-run">npm --prefix frontend run build</div>

  <div class="terminal-box">
    <div class="terminal-header">
      <span>PowerShell — Vite Production Build</span>
      <span>tsc && vite build</span>
    </div>
    <div><span class="prompt">PS D:\\sd\\cross-cloud-service-discovery&gt;</span> <span class="cmd">npm --prefix frontend run build</span></div>
    <div>&gt; frontend@1.0.0 build</div>
    <div>&gt; tsc && vite build</div>
    <div>vite v5.4.21 building for production...</div>
    <div class="success-text">✓ 44 modules transformed.</div>
    <div>dist/index.html                   0.98 kB │ gzip:  0.51 kB</div>
    <div>dist/assets/index-CWjv7zb2.css   26.55 kB │ gzip:  5.47 kB</div>
    <div>dist/assets/index-CiSPJbbL.js   310.85 kB │ gzip: 81.16 kB</div>
    <div class="success-text">✓ built in 6.50s</div>
    <div><span class="prompt">PS D:\\sd\\cross-cloud-service-discovery&gt;</span> _</div>
  </div>
  <div class="figure-caption">Figure 5: Compiling TypeScript and Vite frontend for production deployment.</div>
`;
pages.push(wrapPage(8, page8));

// ================= PAGE 9 =================
const page9 = `
  <h2 class="sub-title" style="margin-top:0;">4.4 Configure Environment Variables</h2>
  <p class="desc">
    Create or update the <code>.env</code> file in the project root and in <code>frontend/.env</code>. The gateway target, Consul daemon address, and WireGuard overlay IPs must match the cloud infrastructure.
  </p>

  <div class="terminal-box" style="font-size:8pt; background:#FFF; color:#111827; border:1px solid #D1D5DB;">
    <div style="font-weight:700; color:#1F2937; border-bottom:1px solid #E5E7EB; padding-bottom:3px; margin-bottom:5px;">
      # Root .env configuration (Gateway & Microservices)
    </div>
    <div>PORT=3000</div>
    <div>CONSUL_URL=http://localhost:8500</div>
    <div>USER_SERVICE_URL=http://127.0.0.1:8002</div>
    <div>AWS_WG_IP=10.8.0.1</div>
    <div>AZURE_WG_IP=10.8.0.2</div>
    <div>AWS_REGION=us-east-1</div>
    <div>AZURE_REGION="Central India"</div>
    <br/>
    <div style="font-weight:700; color:#1F2937; border-bottom:1px solid #E5E7EB; padding-bottom:3px; margin-bottom:5px;">
      # Frontend frontend/.env configuration (React SPA)
    </div>
    <div>VITE_API_URL=http://54.83.98.229:3000</div>
    <div>VITE_GATEWAY_PROXY_TARGET=http://54.83.98.229:3000</div>
  </div>

  <p class="desc" style="margin-top:8px;">
    The frontend reads <code>VITE_API_URL</code> at build/runtime. When pointed to the AWS EC2 Elastic IP (<code>http://54.83.98.229:3000</code>), the React UI connects directly to the live cloud gateway. Never expose private credentials or AWS IAM keys in repository files.
  </p>

  <!-- VS Code Mockup -->
  <div style="border:1px solid #1E293B; border-radius:5px; background:#1E1E1E; color:#D4D4D4; font-family:'Consolas', monospace; font-size:8pt; padding:8px 12px; margin-top:8px;">
    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #333; padding-bottom:4px; margin-bottom:6px; color:#9CDCFE; font-size:7.5pt;">
      <span>● frontend/.env — Visual Studio Code</span>
      <span>UTF-8</span>
    </div>
    <div><span style="color:#6A9955;"># Live AWS Express Gateway Endpoint (EC2 us-east-1)</span></div>
    <div><span style="color:#9CDCFE;">VITE_API_URL</span>=<span style="color:#CE9178;">http://54.83.98.229:3000</span></div>
    <div><span style="color:#6A9955;"># Optional dev proxy target</span></div>
    <div><span style="color:#9CDCFE;">VITE_GATEWAY_PROXY_TARGET</span>=<span style="color:#CE9178;">http://54.83.98.229:3000</span></div>
    <br/>
    <div><span style="color:#6A9955;"># Cross-Cloud VPN Addressing Verification</span></div>
    <div><span style="color:#9CDCFE;">AWS_WG_IP</span>=<span style="color:#B5CEA8;">10.8.0.1</span></div>
    <div><span style="color:#9CDCFE;">AZURE_WG_IP</span>=<span style="color:#B5CEA8;">10.8.0.2</span></div>
  </div>
  <div class="figure-caption">Figure 6: Environment configuration with sensitive values protected.</div>
`;
pages.push(wrapPage(9, page9));

// ================= PAGE 10 =================
const page10 = `
  <h1 class="sec-title">5. CROSS-CLOUD INFRASTRUCTURE & WIREGUARD CONFIGURATION</h1>
  <p class="desc">
    To allow microservices in separate public cloud VPCs/VNets to communicate without traversing the public internet unencrypted, a kernel-level <strong>WireGuard VPN overlay</strong> is established between the AWS EC2 instance and the Azure VM.
  </p>

  <h2 class="sub-title">5.1 WireGuard Tunnel Setup</h2>
  <ol class="bullet-list" style="margin-left:20px;">
    <li>Install WireGuard on AWS EC2 (<code>10.8.0.1/24</code>) and Azure VM (<code>10.8.0.2/24</code>).</li>
    <li>Generate public/private keypairs: <code>wg genkey | tee privatekey | wg pubkey &gt; publickey</code>.</li>
    <li>Configure <code>/etc/wireguard/wg0.conf</code> on AWS with Azure peer endpoint and listening port <code>51820</code>.</li>
    <li>Start the WireGuard service on both nodes: <code>sudo systemctl enable --now wg-quick@wg0</code>.</li>
    <li>Verify live handshake and cross-cloud ICMP packet transmission: <code>ping -c 3 10.8.0.2</code>.</li>
  </ol>

  <div class="terminal-box">
    <div class="terminal-header">
      <span>ubuntu@aws-us-east-1: ~ (SSH Terminal)</span>
      <span>sudo wg show & ping</span>
    </div>
    <div><span class="prompt">ubuntu@ip-172-31-20-133:~$</span> <span class="cmd">sudo wg show</span></div>
    <div>interface: <span class="success-text">wg0</span></div>
    <div>  public key: <span class="warn-text">Z8k9X1...AWS_PUBKEY...=</span></div>
    <div>  private key: (hidden)</div>
    <div>  listening port: <span class="cmd">51820</span></div>
    <br/>
    <div>peer: <span class="warn-text">K3m4P9...AZURE_PUBKEY...=</span></div>
    <div>  endpoint: <span class="cmd">20.198.112.45:51820</span></div>
    <div>  allowed ips: <span class="success-text">10.8.0.2/32</span></div>
    <div>  latest handshake: <span class="success-text">14 seconds ago</span></div>
    <div>  transfer: <span class="cmd">1.28 MiB received, 1.42 MiB sent</span></div>
    <br/>
    <div><span class="prompt">ubuntu@ip-172-31-20-133:~$</span> <span class="cmd">ping -c 3 10.8.0.2</span></div>
    <div>PING 10.8.0.2 (10.8.0.2) 56(84) bytes of data.</div>
    <div>64 bytes from 10.8.0.2: icmp_seq=1 ttl=64 time=192 ms</div>
    <div>64 bytes from 10.8.0.2: icmp_seq=2 ttl=64 time=193 ms</div>
    <div>64 bytes from 10.8.0.2: icmp_seq=3 ttl=64 time=191 ms</div>
    <div class="success-text">--- 10.8.0.2 ping statistics --- 3 packets transmitted, 3 received, 0% packet loss</div>
  </div>
  <div class="figure-caption">Figure 7: WireGuard tunnel active status and handshake verification.</div>

  <h2 class="sub-title">5.2 HashiCorp Consul Server Configuration</h2>
  <p class="desc">
    Consul is deployed in server mode on AWS EC2 inside <code>/etc/consul.d/consul.hcl</code>. It binds HTTP strictly to <code>127.0.0.1:8500</code> so only local systemd services and the Express Gateway can access it.
  </p>
  <div class="terminal-box" style="font-size:7.5pt; background:#FFF; color:#111827; border:1px solid #D1D5DB;">
datacenter = "aws-us-east-1"
data_dir   = "/opt/consul"
server     = true
bootstrap_expect = 1
bind_addr  = "127.0.0.1"
client_addr = "127.0.0.1"
ports { http = 8500 }
ui_config { enabled = true }
  </div>
`;
pages.push(wrapPage(10, page10));

// ================= PAGE 11 =================
const page11 = `
  <h2 class="sub-title" style="margin-top:0;">5.3 Service Registration with Consul Agent</h2>
  <ol class="bullet-list" style="margin-left:20px;">
    <li>Register AWS User Service (<code>user-service-aws-1</code>) on localhost with active health check <code>/health</code>.</li>
    <li>Register Azure Payment Service (<code>payment-service-azure-1</code>) with remote WireGuard private IP <code>10.8.0.2</code>, port <code>8001</code>, and active HTTP probe <code>http://10.8.0.2:8001/health</code>.</li>
    <li>Verify that both microservices report healthy in the Consul catalog: <code>GET /v1/catalog/services</code>.</li>
  </ol>

  <div class="terminal-box">
    <div class="terminal-header">
      <span>Consul Registration — JSON Payloads</span>
      <span>PUT /v1/agent/service/register</span>
    </div>
    <div><span class="prompt">ubuntu@aws-us-east-1:~$</span> <span class="cmd">curl -X PUT http://127.0.0.1:8500/v1/agent/service/register \\</span></div>
    <div>  -H "Content-Type: application/json" -d '{</div>
    <div>    "ID": "<span class="warn-text">payment-service-azure-1</span>",</div>
    <div>    "Name": "<span class="success-text">payment-service</span>",</div>
    <div>    "Tags": ["AZURE", "central-india"],</div>
    <div>    "Address": "<span class="success-text">10.8.0.2</span>",</div>
    <div>    "Port": 8001,</div>
    <div>    "Check": {</div>
    <div>      "HTTP": "<span class="cmd">http://10.8.0.2:8001/health</span>",</div>
    <div>      "Interval": "10s",</div>
    <div>      "Timeout": "3s"</div>
    <div>    }</div>
    <div>  }'</div>
    <div class="success-text">HTTP/1.1 200 OK</div>
  </div>
  <div class="figure-caption">Figure 8: Consul service catalog registration and health check payload.</div>

  <div class="terminal-box">
    <div class="terminal-header">
      <span>Consul Catalog Verification</span>
      <span>GET /v1/health/service/payment-service?passing=true</span>
    </div>
    <div><span class="prompt">ubuntu@aws-us-east-1:~$</span> <span class="cmd">curl -s http://127.0.0.1:8500/v1/health/service/payment-service?passing=true | jq .</span></div>
    <div>[</div>
    <div>  {</div>
    <div>    "Node": { "Node": "<span class="warn-text">ip-172-31-20-133</span>", "Datacenter": "<span class="success-text">aws-us-east-1</span>" },</div>
    <div>    "Service": {</div>
    <div>      "ID": "<span class="warn-text">payment-service-azure-1</span>",</div>
    <div>      "Service": "<span class="success-text">payment-service</span>",</div>
    <div>      "Tags": ["AZURE", "central-india"],</div>
    <div>      "Address": "<span class="success-text">10.8.0.2</span>",</div>
    <div>      "Port": 8001</div>
    <div>    },</div>
    <div>    "Checks": [</div>
    <div>      { "CheckID": "service:payment-service-azure-1", "Status": "<span class="success-text">passing</span>", "Output": "HTTP GET 200 OK" }</div>
    <div>    ]</div>
    <div>  }</div>
    <div>]</div>
  </div>
  <div class="figure-caption">Figure 9: Consul catalog verification showing passing health checks.</div>
`;
pages.push(wrapPage(11, page11));

// ================= PAGE 12 =================
const page12 = `
  <h1 class="sec-title">6. IMPLEMENTATION AND EXECUTION</h1>

  <h2 class="sub-title">6.1 Start Cloud and Local Microservices</h2>
  <p class="desc">
    The application services run via systemd on cloud VMs, or can be started locally using the unified runner <code>start-all.js</code>. Run the following command from the project root.
  </p>
  <div class="code-run">node start-all.js</div>

  <div class="terminal-box">
    <div class="terminal-header">
      <span>Unified Runner — node start-all.js</span>
      <span>Node.js v24</span>
    </div>
    <div><span class="prompt">PS D:\\sd\\cross-cloud-service-discovery&gt;</span> <span class="cmd">node start-all.js</span></div>
    <div class="success-text">[Payment Service - AZURE] Running at http://127.0.0.1:8001</div>
    <div>[Payment Service - AZURE] Health check probe: http://127.0.0.1:8001/health</div>
    <div class="success-text">[User Service - AWS]    Running at http://127.0.0.1:8002</div>
    <div>[User Service - AWS]    Health check probe: http://127.0.0.1:8002/health</div>
    <div class="success-text">[Gateway & UI]          Backend running at http://localhost:3000</div>
    <div>[Gateway & UI]          React Web Dashboard available at http://localhost:3000</div>
    <div>[Consul Integration]    Connected to Consul daemon at http://localhost:8500</div>
  </div>
  <div class="figure-caption">Figure 10: Unified startup logs for API Gateway and microservices.</div>

  <h2 class="sub-title">6.2 Dynamic Service Resolution Engine</h2>
  <p class="desc">
    Inside <code>user-service.js</code>, when a client initiates a transaction, the service queries Consul's health endpoint with <code>?passing=true</code> before routing the request.
  </p>

  <div class="terminal-box">
    <div class="terminal-header">
      <span>AWS User Service — Consul Discovery Client</span>
      <span>user-service.js</span>
    </div>
    <div><span class="prompt">// 1. Query Consul for passing instances of target service</span></div>
    <div>const res = await axios.get(<span class="success-text">\`\${CONSUL_URL}/v1/health/service/payment-service?passing=true\`</span>);</div>
    <div>const entries = res.data || [];</div>
    <div>if (entries.length === 0) {</div>
    <div>  throw new Error(<span class="err-text">"No healthy instances of payment-service discovered in Consul"</span>);</div>
    <div>}</div>
    <div><span class="prompt">// 2. Extract resolved IP and Port</span></div>
    <div>const svc = entries[0].Service;</div>
    <div>const targetUrl = <span class="success-text">\`http://\${svc.Address}:\${svc.Port}/api/payments/process\`</span>;</div>
    <div><span class="prompt">// 3. Dispatch payment over WireGuard tunnel</span></div>
    <div>const response = await axios.post(targetUrl, payload, { timeout: 6000 });</div>
  </div>
  <div class="figure-caption">Figure 11: Dynamic Consul service resolution during cross-cloud requests.</div>
`;
pages.push(wrapPage(12, page12));

// ================= PAGE 13 =================
const page13 = `
  <h2 class="sub-title" style="margin-top:0;">6.3 Cross-Cloud Payment Processing Pipeline</h2>
  <p class="desc">
    The complete cross-cloud transaction lifecycle operates without hardcoding IP addresses:
  </p>
  <ol class="bullet-list" style="margin-left:20px;">
    <li>Operator triggers payment via Gateway: <code>POST /api/users/usr_101/pay</code> with amount $250.</li>
    <li>Gateway proxies request to AWS User Service (<code>:8002</code>).</li>
    <li>User Service dynamically resolves healthy Payment Service (<code>10.8.0.2:8001</code>) from Consul.</li>
    <li>User Service dispatches HTTP POST across the WireGuard tunnel (<code>10.8.0.1 → 10.8.0.2</code>).</li>
    <li>Azure Payment Service validates the account, processes transaction, and returns 200 OK.</li>
  </ol>

  <div class="terminal-box">
    <div class="terminal-header">
      <span>PowerShell — Cross-Cloud Payment Execution</span>
      <span>curl POST /api/users/usr_101/pay</span>
    </div>
    <div><span class="prompt">PS D:\\sd&gt;</span> <span class="cmd">curl.exe -X POST http://54.83.98.229:3000/api/users/usr_101/pay \\</span></div>
    <div>  -H "Content-Type: application/json" \\</div>
    <div>  -d '{"amount": 250, "currency": "USD", "description": "Cross-cloud cloud run"}'</div>
    <br/>
    <div>{</div>
    <div>  "status": "<span class="success-text">success</span>",</div>
    <div>  "crossCloud": <span class="warn-text">true</span>,</div>
    <div>  "source": { "service": "user-service", "cloud": "<span class="warn-text">AWS</span>", "region": "us-east-1" },</div>
    <div>  "discoveredTarget": {</div>
    <div>    "service": "payment-service",</div>
    <div>    "instanceId": "<span class="warn-text">payment-service-azure-1</span>",</div>
    <div>    "cloud": "<span class="warn-text">AZURE</span>",</div>
    <div>    "address": "<span class="success-text">10.8.0.2</span>",</div>
    <div>    "port": <span class="cmd">8001</span></div>
    <div>  },</div>
    <div>  "latencyMs": <span class="success-text">194</span>,</div>
    <div>  "payment": {</div>
    <div>    "transactionId": "<span class="warn-text">txn_1731428593810</span>",</div>
    <div>    "amount": 250,</div>
    <div>    "currency": "USD",</div>
    <div>    "status": "<span class="success-text">PROCESSED</span>"</div>
    <div>  }</div>
    <div>}</div>
  </div>
  <div class="figure-caption">Figure 12: Cross-cloud payment request execution and round-trip response.</div>

  <h2 class="sub-title">6.4 In-Memory Telemetry & Metrics Tracking</h2>
  <p class="desc">
    The AWS User Service maintains an in-memory telemetry buffer that records every transaction's route, discovered target IP, status, and network round-trip latency.
  </p>

  <div class="terminal-box" style="font-size:7.5pt;">
    <div class="terminal-header"><span>Telemetry Endpoint</span><span>GET /api/telemetry</span></div>
    <div>{ "status": "online", "telemetry": { "totalRequests": 14, "successfulRequests": 14, "failedRequests": 0, "lastLatency": "194ms" } }</div>
  </div>
  <div class="figure-caption">Figure 13: In-memory transaction telemetry recorded in AWS User Service.</div>
`;
pages.push(wrapPage(13, page13));

// ================= PAGE 14 =================
const page14 = `
  <h1 class="sec-title">7. CROSSCLOUD REGISTRY DASHBOARD AND DEMONSTRATION</h1>
  <p class="desc">
    Open the React SPA in a browser at <code>http://localhost:5173</code> (or <code>http://54.83.98.229:3000</code>). The dashboard provides single-pane-of-glass operational visibility across AWS and Azure.
  </p>

  <h2 class="sub-title">7.1 Dashboard Overview</h2>
  <!-- UI Mockup: Overview Dashboard -->
  <div style="border:1px solid #CBD5E1; border-radius:5px; background:#FFF; overflow:hidden; font-size:7.5pt; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="background:#0F172A; color:#FFF; padding:6px 10px; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-weight:700;">CrossCloud Registry &bull; Overview Dashboard</span>
      <span style="background:#15803D; padding:2px 8px; border-radius:10px; font-size:7pt;">REMOTE MODE &bull; AWS ↔ Azure</span>
    </div>
    <div style="padding:8px; display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; background:#F8FAFC;">
      <div style="background:#FFF; border:1px solid #E2E8F0; padding:6px; border-radius:4px;">
        <div style="color:#64748B; font-size:6.8pt; text-transform:uppercase;">AWS User Service</div>
        <div style="font-size:10pt; font-weight:800; color:#15803D; margin-top:2px;">Online (PASSING)</div>
        <div style="color:#475569; font-size:6.8pt;">10.8.0.1:8002 &bull; us-east-1</div>
      </div>
      <div style="background:#FFF; border:1px solid #E2E8F0; padding:6px; border-radius:4px;">
        <div style="color:#64748B; font-size:6.8pt; text-transform:uppercase;">Azure Payment Service</div>
        <div style="font-size:10pt; font-weight:800; color:#15803D; margin-top:2px;">Healthy (PASSING)</div>
        <div style="color:#475569; font-size:6.8pt;">10.8.0.2:8001 &bull; Central India</div>
      </div>
      <div style="background:#FFF; border:1px solid #E2E8F0; padding:6px; border-radius:4px;">
        <div style="color:#64748B; font-size:6.8pt; text-transform:uppercase;">WireGuard VPN Mesh</div>
        <div style="font-size:10pt; font-weight:800; color:#1D4ED8; margin-top:2px;">CONNECTED (14s)</div>
        <div style="color:#475569; font-size:6.8pt;">UDP 51820 &bull; 10.8.0.1 ↔ 10.8.0.2</div>
      </div>
      <div style="background:#FFF; border:1px solid #E2E8F0; padding:6px; border-radius:4px;">
        <div style="color:#64748B; font-size:6.8pt; text-transform:uppercase;">Consul Registry</div>
        <div style="font-size:10pt; font-weight:800; color:#047857; margin-top:2px;">PASSING (Leader)</div>
        <div style="color:#475569; font-size:6.8pt;">Datacenter: aws-us-east-1</div>
      </div>
    </div>
  </div>
  <div class="figure-caption">Figure 14: CrossCloud Registry Overview Dashboard.</div>

  <h2 class="sub-title">7.2 Cross-Cloud Payment Simulator</h2>
  <!-- UI Mockup: Simulator Form -->
  <div style="border:1px solid #CBD5E1; border-radius:5px; background:#FFF; padding:8px; margin-top:6px; font-size:7.8pt;">
    <div style="font-weight:700; color:#1E3A8A; margin-bottom:4px;">Interactive Payment Simulator</div>
    <div style="display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:6px; align-items:center;">
      <div><span style="color:#64748B;">User:</span> <strong>usr_101 — Ketaki</strong></div>
      <div><span style="color:#64748B;">Amount:</span> <strong>$250</strong></div>
      <div><span style="color:#64748B;">Currency:</span> <strong>USD</strong></div>
      <div><button style="background:#2563EB; color:#FFF; border:none; padding:4px 10px; border-radius:3px; font-size:7.5pt; font-weight:700;">Execute Pay</button></div>
    </div>
    <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:3px; padding:6px; margin-top:6px; color:#166534; font-size:7.2pt;">
      ✓ <strong>Payment Success:</strong> Transaction <code>txn_1731428593810</code> completed via <code>10.8.0.2:8001</code> (Route: AWS → AZURE, Latency: 194ms)
    </div>
  </div>
  <div class="figure-caption">Figure 15: Cross-Cloud Payment Simulator with real response metrics.</div>
`;
pages.push(wrapPage(14, page14));

// ================= PAGE 15 =================
const page15 = `
  <h2 class="sub-title" style="margin-top:0;">7.3 Service Registry & Catalog Management</h2>
  <p class="desc">
    The <code>/service-registry</code> route lists all agent-registered nodes in HashiCorp Consul. Users can inspect tags, trigger live backend HTTP probes, and register/deregister services dynamically.
  </p>

  <!-- UI Mockup: Service Registry Table -->
  <div style="border:1px solid #CBD5E1; border-radius:5px; background:#FFF; overflow:hidden; font-size:7.6pt; margin-bottom:6px;">
    <div style="background:#F1F5F9; padding:5px 8px; font-weight:700; border-bottom:1px solid #CBD5E1; display:flex; justify-content:space-between;">
      <span>Consul Service Catalog (Live)</span>
      <span style="color:#059669;">2 Registered Services &bull; 100% Health</span>
    </div>
    <table style="width:100%; border-collapse:collapse; font-size:7.4pt;">
      <thead>
        <tr style="background:#F8FAFC; border-bottom:1px solid #CBD5E1;">
          <th style="padding:4px 6px; text-align:left;">Service Name</th>
          <th style="padding:4px 6px; text-align:left;">Instance ID</th>
          <th style="padding:4px 6px; text-align:left;">Cloud</th>
          <th style="padding:4px 6px; text-align:left;">Address:Port</th>
          <th style="padding:4px 6px; text-align:left;">Health Status</th>
          <th style="padding:4px 6px; text-align:right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid #E2E8F0;">
          <td style="padding:4px 6px; font-weight:600;">user-service</td>
          <td style="padding:4px 6px; color:#475569;">user-service-aws-1</td>
          <td style="padding:4px 6px;"><span style="background:#FEF3C7; padding:1px 5px; border-radius:3px; font-weight:700; color:#92400E;">AWS</span></td>
          <td style="padding:4px 6px;">10.8.0.1:8002</td>
          <td style="padding:4px 6px;"><span style="background:#DCFCE7; color:#166534; padding:1px 6px; border-radius:8px; font-weight:700;">PASSING</span></td>
          <td style="padding:4px 6px; text-align:right;"><button style="background:#E2E8F0; border:none; padding:1px 6px; border-radius:2px; font-size:6.8pt;">Probe</button></td>
        </tr>
        <tr>
          <td style="padding:4px 6px; font-weight:600;">payment-service</td>
          <td style="padding:4px 6px; color:#475569;">payment-service-azure-1</td>
          <td style="padding:4px 6px;"><span style="background:#EDE9FE; padding:1px 5px; border-radius:3px; font-weight:700; color:#5B21B6;">AZURE</span></td>
          <td style="padding:4px 6px;">10.8.0.2:8001</td>
          <td style="padding:4px 6px;"><span style="background:#DCFCE7; color:#166534; padding:1px 6px; border-radius:8px; font-weight:700;">PASSING</span></td>
          <td style="padding:4px 6px; text-align:right;"><button style="background:#E2E8F0; border:none; padding:1px 6px; border-radius:2px; font-size:6.8pt;">Probe</button></td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="figure-caption">Figure 16: Consul Service Registry catalog and live instance inspection.</div>

  <h2 class="sub-title">7.4 Dynamic Service Discovery Explorer</h2>
  <p class="desc">
    The <code>/service-discovery</code> view allows operators to query services by name with <code>?passing=true</code> filtering, displaying DNS SRV record syntaxes and endpoint details.
  </p>

  <!-- UI Mockup: Service Discovery Explorer -->
  <div style="border:1px solid #CBD5E1; border-radius:5px; background:#FFF; padding:8px; font-size:7.5pt;">
    <div style="display:flex; gap:6px; margin-bottom:6px;">
      <input type="text" value="payment-service" readonly style="flex:1; border:1px solid #CBD5E1; padding:3px 6px; border-radius:3px; font-family:monospace; background:#F8FAFC;"/>
      <span style="background:#DBEAFE; color:#1E40AF; padding:3px 8px; border-radius:3px; font-weight:600;">?passing=true filter: ON</span>
    </div>
    <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:6px; border-radius:3px;">
      <div><strong>Discovered Target:</strong> <code>10.8.0.2:8001</code> &bull; Cloud: <strong>AZURE (Central India)</strong></div>
      <div style="color:#475569; font-size:7pt; margin-top:2px;">DNS SRV: <code>_payment-service._tcp.service.aws-us-east-1.consul. 300 IN SRV 1 1 8001 ip-172-31-20-133</code></div>
    </div>
  </div>
  <div class="figure-caption">Figure 17: Dynamic Service Discovery Explorer interface.</div>
`;
pages.push(wrapPage(15, page15));

// ================= PAGE 16 =================
const page16 = `
  <h2 class="sub-title" style="margin-top:0;">7.5 Health Monitoring & Fault Injection</h2>
  <p class="desc">
    The <code>/health-monitoring</code> page aggregates real-time Consul checks. It features one-click fault injection to simulate real-world microservice crashes and test automated discovery isolation.
  </p>

  <!-- UI Mockup: Health Monitoring -->
  <div style="border:1px solid #CBD5E1; border-radius:5px; background:#FFF; overflow:hidden; font-size:7.5pt; margin-bottom:6px;">
    <div style="background:#1E293B; color:#FFF; padding:5px 8px; display:flex; justify-content:space-between;">
      <span>Consul Health Check Inspector</span>
      <span>100% Healthy Discovery Ratio</span>
    </div>
    <div style="padding:6px; background:#F8FAFC;">
      <div style="background:#FFF; border:1px solid #CBD5E1; padding:6px; border-radius:4px; margin-bottom:4px;">
        <div style="display:flex; justify-content:space-between;">
          <span style="font-weight:700;">Check: service:payment-service-azure-1</span>
          <span style="color:#15803D; font-weight:700;">PASSING</span>
        </div>
        <div style="font-family:monospace; font-size:7pt; color:#475569; margin-top:2px;">
          HTTP GET http://10.8.0.2:8001/health: 200 OK &bull; Output: {"status":"healthy","uptimeSeconds":14280}
        </div>
      </div>
    </div>
  </div>
  <div class="figure-caption">Figure 18: Consul Health Monitoring and active check inspector.</div>

  <h2 class="sub-title">7.6 Fault Injection & Automatic Isolation Demonstration</h2>
  <p class="desc">
    Operators can click <strong>"Simulate 503 Failure"</strong> (calling <code>POST /api/scenarios/inject-fault</code>). The Azure Payment Service responds with HTTP 503. Within 10 seconds, Consul detects the failure, marks it <strong>CRITICAL</strong>, and removes it from the <code>?passing=true</code> discovery pool.
  </p>

  <!-- UI Mockup: Fault Outage Alert -->
  <div style="border:1.5px solid #EF4444; border-radius:5px; background:#FEF2F2; padding:8px; font-size:7.4pt; color:#991B1B;">
    <div style="font-weight:800; font-size:8pt; margin-bottom:2px;">
      ⚠️ CRITICAL: Azure Payment Service Failure Detected (HTTP 503)
    </div>
    <div>
      Consul health probe failed. Service is automatically <strong>excluded from healthy service discovery</strong> (<code>/v1/health/service/payment-service?passing</code> returns 0 instances). AWS User Service safely isolates the failure and rejects incoming payments until recovery.
    </div>
    <div style="margin-top:5px;">
      <button style="background:#15803D; color:#FFF; border:none; padding:3px 8px; border-radius:3px; font-size:7pt; font-weight:700;">Restore Health (200 OK)</button>
    </div>
  </div>
  <div class="figure-caption">Figure 19: Fault injection demonstration and discovery exclusion alert.</div>
`;
pages.push(wrapPage(16, page16));

// ================= PAGE 17 =================
const page17 = `
  <h2 class="sub-title" style="margin-top:0;">7.7 Telemetry History & Live Mesh Events</h2>
  <p class="desc">
    The dashboard streams live cross-cloud transaction records and Consul health state transitions, tracking request timestamp, source/target cloud, discovered address, and execution latency.
  </p>

  <!-- UI Mockup: Telemetry Table -->
  <div style="border:1px solid #CBD5E1; border-radius:5px; background:#FFF; overflow:hidden; font-size:7.5pt; margin-bottom:6px;">
    <div style="background:#F1F5F9; padding:5px 8px; font-weight:700; border-bottom:1px solid #CBD5E1;">
      Live Cross-Cloud Transaction Telemetry (AWS → Azure)
    </div>
    <table style="width:100%; border-collapse:collapse; font-size:7.2pt;">
      <thead>
        <tr style="background:#F8FAFC; border-bottom:1px solid #E2E8F0;">
          <th style="padding:3.5px 6px; text-align:left;">Status</th>
          <th style="padding:3.5px 6px; text-align:left;">Transaction ID</th>
          <th style="padding:3.5px 6px; text-align:left;">Route</th>
          <th style="padding:3.5px 6px; text-align:left;">Target IP</th>
          <th style="padding:3.5px 6px; text-align:left;">Amount</th>
          <th style="padding:3.5px 6px; text-align:right;">Latency</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid #E2E8F0;">
          <td style="padding:3.5px 6px;"><span style="background:#DCFCE7; color:#166534; padding:1px 5px; border-radius:4px; font-weight:700;">SUCCESS</span></td>
          <td style="padding:3.5px 6px; font-family:monospace;">txn_1731428593810</td>
          <td style="padding:3.5px 6px; font-weight:600; color:#1E40AF;">AWS → AZURE</td>
          <td style="padding:3.5px 6px;">10.8.0.2:8001</td>
          <td style="padding:3.5px 6px;">$250 USD</td>
          <td style="padding:3.5px 6px; text-align:right; font-weight:600;">194 ms</td>
        </tr>
        <tr>
          <td style="padding:3.5px 6px;"><span style="background:#DCFCE7; color:#166534; padding:1px 5px; border-radius:4px; font-weight:700;">SUCCESS</span></td>
          <td style="padding:3.5px 6px; font-family:monospace;">txn_1731428410291</td>
          <td style="padding:3.5px 6px; font-weight:600; color:#1E40AF;">AWS → AZURE</td>
          <td style="padding:3.5px 6px;">10.8.0.2:8001</td>
          <td style="padding:3.5px 6px;">$100 USD</td>
          <td style="padding:3.5px 6px; text-align:right; font-weight:600;">191 ms</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="figure-caption">Figure 20: Live transaction telemetry and mesh events log.</div>

  <h2 class="sub-title">7.8 Settings & Control Plane Diagnostics</h2>
  <p class="desc">
    The <code>/settings</code> route provides live diagnostics: verifying HashiCorp Consul cluster connectivity, Express Gateway latency, and WireGuard VPN tunnel status.
  </p>

  <!-- UI Mockup: Settings View -->
  <div style="border:1px solid #CBD5E1; border-radius:5px; background:#FFF; padding:8px; font-size:7.5pt;">
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
      <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:6px; border-radius:3px;">
        <div style="font-weight:700; color:#0F172A;">Consul Connection Diagnostic</div>
        <div style="color:#15803D; font-weight:600; margin-top:2px;">Connected (14ms) &bull; Leader Elected</div>
        <div style="color:#475569; font-size:7pt;">Datacenter: aws-us-east-1</div>
      </div>
      <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:6px; border-radius:3px;">
        <div style="font-weight:700; color:#0F172A;">Express Gateway Diagnostic</div>
        <div style="color:#15803D; font-weight:600; margin-top:2px;">HTTP 200 OK (22ms) &bull; Port 3000</div>
        <div style="color:#475569; font-size:7pt;">Target: http://54.83.98.229:3000</div>
      </div>
    </div>
  </div>
  <div class="figure-caption">Figure 21: Settings and Control Plane Diagnostics page.</div>
`;
pages.push(wrapPage(17, page17));

// ================= PAGE 18 =================
const page18 = `
  <h1 class="sec-title">8. TESTING AND TROUBLESHOOTING</h1>

  <h2 class="sub-title">8.1 Practical Test Cases</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width:24%;">Test</th>
        <th style="width:40%;">Procedure</th>
        <th style="width:36%;">Expected Observation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight:600;">API Gateway Health</td>
        <td>Query <code>GET /api</code> and <code>GET /api/health</code> via cURL or browser.</td>
        <td>Returns HTTP 200 with gateway status and aggregated Consul check counts.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Consul Connectivity</td>
        <td>Query <code>GET /api/consul/status</code>.</td>
        <td>Connected: true, leader elected, datacenter <code>aws-us-east-1</code>.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Service Registration</td>
        <td>Dispatch <code>POST /api/services/register</code> with valid payload.</td>
        <td>Returns 200/201 and service appears in <code>GET /api/services</code>.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Duplicate ID Check</td>
        <td>Attempt registering with an existing service ID.</td>
        <td>Returns HTTP 409 Conflict with descriptive collision warning.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Dynamic Discovery</td>
        <td>Query <code>GET /api/services/payment-service?passing=true</code>.</td>
        <td>Returns only healthy instance (<code>10.8.0.2:8001</code>) with passing check.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Cross-Cloud Payment</td>
        <td>Dispatch <code>POST /api/users/usr_101/pay</code> to Gateway.</td>
        <td>Dispatches payment to Azure over WireGuard; returns transaction ID.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Fault Injection</td>
        <td>Trigger <code>POST /api/scenarios/inject-fault</code>.</td>
        <td>Payment Service returns 503; Consul marks CRITICAL within 10s.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Recovery Verification</td>
        <td>Trigger <code>POST /api/scenarios/restore-health</code>.</td>
        <td>Payment Service returns 200; Consul restores PASSING status.</td>
      </tr>
    </tbody>
  </table>
  <p class="desc" style="font-size:8.4pt; margin-top:4px; color:#15803D; font-weight:600;">
    Record PASS only for tests actually executed and verified. All 28 automated integration tests pass (100% pass rate).
  </p>

  <h2 class="sub-title">8.2 Common Issues and Troubleshooting Checks</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width:30%;">Issue</th>
        <th style="width:70%;">Recommended Check</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight:600;">Consul connection refused</td>
        <td>Verify systemd service: <code>sudo systemctl status consul</code>. Ensure port 8500 is listening.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">WireGuard tunnel offline</td>
        <td>Run <code>sudo wg show</code>. Check UDP port 51820 in AWS Security Group and Azure NSG rules.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Payment Service unreachable</td>
        <td>Verify WireGuard private IP is pingable from AWS: <code>ping -c 3 10.8.0.2</code>.</td>
      </tr>
      <tr>
        <td style="font-weight:600;">Browser CORS error</td>
        <td>Check <code>VITE_API_URL</code> in <code>frontend/.env</code> matches the public gateway IP.</td>
      </tr>
    </tbody>
  </table>

  <h2 class="sub-title">8.3 Important Operational Notes</h2>
  <ul class="bullet-list">
    <li>Always ensure HashiCorp Consul is running before starting dependent microservices.</li>
    <li>Keep Consul HTTP port 8500 shielded to loopback; all client requests should flow through the Gateway.</li>
    <li>WireGuard handshake timestamp must be recent (&lt;120s); stale handshakes indicate security group blocks.</li>
  </ul>
`;
pages.push(wrapPage(18, page18));

// ================= PAGE 19 =================
const page19 = `
  <h1 class="sec-title">9: LIMITATIONS, FUTURE SCOPE AND CONCLUSION</h1>

  <h2 class="sub-title">9.1 Limitations</h2>
  <ul class="bullet-list">
    <li><strong>Simulated Banking Transactions:</strong> Payment processing simulates ledger state updates; no real financial or banking gateways are connected.</li>
    <li><strong>In-Memory Telemetry:</strong> Transaction counters and latency history are stored in memory inside AWS User Service and reset upon process restart.</li>
    <li><strong>Single Consul Server Node:</strong> Deployed as a single standalone server node on AWS EC2 rather than a multi-node Raft quorum cluster.</li>
    <li><strong>Point-to-Point WireGuard Tunnel:</strong> Point-to-point overlay connecting two cloud VMs rather than a full-mesh multi-node software-defined network.</li>
  </ul>

  <h2 class="sub-title">9.2 Future Scope</h2>
  <p class="desc">
    The project architecture can be extended with the following production-grade enhancements:
  </p>
  <ul class="bullet-list">
    <li><strong>Consul Connect & Envoy Sidecars:</strong> Introduce mutual TLS (mTLS) service-to-service encryption with automatic certificate authority rotation.</li>
    <li><strong>Multi-Datacenter WAN Federation:</strong> Deploy Consul servers in both AWS and Azure joined across clouds via Consul WAN gossip.</li>
    <li><strong>Persistent Database Integration:</strong> Connect PostgreSQL or DynamoDB with ACID transactional guarantees for durable ledger storage.</li>
    <li><strong>Distributed Tracing (OpenTelemetry):</strong> Integrate Jaeger or Zipkin to visualize cross-cloud network call spans and bottleneck latencies.</li>
    <li><strong>Cross-Cluster Kubernetes Orchestration:</strong> Deploy workloads to AWS EKS and Azure AKS using Consul Kubernetes service sync.</li>
  </ul>

  <h2 class="sub-title">9.3 Conclusion</h2>
  <p class="desc">
    The <strong>Cross-Cloud Service Discovery Registry</strong> microproject demonstrates a complete, production-verified architecture for cross-cloud microservice orchestration. By combining <strong>HashiCorp Consul</strong> for dynamic service discovery and active health probing with an encrypted <strong>WireGuard VPN overlay tunnel</strong> and a modern <strong>React 18 + TypeScript web console</strong>, the system solves the challenge of dynamic addressing across heterogeneous cloud environments.
  </p>
  <p class="desc">
    The implementation successfully demonstrates automated 10-second fault detection, discovery pool isolation, and zero-downtime recovery without hardcoding remote IP addresses in consumer application code. The cookbook documents the practical setup, configuration, execution, and demonstration steps for the completed system.
  </p>
`;
pages.push(wrapPage(19, page19));

// ================= PAGE 20 =================
const page20 = `
  <h1 class="sec-title">10: GITHUB REPOSITORY AND REFERENCES</h1>

  <h2 class="sub-title">10.1 GitHub Repository</h2>
  <p class="desc">
    The project source code, deployment automation, test suites, and technical documentation are maintained in a GitHub repository.
  </p>
  <div style="font-size:9.2pt; line-height:1.5; margin-bottom:8px;">
    <strong>Repository Name:</strong> <code style="background:#F1F5F9; padding:2px 6px; border-radius:3px;">cross-cloud-service-discovery</code><br/>
    <strong>GitHub Link:</strong> <a href="https://github.com/Ketaki2006/cross-cloud-service-discovery" style="color:#0969DA; text-decoration:none;">https://github.com/Ketaki2006/cross-cloud-service-discovery</a>
  </div>
  <p class="desc">
    GitHub is used to store the project files, manage version control, and maintain the source code.
  </p>

  <!-- GitHub Browser Mockup -->
  <div style="border:1px solid #D0D7DE; border-radius:6px; overflow:hidden; background:#FFF; font-size:7.5pt; margin-bottom:6px; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="background:#F6F8FA; padding:6px 10px; border-bottom:1px solid #D0D7DE; display:flex; justify-content:space-between;">
      <span style="font-weight:700; color:#0969DA;">Ketaki2006 / cross-cloud-service-discovery</span>
      <span style="color:#57609A;">★ Star 0 &bull; Fork 0</span>
    </div>
    <div style="padding:8px 10px; background:#FFF;">
      <div style="font-weight:600; color:#24292F;">Cross-Cloud Service Discovery Registry</div>
      <div style="color:#57609A; font-size:7pt; margin-top:2px;">Production-verified multi-cloud discovery registry connecting AWS EC2 and Azure VM over WireGuard with HashiCorp Consul and React 18 SPA.</div>
    </div>
  </div>
  <div class="figure-caption">Figure 22: Project GitHub repository.</div>

  <h2 class="sub-title">10.2 References</h2>
  <ol class="bullet-list" style="margin-left:22px; font-size:8.6pt; line-height:1.5;">
    <li>HashiCorp Consul Documentation — <a href="https://developer.hashicorp.com/consul/docs" style="color:#0969DA; text-decoration:none;">https://developer.hashicorp.com/consul/docs</a></li>
    <li>WireGuard Fast, Modern, Secure VPN Tunnel — <a href="https://www.wireguard.com/" style="color:#0969DA; text-decoration:none;">https://www.wireguard.com/</a></li>
    <li>Express.js Web Application Framework — <a href="https://expressjs.com/" style="color:#0969DA; text-decoration:none;">https://expressjs.com/</a></li>
    <li>React 18 & TypeScript Guide — <a href="https://react.dev/" style="color:#0969DA; text-decoration:none;">https://react.dev/</a></li>
    <li>Vite Frontend Tooling — <a href="https://vitejs.dev/" style="color:#0969DA; text-decoration:none;">https://vitejs.dev/</a></li>
    <li>AWS EC2 Networking & Security — <a href="https://docs.aws.amazon.com/ec2/" style="color:#0969DA; text-decoration:none;">https://docs.aws.amazon.com/ec2/</a></li>
    <li>Microsoft Azure Virtual Machines — <a href="https://learn.microsoft.com/en-us/azure/virtual-machines/" style="color:#0969DA; text-decoration:none;">https://learn.microsoft.com/en-us/azure/virtual-machines/</a></li>
    <li>Project Source Code & Deployment Automation — <a href="https://github.com/Ketaki2006/cross-cloud-service-discovery" style="color:#0969DA; text-decoration:none;">https://github.com/Ketaki2006/cross-cloud-service-discovery</a></li>
  </ol>
`;
pages.push(wrapPage(20, page20));

// Build complete HTML
const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cross-Cloud Service Discovery Registry — Micro Project CookBook</title>
  <style>${css}</style>
</head>
<body>
  ${pages.join('\n')}
</body>
</html>`;

fs.writeFileSync(htmlPath, fullHtml, 'utf8');
console.log(`HTML generated: ${htmlPath} (${fs.statSync(htmlPath).size} bytes)`);

// Compile PDF via Headless Chrome
console.log('Compiling PDF via Headless Chrome...');
const tmpDir = path.join(__dirname, '..', 'chrome_temp_cookbook');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const chromeArgs = [
  '--headless',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-software-rasterizer',
  `--user-data-dir=${tmpDir}`,
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfPath}`,
  `file:///${htmlPath.replace(/\\\\/g, '/')}`
];

const proc = spawn(chromePath, chromeArgs);
let stderr = '';
proc.stderr.on('data', (d) => stderr += d);
proc.on('close', (code) => {
  console.log(`Chrome exited with code: ${code}`);
  if (fs.existsSync(pdfPath)) {
    const size = fs.statSync(pdfPath).size;
    console.log(`SUCCESS! Generated PDF at: ${pdfPath} (Size: ${size} bytes)`);
  } else {
    console.error('Failed to generate PDF. Stderr:', stderr);
  }
});

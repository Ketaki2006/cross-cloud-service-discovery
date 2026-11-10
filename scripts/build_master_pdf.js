const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docDir = path.join(__dirname, '..', 'documentation');
const masterMdPath = path.join(docDir, 'MASTER_LEARNING_GUIDE.md');
const masterHtmlPath = path.join(docDir, 'MASTER_LEARNING_GUIDE.html');
const masterPdfPath = path.join(docDir, 'Cross_Cloud_Service_Discovery_Complete_Master_Guide.pdf');

const filesToCombine = [
  '01_Project_Overview.md',
  '02_Technology_Stack.md',
  '03_System_Architecture.md',
  '04_Development_From_Scratch.md',
  '05_Codebase_Explanation.md',
  '06_Consul_Deep_Dive.md',
  '07_API_Documentation.md',
  '08_Execution_Flow.md',
  '09_Testing_and_Debugging.md',
  '10_Viva_Questions.md',
  '11_Project_Cookbook.md',
  'Architecture_Summary.md',
  'Command_Reference.md',
  'Viva_Cheat_Sheet.md'
];

let combinedMarkdown = `# Cross-Cloud Service Discovery Registry
## Complete Engineering Master Learning Guide & Technical Viva Defense Manual

---

### Academic & Project Metadata
- **Project Name:** Cross-Cloud Service Discovery Registry
- **Student Profile:** Third-Year Computer Engineering Capstone & Viva Defense
- **Domain:** Distributed Systems, Cloud Computing, Microservices Orchestration
- **Core Technologies:** React 18, TypeScript, Node.js, Express 5, HashiCorp Consul, Tailwind CSS
- **Automated Tests:** 18 Integration Tests (100% Pass Rate)

---

`;

for (const file of filesToCombine) {
  const filePath = path.join(docDir, file);
  if (fs.existsSync(filePath)) {
    combinedMarkdown += `\n\n---\n\n` + fs.readFileSync(filePath, 'utf8');
  }
}

fs.writeFileSync(masterMdPath, combinedMarkdown, 'utf8');
console.log('Saved combined MASTER_LEARNING_GUIDE.md');

// Generate HTML with clean print styling
const htmlHeader = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cross-Cloud Service Discovery Registry - Master Learning Guide</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {
        content: counter(page);
        font-family: 'Inter', sans-serif;
        font-size: 8.5pt;
        color: #64748B;
      }
      @bottom-left {
        content: "Cross-Cloud Service Discovery Registry — Master Learning Guide";
        font-family: 'Inter', sans-serif;
        font-size: 8.5pt;
        color: #64748B;
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      font-size: 10pt;
      line-height: 1.55;
      color: #1E293B;
      background: #FFFFFF;
    }

    .cover {
      page-break-after: always;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 40px 20px;
      border: 3px double #2563EB;
      border-radius: 8px;
      background: linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%);
    }

    .cover-title {
      font-size: 26pt;
      font-weight: 800;
      color: #0F172A;
      text-align: center;
      line-height: 1.25;
      margin-top: 30px;
    }

    .cover-sub {
      font-size: 13pt;
      color: #475569;
      text-align: center;
      margin-top: 14px;
      line-height: 1.4;
    }

    .cover-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
    }

    .cover-table td {
      padding: 10px 14px;
      font-size: 9.5pt;
      border-bottom: 1px solid #E2E8F0;
    }

    .cover-table td.label {
      font-weight: 700;
      background: #F8FAFC;
      width: 35%;
      color: #334155;
    }

    h1 {
      page-break-before: always;
      font-size: 18pt;
      font-weight: 800;
      color: #0F172A;
      border-bottom: 2px solid #2563EB;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 16px;
    }

    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #1E293B;
      margin-top: 20px;
      margin-bottom: 10px;
      border-left: 4px solid #2563EB;
      padding-left: 8px;
    }

    h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 6px;
    }

    p { margin-bottom: 10px; text-align: justify; }
    ul, ol { margin-left: 20px; margin-bottom: 12px; }
    li { margin-bottom: 5px; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 9pt;
      page-break-inside: avoid;
    }

    th, td {
      padding: 7px 10px;
      border: 1px solid #CBD5E1;
      text-align: left;
    }

    th { background: #F1F5F9; font-weight: 700; color: #0F172A; }
    tr:nth-child(even) td { background: #F8FAFC; }

    pre {
      background: #0F172A;
      color: #F8FAFC;
      padding: 10px 14px;
      border-radius: 6px;
      font-family: 'Consolas', monospace;
      font-size: 8.5pt;
      line-height: 1.4;
      margin: 12px 0;
      page-break-inside: avoid;
      overflow-x: auto;
    }

    code {
      font-family: 'Consolas', monospace;
      font-size: 8.5pt;
      background: #F1F5F9;
      color: #2563EB;
      padding: 2px 4px;
      border-radius: 4px;
    }

    pre code { background: transparent; color: #F8FAFC; padding: 0; }

    .q-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-left: 4px solid #3B82F6;
      border-radius: 4px;
      padding: 10px 14px;
      margin: 10px 0;
      page-break-inside: avoid;
    }

    .q-title {
      font-weight: 700;
      color: #1E3A8A;
      margin-bottom: 4px;
    }

    .q-quick {
      font-size: 9pt;
      color: #059669;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .q-detail {
      font-size: 9pt;
      color: #334155;
    }
  </style>
</head>
<body>

  <div class="cover">
    <div>
      <div style="text-align: center; margin-top: 20px;">
        <span style="display: inline-block; padding: 6px 14px; background: #EFF6FF; color: #2563EB; font-weight: 700; font-size: 9.5pt; border-radius: 9999px; border: 1px solid #BFDBFE;">CAPSTONE PROJECT LEARNING GUIDE & VIVA DEFENSE</span>
      </div>
      <h1 class="cover-title" style="page-break-before: avoid; border: none;">CROSS-CLOUD SERVICE DISCOVERY REGISTRY</h1>
      <p class="cover-sub">Comprehensive Codebase Understanding, Technical Architecture, Implementation Mechanics & 60+ Viva Voce Questions</p>
    </div>

    <div>
      <table class="cover-table">
        <tr><td class="label">Project Title:</td><td>Cross-Cloud Service Discovery Registry</td></tr>
        <tr><td class="label">Primary Domain:</td><td>Distributed Systems & Cloud-Native Microservices</td></tr>
        <tr><td class="label">Target Audience:</td><td>Third-Year Computer Engineering Degree Examination</td></tr>
        <tr><td class="label">Core Architecture:</td><td>React 18 + TS &bull; Node.js Express 5 &bull; HashiCorp Consul &bull; Simulated Microservices</td></tr>
        <tr><td class="label">Verification State:</td><td>18/18 Automated Integration Tests Passing (100%)</td></tr>
      </table>
    </div>

    <div style="text-align: center; font-size: 9pt; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px;">
      Engineering Capstone Project Submission &bull; Comprehensive Student Learning Manual
    </div>
  </div>
`;

// Simple conversion of markdown sections into HTML content
let convertedHtml = combinedMarkdown
  .replace(/### (Q\d+: [^\n]+)\n- \*\*Quick Answer:\*\* ([^\n]+)\n- \*\*Detailed Answer:\*\* ([^\n]+)/g, 
    '<div class="q-card"><div class="q-title">$1</div><div class="q-quick">Quick Answer: $2</div><div class="q-detail">Detailed Answer: $3</div></div>')
  .replace(/^# (.*$)/gim, '<h1>$1</h1>')
  .replace(/^## (.*$)/gim, '<h2>$1</h2>')
  .replace(/^### (.*$)/gim, '<h3>$1</h3>')
  .replace(/\`\`\`(bash|powershell|javascript|json|typescript|html)?\n([\s\S]*?)\`\`\`/gm, '<pre><code>$2</code></pre>')
  .replace(/\`([^`]+)\`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

const fullHtml = htmlHeader + convertedHtml + '</body></html>';
fs.writeFileSync(masterHtmlPath, fullHtml, 'utf8');
console.log('Saved MASTER_LEARNING_GUIDE.html');

// Generate PDF via Headless Edge
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
console.log('Compiling Master PDF via headless Microsoft Edge...');
try {
  const edgeCmd = `"${edgePath}" --headless=new --disable-gpu --run-all-compositor-stages-before-draw --no-pdf-header-footer --print-to-pdf="${masterPdfPath}" "${masterHtmlPath}"`;
  execSync(edgeCmd, { stdio: 'inherit' });
  if (fs.existsSync(masterPdfPath)) {
    const stats = fs.statSync(masterPdfPath);
    console.log(`Successfully generated Master PDF! File size: ${stats.size} bytes at: ${masterPdfPath}`);
  }
} catch (err) {
  console.error('Error generating PDF with Edge:', err.message);
}


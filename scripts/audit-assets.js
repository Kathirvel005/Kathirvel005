/**
 * Automated Asset & Profile Telemetry Auditor
 * Validates XML integrity, asset completeness, and link references.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const README_PATH = path.join(ROOT, 'README.md');

function getSvgFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getSvgFiles(fullPath));
    } else if (entry.name.endsWith('.svg')) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log('=== KATHIRVEL_OS // PROFILE ASSET AUDIT ===');
const svgs = getSvgFiles(ASSETS_DIR);
console.log(`[INFO] Found ${svgs.length} SVG assets.`);

let errorCount = 0;

for (const svg of svgs) {
  const relPath = path.relative(ROOT, svg);
  const content = fs.readFileSync(svg, 'utf8');

  // Check valid svg boundaries
  if (!content.includes('<svg') || !content.includes('</svg>')) {
    console.error(`[FAIL] ${relPath}: Missing <svg> root container.`);
    errorCount++;
    continue;
  }

  // Check unescaped ampersands
  const badAmp = content.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g);
  if (badAmp) {
    console.error(`[FAIL] ${relPath}: Contains unescaped ampersands.`);
    errorCount++;
    continue;
  }

  const stat = fs.statSync(svg);
  console.log(`[PASS] ${relPath} (${(stat.size / 1024).toFixed(1)} KB)`);
}

// Check README links
if (fs.existsSync(README_PATH)) {
  const readme = fs.readFileSync(README_PATH, 'utf8');
  const imgRegex = /src=["']([^"']+)["']/g;
  let match;
  let missing = 0;
  while ((match = imgRegex.exec(readme)) !== null) {
    const src = match[1];
    if (!src.startsWith('http')) {
      const full = path.join(ROOT, src);
      if (!fs.existsSync(full)) {
        console.error(`[FAIL] README references missing local file: ${src}`);
        missing++;
      }
    }
  }
  if (missing === 0) {
    console.log('[PASS] All README image references resolved successfully.');
  } else {
    errorCount += missing;
  }
}

if (errorCount === 0) {
  console.log('=== AUDIT COMPLETE: ALL SYSTEMS NOMINAL (100% HEALTH) ===');
  process.exit(0);
} else {
  console.error(`=== AUDIT FAILED WITH ${errorCount} ERRORS ===`);
  process.exit(1);
}

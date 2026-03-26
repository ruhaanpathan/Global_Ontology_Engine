// One-shot cleanup: removes orphaned FALLBACK body from goe-engine.js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'goe-engine.js');
let content = fs.readFileSync(file, 'utf8');

// The orphan block starts after the closing brace of updateTickerFromLive
// and ends at the closing "};" of the FALLBACK object
// We'll use a reliable boundary: find the line after "}).join('');\n}\n\n"
// and delete everything up to (but not including) "// ═══════════════ STRATEGY VIEW"

const startMarker = '  ).join(\'\');\n}\n';
const endMarker = '// ═══════════════ STRATEGY VIEW ═══════════════';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found. startIdx:', startIdx, 'endIdx:', endIdx);
  process.exit(1);
}

const cleanContent = content.slice(0, startIdx + startMarker.length) + '\n' + content.slice(endIdx);
fs.writeFileSync(file, cleanContent, 'utf8');

const linesBefore = content.split('\n').length;
const linesAfter = cleanContent.split('\n').length;
console.log(`Done! Removed ${linesBefore - linesAfter} lines. File now has ${linesAfter} lines.`);

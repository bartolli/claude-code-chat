#!/bin/bash

# Generate JSDoc work batches for agents
# This script creates focused work files that can be passed to /project:check

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORK_DIR="$PROJECT_ROOT/.claude-work"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Generating JSDoc work batches...${NC}"

# Create work directory
mkdir -p "$WORK_DIR"

# Clean up old work files
rm -f "$WORK_DIR"/*.work.txt

# Run ESLint and capture JSDoc issues
echo -e "${YELLOW}Running ESLint to find JSDoc issues...${NC}"
cd "$PROJECT_ROOT"

# Get JSDoc errors grouped by file
npx eslint src \
    --format json \
    --no-error-on-unmatched-pattern \
    > "$WORK_DIR/eslint-results.json" || true

# Process results with Node.js
node -e '
const fs = require("fs");
const path = require("path");

const results = JSON.parse(fs.readFileSync("'$WORK_DIR'/eslint-results.json", "utf8"));
const workDir = "'$WORK_DIR'";

// Group files by module
const moduleMap = new Map();

results.forEach(file => {
    if (!file.messages || file.messages.length === 0) return;
    
    // Only process JSDoc errors
    const jsdocIssues = file.messages.filter(msg => 
        msg.ruleId && msg.ruleId.startsWith("jsdoc/")
    );
    
    if (jsdocIssues.length === 0) return;
    
    // Extract module from path
    const relativePath = path.relative("'$PROJECT_ROOT'", file.filePath);
    const pathParts = relativePath.split(path.sep);
    
    // Skip files outside src/
    if (pathParts[0] !== "src") return;
    
    // Determine module
    let module = "misc";
    if (pathParts.length >= 2) {
        module = pathParts[1]; // core, state, services, etc.
        if (module === "state" && pathParts.length >= 3 && pathParts[2] === "slices") {
            module = "state-slices";
        }
    }
    
    if (!moduleMap.has(module)) {
        moduleMap.set(module, []);
    }
    
    moduleMap.get(module).push({
        file: relativePath,
        fullPath: file.filePath,
        issues: jsdocIssues.map(issue => ({
            line: issue.line,
            column: issue.column,
            message: issue.message,
            ruleId: issue.ruleId
        }))
    });
});

// Create work batch files
let totalFiles = 0;
let totalIssues = 0;

moduleMap.forEach((files, module) => {
    const workFile = path.join(workDir, `${module}.work.txt`);
    let content = `# JSDoc Work Batch: ${module}\n`;
    content += `# Generated: ${new Date().toISOString()}\n`;
    content += `# Files: ${files.length}\n\n`;
    
    let moduleIssues = 0;
    
    files.forEach(fileInfo => {
        content += `## ${fileInfo.file}\n`;
        content += `Full path: ${fileInfo.fullPath}\n`;
        content += `Issues: ${fileInfo.issues.length}\n\n`;
        
        fileInfo.issues.forEach(issue => {
            content += `  ${issue.line}:${issue.column}  ${issue.ruleId}  ${issue.message}\n`;
            moduleIssues++;
        });
        content += `\n`;
    });
    
    content += `\n# Total issues in this batch: ${moduleIssues}\n`;
    
    fs.writeFileSync(workFile, content);
    console.log(`Created ${module}.work.txt - ${files.length} files, ${moduleIssues} issues`);
    
    totalFiles += files.length;
    totalIssues += moduleIssues;
});

console.log(`\nTotal: ${totalFiles} files, ${totalIssues} issues across ${moduleMap.size} modules`);

// Create summary file
const summaryFile = path.join(workDir, "summary.txt");
let summary = "# JSDoc Work Batch Summary\n\n";
summary += `Generated: ${new Date().toISOString()}\n`;
summary += `Total files: ${totalFiles}\n`;
summary += `Total issues: ${totalIssues}\n\n`;
summary += "## Batches created:\n";

Array.from(moduleMap.keys()).sort().forEach(module => {
    const files = moduleMap.get(module);
    const issueCount = files.reduce((sum, f) => sum + f.issues.length, 0);
    summary += `- ${module}.work.txt (${files.length} files, ${issueCount} issues)\n`;
});

fs.writeFileSync(summaryFile, summary);
'

echo -e "\n${GREEN}✅ Work batches created in $WORK_DIR${NC}"
echo -e "${BLUE}📋 Summary:${NC}"
cat "$WORK_DIR/summary.txt"

echo -e "\n${YELLOW}💡 Usage:${NC}"
echo "  /project:check $WORK_DIR/<module>.work.txt"
echo ""
echo "Example:"
echo "  /project:check $WORK_DIR/core.work.txt"
echo "  /project:check $WORK_DIR/state-slices.work.txt"
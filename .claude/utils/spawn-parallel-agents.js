#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Utility to help Claude spawn parallel agents for JSDoc fixes
 * This is a helper script that generates the prompts for parallel agent spawning
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse ESLint output to find files with JSDoc issues
 * @param {string} eslintOutput - Raw eslint output
 * @returns {Array<{file: string, count: number}>} Files with issue counts
 */
function parseJsdocIssues(eslintOutput) {
  const fileIssues = {};
  const lines = eslintOutput.split('\n');

  lines.forEach((line) => {
    if (line.includes('jsdoc/require-jsdoc')) {
      const match = line.match(/^(.+?):\d+:\d+/);
      if (match) {
        const file = match[1];
        fileIssues[file] = (fileIssues[file] || 0) + 1;
      }
    }
  });

  return Object.entries(fileIssues)
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Select files for parallel processing
 * @param {Array<{file: string, count: number}>} files - Files with issue counts
 * @param {number} agentCount - Number of agents to spawn
 * @returns {Array<{file: string, count: number}>} Selected files
 */
function selectFilesForAgents(files, agentCount = 3) {
  // Select files from different directories to avoid conflicts
  const selected = [];
  const usedDirs = new Set();

  for (const file of files) {
    const dir = path.dirname(file.file);
    if (!usedDirs.has(dir) && selected.length < agentCount) {
      selected.push(file);
      usedDirs.add(dir);
    }
  }

  // If we don't have enough from different dirs, just take top files
  while (selected.length < agentCount && selected.length < files.length) {
    const nextFile = files[selected.length];
    if (!selected.includes(nextFile)) {
      selected.push(nextFile);
    }
  }

  return selected;
}

/**
 * Generate agent prompt for JSDoc fixes
 * @param {string} file - File path
 * @param {number} issueCount - Number of JSDoc issues
 * @param {number} agentNumber - Agent number
 * @returns {string} Agent prompt
 */
function generateAgentPrompt(file, issueCount, agentNumber) {
  return `Fix all ${issueCount} JSDoc issues in ${file}

Instructions:
1. Read the file to understand its structure
2. Identify all missing JSDoc comments by looking for:
   - Interface properties without documentation
   - Class declarations without JSDoc
   - Methods missing @param and @returns tags
   - Type definitions without documentation
3. Add meaningful JSDoc comments that describe:
   - Purpose and functionality
   - Parameter types and descriptions
   - Return values and their meanings
   - Any important notes or examples
4. Use the MultiEdit tool for efficiency
5. Ensure all comments are descriptive, not just placeholders

You are Agent ${agentNumber} working independently. Other agents are handling other files.
Focus only on your assigned file: ${file}`;
}

/**
 * Parse work batch file to extract file issues
 * @param {string} workBatchPath - Path to work batch file
 * @returns {Array<{file: string, count: number}>} Files with issue counts
 */
function parseWorkBatch(workBatchPath) {
  const content = fs.readFileSync(workBatchPath, 'utf8');
  const files = [];
  const lines = content.split('\n');

  let currentFile = null;
  let issueCount = 0;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      // Save previous file if exists
      if (currentFile && issueCount > 0) {
        files.push({ file: currentFile, count: issueCount });
      }
      // Start new file
      currentFile = line.substring(3).trim();
      issueCount = 0;
    } else if (line.startsWith('Issues: ')) {
      issueCount = parseInt(line.substring(8));
    }
  }

  // Save last file
  if (currentFile && issueCount > 0) {
    files.push({ file: currentFile, count: issueCount });
  }

  return files;
}

/**
 * Load all work batch files from .claude-work directory
 * @returns {Array<{file: string, count: number}>} All files with issue counts
 */
function loadAllWorkBatches() {
  const workDir = path.join(process.cwd(), '.claude-work');
  if (!fs.existsSync(workDir)) {
    console.error('No .claude-work directory found. Run generate-jsdoc-work-batches.sh first.');
    process.exit(1);
  }

  const allFiles = [];
  const workFiles = fs.readdirSync(workDir).filter((f) => f.endsWith('.work.txt'));

  for (const workFile of workFiles) {
    const files = parseWorkBatch(path.join(workDir, workFile));
    allFiles.push(...files);
  }

  return allFiles.sort((a, b) => b.count - a.count);
}

/**
 * Main function to generate parallel agent commands
 */
async function main() {
  const args = process.argv.slice(2);
  const agentCount = parseInt(args[0]) || 3;
  const workBatchFile = args[1]; // Optional specific work batch file

  console.log(`Preparing to spawn ${agentCount} parallel agents for JSDoc fixes...`);
  console.log('\nAnalyzing JSDoc issues...\n');

  let fileIssues;

  if (workBatchFile && fs.existsSync(workBatchFile)) {
    // Use specific work batch file
    console.log(`Using work batch: ${workBatchFile}\n`);
    fileIssues = parseWorkBatch(workBatchFile);
  } else {
    // Load all work batches
    console.log('Loading all work batches from .claude-work/\n');
    fileIssues = loadAllWorkBatches();
  }

  if (fileIssues.length === 0) {
    console.log('No files with JSDoc issues found.');
    console.log('Make sure to run: .claude/utils/generate-jsdoc-work-batches.sh');
    return;
  }

  const selectedFiles = selectFilesForAgents(fileIssues, agentCount);

  console.log('Selected files for parallel processing:');
  selectedFiles.forEach((file, i) => {
    console.log(`  Agent ${i + 1}: ${file.file} (${file.count} issues)`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('AGENT PROMPTS:');
  console.log('='.repeat(80) + '\n');

  selectedFiles.forEach((file, i) => {
    console.log(`AGENT ${i + 1} TASK:`);
    console.log('-'.repeat(40));
    console.log(generateAgentPrompt(file.file, file.count, i + 1));
    console.log('\n');
  });

  console.log('='.repeat(80));
  console.log('\nTo spawn these agents in Claude, use the Task tool with each prompt above.');
  console.log('The agents will work independently and in parallel.\n');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  parseJsdocIssues,
  selectFilesForAgents,
  generateAgentPrompt,
};

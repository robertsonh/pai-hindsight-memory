#!/usr/bin/env bun
/**
 * PAI Hindsight Post-Compact Hook
 *
 * Fires on Stop event to restore key context after compaction.
 * Queries Hindsight for recent decisions, mistakes, corrections, and key context
 * that may have been lost during compaction.
 *
 * Part of the pai-hindsight-memory pack.
 *
 * Environment Variables:
 *   PAI_DIR - PAI installation directory
 *   HINDSIGHT_PROJECT_URL - Hindsight API server URL
 *   HINDSIGHT_PROJECT - Project memory bank name
 */

import { existsSync, readFileSync, appendFileSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

// Configuration
const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
const HINDSIGHT_URL = process.env.HINDSIGHT_PROJECT_URL || 'http://localhost:8889';
const PROJECT_BANK = process.env.HINDSIGHT_PROJECT || 'project';

// ============================================================================
// Types
// ============================================================================

interface StopData {
  session_id?: string;
  cwd?: string;
  stop_hook_active?: boolean;
  reason?: string;
  [key: string]: unknown;
}

interface HindsightResult {
  id: string;
  text: string;
  context?: string;
  document_id?: string;
  metadata?: Record<string, string>;
}

interface RecallResponse {
  count: number;
  results: HindsightResult[];
}

// ============================================================================
// Logging
// ============================================================================

function log(message: string): void {
  const debugPath = join(PAI_DIR, 'history', 'hindsight-debug.log');
  try {
    appendFileSync(debugPath, `[${new Date().toISOString()}] PostCompact: ${message}\n`);
  } catch {}
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractProjectName(cwd: string): string {
  const packagePath = join(cwd, 'package.json');
  if (existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
      if (pkg.name) return pkg.name;
    } catch {}
  }
  return basename(cwd);
}

async function recallInsights(projectName: string): Promise<RecallResponse | null> {
  try {
    // Query for decisions, mistakes, and corrections specifically
    const response = await fetch(`${HINDSIGHT_URL}/v1/default/banks/${PROJECT_BANK}/memories/recall`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `Recent decisions, mistakes to avoid, corrections, and key context for project ${projectName}`,
        max_tokens: 4096,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        return {
          count: data.results.length,
          results: data.results.map((r: HindsightResult) => ({
            id: r.id || 'unknown',
            text: r.text || '',
            context: r.context,
            document_id: r.document_id,
            metadata: r.metadata,
          })),
        };
      }
    }
  } catch {
    // Hindsight server may not be running
  }

  return null;
}

function categorizeInsights(results: HindsightResult[]): {
  decisions: string[];
  mistakes: string[];
  corrections: string[];
  keyContext: string[];
} {
  const decisions: string[] = [];
  const mistakes: string[] = [];
  const corrections: string[] = [];
  const keyContext: string[] = [];

  for (const result of results) {
    const text = result.text;

    // Parse the insight text to categorize
    if (text.includes('DECISION:')) {
      const match = text.match(/DECISION:\s*(.+?)(?=\n\n|MISTAKE|CORRECTION|KEY CONTEXT|$)/s);
      if (match) decisions.push(match[1].trim());
    }
    if (text.includes('MISTAKE TO AVOID:')) {
      const match = text.match(/MISTAKE TO AVOID:\s*(.+?)(?=\n\n|DECISION|CORRECTION|KEY CONTEXT|$)/s);
      if (match) mistakes.push(match[1].trim());
    }
    if (text.includes('CORRECTION:')) {
      const match = text.match(/CORRECTION:\s*(.+?)(?=\n\n|DECISION|MISTAKE|KEY CONTEXT|$)/s);
      if (match) corrections.push(match[1].trim());
    }
    if (text.includes('KEY CONTEXT:')) {
      const match = text.match(/KEY CONTEXT:\s*(.+?)(?=\n\n|DECISION|MISTAKE|CORRECTION|$)/s);
      if (match) keyContext.push(match[1].trim());
    }

    // Also check metadata for type hints
    if (result.metadata?.type === 'pre-compact-analysis' || result.metadata?.type === 'session-insights') {
      // These are structured insight documents, already handled above
    }
  }

  // Deduplicate
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const dedup = (arr: string[]) => {
    const seen = new Set<string>();
    return arr.filter(item => {
      const key = normalize(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return {
    decisions: dedup(decisions).slice(0, 5),  // Limit to most recent 5
    mistakes: dedup(mistakes).slice(0, 5),
    corrections: dedup(corrections).slice(0, 5),
    keyContext: dedup(keyContext).slice(0, 5),
  };
}

function formatRestoredContext(
  projectName: string,
  insights: {
    decisions: string[];
    mistakes: string[];
    corrections: string[];
    keyContext: string[];
  }
): string {
  const parts: string[] = [];

  const totalInsights =
    insights.decisions.length +
    insights.mistakes.length +
    insights.corrections.length +
    insights.keyContext.length;

  if (totalInsights === 0) {
    return '';
  }

  parts.push('<restored-context>');
  parts.push(`## Project Context Restored (${projectName})`);
  parts.push('');
  parts.push('*The following context has been restored from memory after compaction:*');
  parts.push('');

  if (insights.decisions.length > 0) {
    parts.push('### Recent Decisions');
    for (const decision of insights.decisions) {
      parts.push(`- ${decision}`);
    }
    parts.push('');
  }

  if (insights.mistakes.length > 0) {
    parts.push('### Mistakes to Avoid');
    for (const mistake of insights.mistakes) {
      parts.push(`- ${mistake}`);
    }
    parts.push('');
  }

  if (insights.corrections.length > 0) {
    parts.push('### Corrections Made');
    for (const correction of insights.corrections) {
      parts.push(`- ${correction}`);
    }
    parts.push('');
  }

  if (insights.keyContext.length > 0) {
    parts.push('### Key Context');
    for (const ctx of insights.keyContext) {
      parts.push(`- ${ctx}`);
    }
    parts.push('');
  }

  parts.push('### Memory Protocols');
  parts.push('- **User Corrections:** When the user corrects you, IMMEDIATELY call `mcp__hindsight-project__retain` with the correction. Do NOT wait - corrections can be lost to compaction.');
  parts.push('- **Self-Learning:** When you discover something through trial-and-error (commands that fail, correct syntax found via --help, non-obvious solutions), IMMEDIATELY store it with `mcp__hindsight-project__retain` using format: "LEARNED: [what failed] → [what works]"');
  parts.push('- **Debugging:** Before attempting fixes, use `mcp__hindsight-project__reflect` to check for similar past mistakes.');
  parts.push('</restored-context>');

  return parts.join('\n');
}

// ============================================================================
// Compaction Detection
// ============================================================================

function checkForRecentCompaction(): boolean {
  // Check if PreCompact ran recently (within last 60 seconds)
  // by looking at the debug log for PreCompact entries
  const debugPath = join(PAI_DIR, 'history', 'hindsight-debug.log');

  if (!existsSync(debugPath)) {
    return false;
  }

  try {
    const content = readFileSync(debugPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    // Look at last 20 lines for recent PreCompact activity
    const recentLines = lines.slice(-20);
    const now = Date.now();

    for (const line of recentLines) {
      if (line.includes('PreCompact:')) {
        // Extract timestamp
        const timestampMatch = line.match(/^\[([\d\-T:.Z]+)\]/);
        if (timestampMatch) {
          const timestamp = new Date(timestampMatch[1]).getTime();
          // If PreCompact ran within last 2 minutes, consider it recent
          if (now - timestamp < 120000) {
            return true;
          }
        }
      }
    }
  } catch {}

  return false;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  // Read stdin for stop context from Claude Code
  const chunks: Buffer[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk);
  }

  const stdinData = Buffer.concat(chunks).toString('utf-8');

  if (!stdinData.trim()) {
    process.exit(0);
  }

  try {
    const stopData: StopData = JSON.parse(stdinData);
    const cwd = stopData.cwd || process.cwd();

    // Only restore context if there was a recent compaction
    if (!checkForRecentCompaction()) {
      log('No recent compaction detected, skipping context restoration');
      process.exit(0);
    }

    log('Recent compaction detected, restoring context');

    // Get project name
    const projectName = extractProjectName(cwd);

    // Recall insights from Hindsight
    const hindsightResponse = await recallInsights(projectName);

    if (!hindsightResponse || hindsightResponse.count === 0) {
      log('No insights found in Hindsight');
      process.exit(0);
    }

    log(`Found ${hindsightResponse.count} memories to restore context from`);

    // Categorize insights
    const categorized = categorizeInsights(hindsightResponse.results);

    // Format and output
    const output = formatRestoredContext(projectName, categorized);

    if (output) {
      console.log(output);
      log(`Restored context: ${categorized.decisions.length} decisions, ${categorized.mistakes.length} mistakes, ${categorized.corrections.length} corrections, ${categorized.keyContext.length} key context`);
    }

  } catch (error) {
    log(`Error: ${error}`);
  }

  process.exit(0);
}

main();

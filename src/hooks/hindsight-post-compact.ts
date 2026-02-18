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
const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');
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

async function recallByTag(projectName: string, tags: string[], maxTokens: number = 2048): Promise<HindsightResult[]> {
  try {
    const response = await fetch(`${HINDSIGHT_URL}/v1/default/banks/${PROJECT_BANK}/memories/recall`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `Recent ${tags.join(', ')} for project ${projectName}`,
        max_tokens: maxTokens,
        budget: 'high',
        tags,
        tags_match: 'any',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        return data.results.map((r: HindsightResult) => ({
          id: r.id || 'unknown',
          text: r.text || '',
          context: r.context,
          document_id: r.document_id,
          metadata: r.metadata,
        }));
      }
    }
  } catch {
    // Hindsight server may not be running
  }
  return [];
}

async function reflectForContext(projectName: string): Promise<string | null> {
  try {
    const response = await fetch(`${HINDSIGHT_URL}/v1/default/banks/${PROJECT_BANK}/reflect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `What is the current state of work on project ${projectName}? What was I working on most recently, and what important context should I remember?`,
        budget: 'mid',
        max_tokens: 2048,
        context: 'Restoring context after compaction — need to understand what was happening before context was lost',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.text || null;
    }
  } catch {
    // Hindsight server may not be running
  }
  return null;
}

async function fetchMentalModel(projectName: string): Promise<string | null> {
  try {
    // List mental models and look for project-summary
    const listResponse = await fetch(`${HINDSIGHT_URL}/v1/default/banks/${PROJECT_BANK}/mental-models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!listResponse.ok) return null;

    const models = await listResponse.json();
    const summaryModel = Array.isArray(models)
      ? models.find((m: { name?: string }) => m.name === 'project-summary')
      : null;

    if (!summaryModel?.id) return null;

    // Fetch the full mental model content
    const modelResponse = await fetch(`${HINDSIGHT_URL}/v1/default/banks/${PROJECT_BANK}/mental-models/${summaryModel.id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (modelResponse.ok) {
      const modelData = await modelResponse.json();
      return modelData.reflect_response?.text || modelData.content || null;
    }
  } catch {
    // Mental models may not be configured yet
  }
  return null;
}

function extractTexts(results: HindsightResult[], limit: number = 5): string[] {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const seen = new Set<string>();
  const texts: string[] = [];

  for (const result of results) {
    const text = result.text.trim();
    if (!text) continue;
    const key = normalize(text);
    if (seen.has(key)) continue;
    seen.add(key);
    texts.push(text);
    if (texts.length >= limit) break;
  }

  return texts;
}

function formatRestoredContext(
  projectName: string,
  data: {
    mentalModel: string | null;
    decisions: string[];
    mistakes: string[];
    corrections: string[];
    reflectContext: string | null;
  }
): string {
  const parts: string[] = [];

  const hasContent =
    data.mentalModel ||
    data.decisions.length > 0 ||
    data.mistakes.length > 0 ||
    data.corrections.length > 0 ||
    data.reflectContext;

  if (!hasContent) {
    return '';
  }

  parts.push('<restored-context>');
  parts.push(`## Project Context Restored (${projectName})`);
  parts.push('');
  parts.push('*The following context has been restored from memory after compaction:*');
  parts.push('');

  if (data.mentalModel) {
    parts.push('### Project Summary (from Mental Model)');
    parts.push(data.mentalModel);
    parts.push('');
  }

  if (data.decisions.length > 0) {
    parts.push('### Recent Decisions');
    for (const decision of data.decisions) {
      parts.push(`- ${decision}`);
    }
    parts.push('');
  }

  if (data.mistakes.length > 0) {
    parts.push('### Mistakes to Avoid');
    for (const mistake of data.mistakes) {
      parts.push(`- ${mistake}`);
    }
    parts.push('');
  }

  if (data.corrections.length > 0) {
    parts.push('### Corrections Made');
    for (const correction of data.corrections) {
      parts.push(`- ${correction}`);
    }
    parts.push('');
  }

  if (data.reflectContext) {
    parts.push('### Current Work Context (synthesized)');
    parts.push(data.reflectContext);
    parts.push('');
  }

  parts.push('### What Was Lost in Compaction');
  parts.push('- Exact code snippets and file contents (re-read files as needed)');
  parts.push('- Detailed technical discussions (use recall to recover key points)');
  parts.push('- Step-by-step progress on multi-part tasks');
  parts.push('');
  parts.push('### Immediate Actions After Compaction');
  parts.push('1. **Check Todo List:** If there was a todo list, review it to see pending tasks');
  parts.push('2. **Recall Current Work:** Use `mcp__hindsight-project__recall` with query "current work, recent tasks, what was I working on"');
  parts.push('3. **Re-read Active Files:** Any files you were editing need to be re-read');
  parts.push('4. **Confirm Before Continuing:** Ask user "I just recovered from compaction. Were we working on [X]?" before proceeding');
  parts.push('');
  parts.push('### Memory Protocols');
  parts.push('- **Proactive Recall (CRITICAL):** BEFORE deployments, API calls, or configuration tasks, ALWAYS `recall` first');
  parts.push('- **Timestamps (CRITICAL):** ALWAYS include date/time in stored memories: "CATEGORY (YYYY-MM-DD HH:MM): content..."');
  parts.push('- **User Corrections:** When the user corrects you, IMMEDIATELY call `mcp__hindsight-project__retain`. Do NOT wait.');
  parts.push('- **Self-Learning:** Store discoveries immediately: "LEARNED (YYYY-MM-DD HH:MM): [what failed] → [what works]"');
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

    // Parallel fetch: mental model, tag-based recalls, and reflect for context
    const [mentalModel, decisionResults, mistakeResults, correctionResults, reflectContext] = await Promise.all([
      fetchMentalModel(projectName),
      recallByTag(projectName, ['decision'], 1024),
      recallByTag(projectName, ['mistake'], 1024),
      recallByTag(projectName, ['correction'], 1024),
      reflectForContext(projectName),
    ]);

    const decisions = extractTexts(decisionResults);
    const mistakes = extractTexts(mistakeResults);
    const corrections = extractTexts(correctionResults);

    const hasAnything = mentalModel || decisions.length > 0 || mistakes.length > 0 || corrections.length > 0 || reflectContext;

    if (!hasAnything) {
      log('No insights found in Hindsight');
      process.exit(0);
    }

    log(`Found: mental_model=${mentalModel ? 'yes' : 'no'}, ${decisions.length} decisions, ${mistakes.length} mistakes, ${corrections.length} corrections, reflect=${reflectContext ? 'yes' : 'no'}`);

    // Format and output
    const output = formatRestoredContext(projectName, {
      mentalModel,
      decisions,
      mistakes,
      corrections,
      reflectContext,
    });

    if (output) {
      console.log(output);
      log(`Restored context successfully`);
    }

  } catch (error) {
    log(`Error: ${error}`);
  }

  process.exit(0);
}

main();

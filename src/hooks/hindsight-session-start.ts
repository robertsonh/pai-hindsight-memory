#!/usr/bin/env bun
/**
 * PAI Hindsight Session Start Hook
 *
 * Fires on SessionStart to recall recent project context from hindsight-project.
 * Provides continuity between sessions by surfacing relevant past work.
 *
 * Part of the pai-hindsight-memory pack.
 *
 * Environment Variables:
 *   PAI_DIR - PAI installation directory
 *   HINDSIGHT_PROJECT_URL - Hindsight MCP server URL (optional)
 */

import { existsSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

// Configuration
const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
const HINDSIGHT_URL = process.env.HINDSIGHT_PROJECT_URL || 'http://localhost:8889';
const PERSONAL_BANK = process.env.HINDSIGHT_PERSONAL_BANK || 'hedley';
const PROJECT_BANK = process.env.HINDSIGHT_PROJECT || 'project';

// ============================================================================
// Types
// ============================================================================

interface SessionStartData {
  session_id: string;
  cwd?: string;
  [key: string]: unknown;
}

interface ProjectContext {
  project_name: string;
  recent_sessions: string[];
  last_topic: string | null;
  recent_files: string[];
}

interface HindsightResult {
  id: string;
  text: string;
  context?: string;
  document_id?: string;
}

interface RecallResponse {
  count: number;
  results: HindsightResult[];
}

interface EntityObservation {
  text: string;
  mentioned_at: string;
}

interface EntityWithObservations {
  id: string;
  canonical_name: string;
  mention_count: number;
  observations: EntityObservation[];
}

interface EntitiesResponse {
  items: Array<{
    id: string;
    canonical_name: string;
    mention_count: number;
  }>;
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

async function ensureBankExists(bankId: string, projectName: string): Promise<boolean> {
  try {
    // PUT to /v1/default/banks/{bank_id} creates or updates the bank
    const response = await fetch(`${HINDSIGHT_URL}/v1/default/banks/${bankId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        background: `Project memory bank for ${projectName}`,
      }),
    });

    return response.ok;
  } catch {
    // Server may not be running
    return false;
  }
}

async function recallFromHindsight(projectName: string): Promise<RecallResponse | null> {
  // Use the project bank for project-specific memories
  const bankId = PROJECT_BANK;

  // Ensure the bank exists before trying to recall
  await ensureBankExists(bankId, projectName);

  try {
    // Try to recall recent context via HTTP API
    // API: POST /v1/default/banks/{bank_id}/memories/recall
    const response = await fetch(`${HINDSIGHT_URL}/v1/default/banks/${bankId}/memories/recall`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `Recent work on project ${projectName}`,
        max_tokens: 2048,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      // Return structured results if they exist
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        return {
          count: data.results.length,
          results: data.results.map((r: HindsightResult) => ({
            id: r.id || 'unknown',
            text: r.text || '',
            context: r.context,
            document_id: r.document_id,
          })),
        };
      }
    }
  } catch {
    // Hindsight server may not be running via HTTP
    // This is expected - MCP handles most interactions
  }

  return null;
}

async function fetchPersonalObservations(): Promise<EntityObservation[]> {
  // Fetch observations from ALL entities in personal bank
  // Since it's a personal bank, all entities are relevant to the user's profile
  try {
    // Get the list of all entities
    const entitiesResponse = await fetch(
      `${HINDSIGHT_URL}/v1/default/banks/${PERSONAL_BANK}/entities`
    );

    if (!entitiesResponse.ok) {
      return [];
    }

    const entitiesData: EntitiesResponse = await entitiesResponse.json();

    if (!entitiesData.items || entitiesData.items.length === 0) {
      return [];
    }

    // Sort by mention count and take top entities (limit to avoid too many requests)
    const topEntities = entitiesData.items
      .sort((a, b) => b.mention_count - a.mention_count)
      .slice(0, 10); // Top 10 entities by mention count

    // Fetch observations from all top entities in parallel
    const entityPromises = topEntities.map(async (entity) => {
      try {
        const entityResponse = await fetch(
          `${HINDSIGHT_URL}/v1/default/banks/${PERSONAL_BANK}/entities/${entity.id}`
        );
        if (entityResponse.ok) {
          const entityData: EntityWithObservations = await entityResponse.json();
          return entityData.observations || [];
        }
      } catch {
        // Skip failed entities
      }
      return [];
    });

    const allObservations = await Promise.all(entityPromises);

    // Normalize text for deduplication (lowercase, strip punctuation)
    const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();

    // Flatten and deduplicate observations by normalized text
    const seen = new Set<string>();
    const uniqueObservations: EntityObservation[] = [];

    for (const observations of allObservations) {
      for (const obs of observations) {
        const normalized = normalize(obs.text);
        if (!seen.has(normalized)) {
          seen.add(normalized);
          uniqueObservations.push(obs);
        }
      }
    }

    return uniqueObservations;
  } catch {
    // Hindsight server may not be running
    return [];
  }
}

function loadPendingMemories(projectName: string): string[] {
  // Check for pending memories that weren't sent to hindsight
  const pendingPath = join(PAI_DIR, 'history', 'hindsight-pending.jsonl');

  if (!existsSync(pendingPath)) {
    return [];
  }

  try {
    const content = readFileSync(pendingPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    const relevantMemories: string[] = [];

    for (const line of lines.slice(-10)) { // Last 10 entries
      try {
        const memory = JSON.parse(line);
        if (memory.project_name === projectName) {
          const summary = [
            `Session ${memory.session_id?.slice(0, 8) || 'unknown'}`,
            memory.timestamp ? `(${new Date(memory.timestamp).toLocaleDateString()})` : '',
            memory.topic ? `: ${memory.topic.slice(0, 100)}` : '',
          ].filter(Boolean).join(' ');

          relevantMemories.push(summary);
        }
      } catch {
        // Skip malformed entries
      }
    }

    return relevantMemories;
  } catch {
    return [];
  }
}

function truncateText(text: string, maxLen: number = 80): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

function formatProjectContext(
  projectName: string,
  hindsightResponse: RecallResponse | null,
  pendingMemories: string[],
  personalObservations: EntityObservation[]
): string {
  const parts: string[] = [];

  // Personal profile section (from observations)
  if (personalObservations.length > 0) {
    parts.push('<personal-profile>');
    parts.push(`## About ${PERSONAL_BANK.charAt(0).toUpperCase() + PERSONAL_BANK.slice(1)}`);
    parts.push('');
    for (const obs of personalObservations) {
      parts.push(`• ${obs.text}`);
    }
    parts.push('</personal-profile>');
    parts.push('');
  }

  parts.push('<project-context>');
  parts.push(`Project: ${projectName}`);
  parts.push(`Memory Bank: ${PROJECT_BANK}`);

  // Warn if using default bank - user probably forgot to set HINDSIGHT_PROJECT
  if (PROJECT_BANK === 'project') {
    parts.push('');
    parts.push('⚠️ **WARNING: Using default "project" bank!** This is probably not what you intended.');
    parts.push('Set the HINDSIGHT_PROJECT environment variable to your project-specific bank name.');
    parts.push('Memories stored here may be mixed with other projects.');
  }
  parts.push('');

  // Add hindsight context if available - with count and snippets
  if (hindsightResponse && hindsightResponse.count > 0) {
    parts.push(`## Recent Context from Hindsight (${hindsightResponse.count} memories loaded)`);
    parts.push('');

    // Show all memories (no longer truncating to 5)
    for (const result of hindsightResponse.results) {
      const snippet = truncateText(result.text, 150); // Slightly longer snippets
      parts.push(`• ${snippet}`);
    }
    parts.push('');
  }

  // Add pending memories (local fallback)
  if (pendingMemories.length > 0) {
    parts.push('## Recent Sessions (local cache)');
    for (const memory of pendingMemories) {
      parts.push(`- ${memory}`);
    }
    parts.push('');
  }

  // Guidance for the AI
  parts.push('## Memory Tools Available');
  parts.push('- Use `mcp__hindsight-project__recall` to search project memories');
  parts.push('- Use `mcp__hindsight-project__retain` to store project decisions');
  parts.push('- Use `mcp__hindsight-project__reflect` for analysis of past patterns');
  parts.push(`- Use \`mcp__hindsight-${PERSONAL_BANK}__*\` for personal (non-project) memories`);
  parts.push('');
  parts.push('## Memory Protocols (IMPORTANT)');
  parts.push('- **🚨 RECALL TRIGGERS:** When task involves: deploy/docker/compose/container/config/env/settings/build/ci/database/api/endpoint → MUST recall first');
  parts.push('- **Proactive Recall (CRITICAL):** BEFORE deployments, API calls, or configuration tasks, ALWAYS `recall` first: "deployment/API/config for [service name]"');
  parts.push('- **Timestamps (CRITICAL):** ALWAYS include date/time in stored memories: "CATEGORY (YYYY-MM-DD HH:MM): content..." - this populates the timeline view');
  parts.push('- **User Corrections:** When the user corrects you, IMMEDIATELY call `mcp__hindsight-project__retain`. Do NOT wait.');
  parts.push('- **Self-Learning:** When you discover something through trial-and-error, IMMEDIATELY store it: "LEARNED (YYYY-MM-DD HH:MM): [what failed] → [what works]"');
  parts.push('- **Debugging:** Before attempting fixes, use `mcp__hindsight-project__reflect` to check for similar past mistakes.');
  parts.push('- **⛔ NEVER:** Create docker-compose/Dockerfile/config files without recalling existing infrastructure. NEVER assume deployment process - recall it.');
  parts.push('</project-context>');

  return parts.join('\n');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  // Read stdin for session context from Claude Code
  const chunks: Buffer[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk);
  }

  const stdinData = Buffer.concat(chunks).toString('utf-8');

  if (!stdinData.trim()) {
    process.exit(0);
  }

  try {
    const sessionData: SessionStartData = JSON.parse(stdinData);
    const cwd = sessionData.cwd || process.cwd();

    // Get project name
    const projectName = extractProjectName(cwd);

    // Fetch personal observations and project context in parallel
    const [personalObservations, hindsightResponse] = await Promise.all([
      fetchPersonalObservations(),
      recallFromHindsight(projectName),
    ]);

    // Load any pending local memories
    const pendingMemories = loadPendingMemories(projectName);

    // Debug logging
    const debugPath = join(PAI_DIR, 'history', 'hindsight-debug.log');
    try {
      const fs = await import('fs');
      const memCount = hindsightResponse?.count || 0;
      const pendingCount = pendingMemories.length;
      const obsCount = personalObservations.length;
      fs.appendFileSync(debugPath, `[${new Date().toISOString()}] SessionStart: project=${projectName}, bank=${PROJECT_BANK}, memories=${memCount}, pending=${pendingCount}, observations=${obsCount}\n`);
    } catch {}

    // Only output if we have context to share
    const hasContext =
      personalObservations.length > 0 ||
      (hindsightResponse && hindsightResponse.count > 0) ||
      pendingMemories.length > 0;

    if (hasContext) {
      const output = formatProjectContext(projectName, hindsightResponse, pendingMemories, personalObservations);
      console.log(output);
    }

    // Build status messages (separate for text display vs voice)
    const personalCount = personalObservations.length;
    const projectMemoryCount = hindsightResponse?.count || 0;
    const voicePort = process.env.VOICE_PORT || '8888';
    const isDefaultBank = PROJECT_BANK === 'project';

    // Text message for terminal display (concise, technical)
    let textMessage = `🧠 Hindsight: ${personalCount} personal, ${projectMemoryCount} project memories | Bank: ${PROJECT_BANK}`;
    if (isDefaultBank) {
      textMessage += ` ⚠️ DEFAULT BANK - Set HINDSIGHT_PROJECT env var!`;
    }

    // Voice message (natural spoken language)
    let voiceMessage: string;
    if (isDefaultBank) {
      voiceMessage = `Warning: using the default project bank. You probably forgot to set a project-specific bank. Loaded ${personalCount} personal and ${projectMemoryCount} project memories.`;
    } else {
      voiceMessage = `Loaded ${personalCount} personal and ${projectMemoryCount} project memories from the ${PROJECT_BANK} bank.`;
    }

    // Write directly to terminal (bypasses Claude's stdout/stderr capture)
    try {
      const fs = await import('fs');
      fs.writeFileSync('/dev/tty', `\n${textMessage}\n\n`);
    } catch {
      // /dev/tty may not be available in all environments
    }

    // Send to voice notification server
    await fetch(`http://localhost:${voicePort}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: voiceMessage }),
    }).catch(() => {
      // Notification server may not be running - that's OK, we logged to terminal
    });

  } catch (error) {
    // Silent failure - don't block session start
  }

  process.exit(0);
}

main();

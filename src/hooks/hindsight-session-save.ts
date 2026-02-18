#!/usr/bin/env bun
/**
 * PAI Hindsight Session Save Hook
 *
 * Fires on SessionEnd to capture and store project context to hindsight-project memory bank.
 * This creates persistent memory of what was worked on, decisions made, and progress achieved.
 * Also extracts insights (decisions, mistakes, corrections, key context) from the conversation.
 *
 * Part of the pai-hindsight-memory pack.
 *
 * Environment Variables:
 *   PAI_DIR - PAI installation directory
 *   HINDSIGHT_PROJECT_URL - Hindsight MCP server URL (optional, uses MCP by default)
 *   LOCAL_LLM_URL - Local LLM server URL for insight extraction
 *   LOCAL_LLM_MODEL - Local LLM model name
 *   ANTHROPIC_API_KEY - Fallback for LLM analysis
 */

import { readFileSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { homedir } from 'os';
import { execSync, spawn } from 'child_process';
import { log as logInsight } from './lib/insight-extractor';

// Configuration
const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');
const HINDSIGHT_URL = process.env.HINDSIGHT_PROJECT_URL || 'http://localhost:8889';
const PERSONAL_BANK = process.env.HINDSIGHT_PERSONAL_BANK || 'hedley';
const PROJECT_BANK = process.env.HINDSIGHT_PROJECT || 'project';

// ============================================================================
// Types
// ============================================================================

interface SessionData {
  session_id: string;
  transcript_path?: string;
  cwd?: string;
  [key: string]: unknown;
}

interface TranscriptSummary {
  first_user_message: string | null;
  files_read: string[];
  files_written: string[];
  files_edited: string[];
  bash_commands: string[];
  tool_calls: number;
  duration_minutes: number | null;
  errors: string[];
}

interface GitInfo {
  branch: string | null;
  has_uncommitted_changes: boolean;
  recent_commits: string[];
}

interface ProjectMemory {
  session_id: string;
  project_name: string;
  timestamp: string;
  topic: string | null;
  summary: string;
  files_touched: string[];
  git_branch: string | null;
  duration_minutes: number | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function execSafe(command: string, cwd?: string): string | null {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch {
    return null;
  }
}

function getGitInfo(cwd: string): GitInfo {
  const info: GitInfo = {
    branch: null,
    has_uncommitted_changes: false,
    recent_commits: [],
  };

  if (!execSafe('git rev-parse --git-dir', cwd)) {
    return info;
  }

  info.branch = execSafe('git branch --show-current', cwd);

  const status = execSafe('git status --porcelain', cwd);
  info.has_uncommitted_changes = !!status && status.length > 0;

  const commits = execSafe('git log -3 --oneline', cwd);
  if (commits) {
    info.recent_commits = commits.split('\n').filter(Boolean);
  }

  return info;
}

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

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(c => {
        if (typeof c === 'string') return c;
        if (c?.text) return c.text;
        if (c?.content) return contentToText(c.content);
        return '';
      })
      .join(' ')
      .trim();
  }
  return '';
}

function parseTranscript(transcriptPath: string): TranscriptSummary {
  const summary: TranscriptSummary = {
    first_user_message: null,
    files_read: [],
    files_written: [],
    files_edited: [],
    bash_commands: [],
    tool_calls: 0,
    duration_minutes: null,
    errors: [],
  };

  if (!existsSync(transcriptPath)) {
    return summary;
  }

  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    let firstTimestamp: number | null = null;
    let lastTimestamp: number | null = null;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Track timestamps
        if (entry.timestamp) {
          const ts = new Date(entry.timestamp).getTime();
          if (!firstTimestamp || ts < firstTimestamp) firstTimestamp = ts;
          if (!lastTimestamp || ts > lastTimestamp) lastTimestamp = ts;
        }

        // Capture first user message as topic
        if (entry.type === 'user' && !summary.first_user_message && entry.message?.content) {
          const msg = contentToText(entry.message.content);
          if (msg.length > 0) {
            summary.first_user_message = msg.slice(0, 500);
          }
        }

        // Process assistant messages for tool usage
        if (entry.type === 'assistant') {
          const contentArray = entry.message?.content;
          if (Array.isArray(contentArray)) {
            for (const item of contentArray) {
              if (item.type === 'tool_use') {
                summary.tool_calls++;
                const toolName = item.name || 'unknown';
                const input = item.input || {};

                if (toolName === 'Read' && input.file_path) {
                  if (!summary.files_read.includes(input.file_path)) {
                    summary.files_read.push(input.file_path);
                  }
                }

                if (toolName === 'Write' && input.file_path) {
                  if (!summary.files_written.includes(input.file_path)) {
                    summary.files_written.push(input.file_path);
                  }
                }

                if (toolName === 'Edit' && input.file_path) {
                  if (!summary.files_edited.includes(input.file_path)) {
                    summary.files_edited.push(input.file_path);
                  }
                }

                if (toolName === 'Bash' && input.command) {
                  const cmd = String(input.command).slice(0, 100);
                  if (summary.bash_commands.length < 10) {
                    summary.bash_commands.push(cmd);
                  }
                }
              }
            }
          }
        }

        // Track errors
        if (entry.type === 'tool_result') {
          const resultContent = entry.message?.content;
          if (Array.isArray(resultContent)) {
            for (const item of resultContent) {
              if (item.type === 'tool_result' && item.is_error) {
                const errText = typeof item.content === 'string'
                  ? item.content
                  : JSON.stringify(item.content);
                if (summary.errors.length < 5) {
                  summary.errors.push(errText.slice(0, 200));
                }
              }
            }
          }
        }

      } catch {
        // Skip malformed lines
      }
    }

    // Calculate duration
    if (firstTimestamp && lastTimestamp) {
      summary.duration_minutes = Math.round((lastTimestamp - firstTimestamp) / 60000);
    }

  } catch {
    // Silent failure - return partial summary
  }

  return summary;
}

function buildNarrativeSummary(
  projectName: string,
  transcriptSummary: TranscriptSummary,
  gitInfo: GitInfo
): string {
  // Build a narrative that Hindsight can extract facts from
  // Hindsight expects conversational, contextual content - not fragmented data
  const sentences: string[] = [];

  // Opening context
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (transcriptSummary.first_user_message) {
    const topic = transcriptSummary.first_user_message.slice(0, 300);
    sentences.push(`During a coding session on ${dateStr}, the user worked on the ${projectName} project. The session started with: "${topic}"`);
  } else {
    sentences.push(`The user had a coding session on ${dateStr} working on the ${projectName} project.`);
  }

  // Git branch context
  if (gitInfo.branch) {
    sentences.push(`Work was done on the "${gitInfo.branch}" git branch.`);
  }

  // Duration context
  if (transcriptSummary.duration_minutes && transcriptSummary.duration_minutes > 1) {
    sentences.push(`The session lasted approximately ${transcriptSummary.duration_minutes} minutes.`);
  }

  // Files modified - describe what was done
  const modifiedFiles = [
    ...new Set([
      ...transcriptSummary.files_written,
      ...transcriptSummary.files_edited,
    ])
  ];

  if (modifiedFiles.length > 0) {
    if (modifiedFiles.length === 1) {
      sentences.push(`The user modified ${modifiedFiles[0]}.`);
    } else if (modifiedFiles.length <= 5) {
      const fileList = modifiedFiles.join(', ');
      sentences.push(`Several files were modified: ${fileList}.`);
    } else {
      const mainFiles = modifiedFiles.slice(0, 5).join(', ');
      sentences.push(`Multiple files were modified including ${mainFiles} and ${modifiedFiles.length - 5} others.`);
    }
  }

  // Significant commands - describe actions taken
  const significantCommands = transcriptSummary.bash_commands
    .filter(cmd =>
      cmd.includes('git commit') ||
      cmd.includes('npm') ||
      cmd.includes('bun') ||
      cmd.includes('test') ||
      cmd.includes('build') ||
      cmd.includes('install')
    )
    .slice(0, 5);

  if (significantCommands.length > 0) {
    const actions: string[] = [];
    for (const cmd of significantCommands) {
      if (cmd.includes('git commit')) actions.push('committed code');
      else if (cmd.includes('test')) actions.push('ran tests');
      else if (cmd.includes('build')) actions.push('built the project');
      else if (cmd.includes('install')) actions.push('installed dependencies');
      else if (cmd.includes('npm') || cmd.includes('bun')) actions.push('ran package manager commands');
    }
    const uniqueActions = [...new Set(actions)];
    if (uniqueActions.length > 0) {
      sentences.push(`During the session, the user ${uniqueActions.join(', ')}.`);
    }
  }

  // Errors - mention if there were issues
  if (transcriptSummary.errors.length > 0) {
    sentences.push(`The session encountered ${transcriptSummary.errors.length} error(s) that needed to be addressed.`);
  }

  // Recent commits for context
  if (gitInfo.recent_commits.length > 0) {
    const recentCommit = gitInfo.recent_commits[0];
    // Extract just the message part (after the hash)
    const commitMsg = recentCommit.split(' ').slice(1).join(' ');
    if (commitMsg) {
      sentences.push(`The most recent commit was: "${commitMsg}".`);
    }
  }

  return sentences.join(' ');
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

async function storeToHindsight(memory: ProjectMemory): Promise<void> {
  // Use the project bank for project-specific memories
  const bankId = PROJECT_BANK;

  // Ensure the bank exists before trying to store
  await ensureBankExists(bankId, memory.project_name);

  // Build the memory content as narrative text
  // Hindsight extracts "facts" from conversational content, not structured data
  // The summary field now contains the narrative built by buildNarrativeSummary()
  const content = memory.summary;

  // Debug: log the narrative content being stored
  const debugPath = join(PAI_DIR, 'history', 'hindsight-debug.log');
  try {
    const fs = await import('fs');
    fs.appendFileSync(debugPath, `[${new Date().toISOString()}] Storing narrative (${content.length} chars): ${content.slice(0, 200)}...\n`);
  } catch {}

  // Try to store via HTTP API (fallback method)
  // Note: In production, this would use the MCP tools directly
  // but hooks run outside the Claude context, so we use HTTP
  // API: POST /v1/default/banks/{bank_id}/memories
  try {
    const response = await fetch(`${HINDSIGHT_URL}/v1/default/banks/${bankId}/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            content,
            context: 'session',
            timestamp: memory.timestamp,
            tags: ['session', `session-${new Date().toISOString().slice(0, 10)}`],
            metadata: {
              project: memory.project_name,
              branch: memory.git_branch || '',
            },
          },
        ],
        // Consistent document_id so resumed sessions update the same document
        document_id: `session_${memory.session_id}`,
        document_tags: ['session'],
        async: true,
      }),
    });

    if (response.ok) {
      // Log success
      try {
        const fs = await import('fs');
        fs.appendFileSync(debugPath, `[${new Date().toISOString()}] Successfully stored to Hindsight bank "${bankId}"\n`);
      } catch {}
      return; // Successfully stored
    } else {
      // Log failure with status
      try {
        const fs = await import('fs');
        const responseText = await response.text();
        fs.appendFileSync(debugPath, `[${new Date().toISOString()}] Hindsight store failed: ${response.status} - ${responseText.slice(0, 200)}\n`);
      } catch {}
    }
  } catch (error) {
    // Hindsight server may not be running via HTTP
    // This is expected - the MCP server handles most interactions
    try {
      const fs = await import('fs');
      fs.appendFileSync(debugPath, `[${new Date().toISOString()}] Hindsight HTTP error: ${error}\n`);
    } catch {}
  }

  // Fallback: Log to local file
  const fallbackPath = join(PAI_DIR, 'history', 'hindsight-pending.jsonl');
  try {
    const fs = await import('fs');
    fs.appendFileSync(fallbackPath, JSON.stringify({
      ...memory,
      pending: true,
      created_at: new Date().toISOString(),
    }) + '\n');
  } catch {
    // Silent failure
  }
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

  // Debug: log input to file
  const debugPath = join(PAI_DIR, 'history', 'hindsight-debug.log');
  try {
    const fs = await import('fs');
    fs.appendFileSync(debugPath, `[${new Date().toISOString()}] SessionEnd input: ${stdinData}\n`);
  } catch {}

  if (!stdinData.trim()) {
    process.exit(0);
  }

  try {
    const sessionData: SessionData = JSON.parse(stdinData);
    const cwd = sessionData.cwd || process.cwd();
    const sessionId = sessionData.session_id || 'unknown';
    const transcriptPath = sessionData.transcript_path || null;

    // Gather context
    const projectName = extractProjectName(cwd);
    const gitInfo = getGitInfo(cwd);
    const transcriptSummary = transcriptPath
      ? parseTranscript(transcriptPath)
      : {
          first_user_message: null,
          files_read: [],
          files_written: [],
          files_edited: [],
          bash_commands: [],
          tool_calls: 0,
          duration_minutes: null,
          errors: [],
        };

    // Skip if session was too short or had no meaningful activity
    if (transcriptSummary.tool_calls < 2 && !transcriptSummary.first_user_message) {
      process.exit(0);
    }

    // Build narrative summary (Hindsight expects conversational content for fact extraction)
    const summary = buildNarrativeSummary(projectName, transcriptSummary, gitInfo);

    // Collect files touched
    const filesTouched = [
      ...new Set([
        ...transcriptSummary.files_read,
        ...transcriptSummary.files_written,
        ...transcriptSummary.files_edited,
      ])
    ];

    // Create memory object
    const memory: ProjectMemory = {
      session_id: sessionId,
      project_name: projectName,
      timestamp: new Date().toISOString(),
      topic: transcriptSummary.first_user_message?.slice(0, 200) || null,
      summary,
      files_touched: filesTouched,
      git_branch: gitInfo.branch,
      duration_minutes: transcriptSummary.duration_minutes,
    };

    // Store to hindsight
    await storeToHindsight(memory);

    // Log success
    console.log(`Hindsight: Saved session context for ${projectName}`);

    // Spawn background process to extract and store insights from the conversation
    // This allows the hook to exit quickly while insight extraction runs asynchronously
    if (transcriptPath && transcriptSummary.tool_calls >= 5) {
      // Only extract insights for sessions with meaningful activity
      logInsight('SessionEnd', `Spawning background insight extraction for ${projectName}`);
      try {
        // Find the background extraction script
        // It could be in the same directory as this script, or in PAI_DIR/hooks
        const scriptDir = dirname(new URL(import.meta.url).pathname);
        let bgScript = join(scriptDir, 'hindsight-extract-insights-bg.ts');

        // Fallback to PAI hooks directory if not found
        if (!existsSync(bgScript)) {
          bgScript = join(PAI_DIR, 'hooks', 'hindsight-extract-insights-bg.ts');
        }

        if (existsSync(bgScript)) {
          // Spawn detached process that continues after parent exits
          const child = spawn('bun', ['run', bgScript, transcriptPath, projectName, sessionId], {
            detached: true,
            stdio: 'ignore',
            env: {
              ...process.env,
              // Ensure environment variables are passed through
              PAI_DIR,
              HINDSIGHT_PROJECT_URL: HINDSIGHT_URL,
              HINDSIGHT_PROJECT: PROJECT_BANK,
              HINDSIGHT_PERSONAL_BANK: PERSONAL_BANK,
            },
          });

          // Detach the child process so it can run independently
          child.unref();

          logInsight('SessionEnd', `Background extraction spawned (PID: ${child.pid})`);
        } else {
          logInsight('SessionEnd', `Background script not found at ${bgScript}`);
        }
      } catch (spawnError) {
        logInsight('SessionEnd', `Failed to spawn background extraction: ${spawnError}`);
        // Don't fail the whole hook if spawning fails
      }
    }

  } catch (error) {
    // Silent failure - don't block Claude Code shutdown
    console.error('hindsight-session-save error:', error);
  }

  process.exit(0);
}

main();

#!/usr/bin/env bun
/**
 * PAI Hindsight Pre-Compact Hook
 *
 * Fires on PreCompact to analyze the conversation before context is lost.
 * Extracts important learnings: decisions, mistakes, corrections, and key context.
 * Stores these as memories to the project bank for future reference.
 *
 * Part of the pai-hindsight-memory pack.
 *
 * Environment Variables:
 *   PAI_DIR - PAI installation directory
 *   HINDSIGHT_PROJECT_URL - Hindsight API server URL
 *   HINDSIGHT_PROJECT - Project memory bank name
 *   LOCAL_LLM_URL - Local LLM server URL (default: http://uber.lan:11434)
 *   LOCAL_LLM_MODEL - Local LLM model name (default: qwen2.5:32b-instruct-q4_K_M)
 *   ANTHROPIC_API_KEY - Fallback for LLM analysis
 */

import { join, basename, dirname } from 'path';
import { homedir } from 'os';
import { readFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import { log } from './lib/insight-extractor';

// Configuration
const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
const LOG_PREFIX = 'PreCompact';

// ============================================================================
// Types
// ============================================================================

interface PreCompactData {
  session_id: string;
  transcript_path: string;
  trigger: 'manual' | 'auto';
  custom_instructions?: string;
  cwd?: string;
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

// ============================================================================
// Main
// ============================================================================

async function main() {
  // Read stdin for pre-compact context from Claude Code
  const chunks: Buffer[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk);
  }

  const stdinData = Buffer.concat(chunks).toString('utf-8');
  log(LOG_PREFIX, `Received PreCompact event: ${stdinData.slice(0, 200)}`);

  if (!stdinData.trim()) {
    process.exit(0);
  }

  try {
    const compactData: PreCompactData = JSON.parse(stdinData);
    const transcriptPath = compactData.transcript_path;
    const sessionId = compactData.session_id || 'unknown';
    const cwd = compactData.cwd || process.cwd();
    const trigger = compactData.trigger;

    log(LOG_PREFIX, `PreCompact triggered (${trigger}) for session ${sessionId}`);

    if (!transcriptPath) {
      log(LOG_PREFIX, 'No transcript path provided');
      process.exit(0);
    }

    // Get project name
    const projectName = extractProjectName(cwd);
    log(LOG_PREFIX, `Project: ${projectName}`);

    // Spawn background process for insight extraction
    // This allows the hook to exit quickly while extraction runs asynchronously
    // (Claude Code enforces a 60-second timeout on hooks)
    log(LOG_PREFIX, `Spawning background insight extraction for ${projectName}`);

    try {
      const scriptDir = dirname(new URL(import.meta.url).pathname);
      let bgScript = join(scriptDir, 'hindsight-extract-insights-bg.ts');

      // Fallback to PAI hooks directory if not found
      if (!existsSync(bgScript)) {
        bgScript = join(PAI_DIR, 'hooks', 'hindsight-extract-insights-bg.ts');
      }

      if (existsSync(bgScript)) {
        const child = spawn('bun', ['run', bgScript, transcriptPath, projectName, sessionId], {
          detached: true,
          stdio: 'ignore',
          env: {
            ...process.env,
            PAI_DIR,
            HINDSIGHT_PROJECT_URL: process.env.HINDSIGHT_PROJECT_URL || 'http://localhost:8889',
            HINDSIGHT_PROJECT: process.env.HINDSIGHT_PROJECT || 'project',
          },
        });

        child.unref();
        log(LOG_PREFIX, `Background extraction spawned (PID: ${child.pid})`);
        console.log(`Pre-compact: Background extraction started for ${projectName}`);
      } else {
        log(LOG_PREFIX, `Background script not found at ${bgScript}`);
      }
    } catch (spawnError) {
      log(LOG_PREFIX, `Failed to spawn background extraction: ${spawnError}`);
    }

  } catch (error) {
    log(LOG_PREFIX, `Error: ${error}`);
  }

  process.exit(0);
}

main();
